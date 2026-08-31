/*
 * PackMeUp - state + persistence.
 *
 * Everything lives in localStorage under a single key, so the app works
 * offline and needs no server or account. Every mutation goes through this
 * module, which saves and then notifies subscribers.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'packmeup.v1';
  var SCHEMA_VERSION = 2;

  var cat = global.PMU.categories;
  var templates = global.PMU.templates;
  var i18n = global.PMU.i18n;

  var state = null;
  var listeners = [];
  var undoStack = [];
  var UNDO_LIMIT = 3;    /* "undo the last 3 actions" */
  var saveTimer = null;
  var storageAvailable = true;

  /* ---------------------------------------------------------------- utils */

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function now() { return new Date().toISOString(); }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /*
   * "3 x socks", "3x socks", "2 socks", "socks x3" and "socks (2)" all mean
   * the same thing. Returns { name: 'socks', qty: 3 }.
   */
  function parseLine(line) {
    var text = String(line || '').trim();
    var qty = 1;
    var m;

    if ((m = text.match(/^(\d{1,3})\s*[x×*]\s*(.+)$/i))) {
      qty = parseInt(m[1], 10); text = m[2];
    } else if ((m = text.match(/^(\d{1,3})\s+(.+)$/))) {
      qty = parseInt(m[1], 10); text = m[2];
    } else if ((m = text.match(/^(.+?)\s*[x×*]\s*(\d{1,3})$/i))) {
      text = m[1]; qty = parseInt(m[2], 10);
    } else if ((m = text.match(/^(.+?)\s*\((\d{1,3})\)$/))) {
      text = m[1]; qty = parseInt(m[2], 10);
    }

    text = text.replace(/^[-*••\s]+/, '').trim();
    if (!qty || qty < 1) qty = 1;
    if (qty > 999) qty = 999;
    return { name: text, qty: qty };
  }

  /* ------------------------------------------------------------ persistence */

  function defaults() {
    return {
      version: SCHEMA_VERSION,
      lists: [],
      learned: {},                       /* item name -> category chosen by the user */
      categories: [],                    /* categories the user added */
      removedLists: {},                  /* list id -> when it was deleted */
      settings: { theme: 'system', lang: null, hidePacked: false }
    };
  }

  function migrate(raw) {
    var data = Object.assign(defaults(), raw || {});
    data.removedLists = data.removedLists || {};
    /* Register the user's own categories before items are read, so an item
       filed under one is not mistaken for an item with no category. */
    data.categories = (data.categories || []).filter(function (c) {
      return c && c.id && c.label;
    });
    cat.setCustom(data.categories);
    data.lists = (data.lists || []).map(function (list) {
      var listUpdated = list.updatedAt || list.createdAt || now();
      return {
        id: list.id || uid(),
        name: list.name || 'Untitled list',
        icon: list.icon || '🧳',
        notes: list.notes || '',
        createdAt: list.createdAt || now(),
        updatedAt: listUpdated,
        /* item id -> when it was deleted, so a merge does not resurrect it */
        removed: list.removed || {},
        items: (list.items || []).map(function (item, index) {
          var qty = item.qty > 0 ? item.qty : 1;
          /* Lists saved before quantities could be part-packed carry a
             boolean; a ticked item means every one of them is in the bag. */
          var done = item.packedQty === undefined
            ? (item.packed ? qty : 0)
            : item.packedQty;
          return {
            id: item.id || uid(),
            name: item.name || '',
            qty: qty,
            category: cat.get(item.category).id,
            packedQty: Math.max(0, Math.min(qty, Math.round(done) || 0)),
            note: item.note || '',
            /* Position inside its category. A number rather than the place in
               the array, so a reorder on one device reaches the other. */
            order: typeof item.order === 'number' ? item.order : index,
            updatedAt: item.updatedAt || listUpdated
          };
        })
      };
    });
    data.version = SCHEMA_VERSION;
    return data;
  }

  function load() {
    var raw = null;
    try {
      raw = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (err) {
      storageAvailable = typeof global.localStorage !== 'undefined';
      raw = null;
    }
    state = migrate(raw);
    return state;
  }

  function persist() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageAvailable = true;
    } catch (err) {
      storageAvailable = false;
    }
  }

  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 120);
  }

  function emit() {
    listeners.forEach(function (fn) { fn(state); });
  }

  function commit() {
    save();
    emit();
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  /* ------------------------------------------------------------------ undo */

  function checkpoint(label) {
    undoStack.push({ label: label, snapshot: clone(state) });
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  }

  function undo() {
    var entry = undoStack.pop();
    if (!entry) return null;
    state = entry.snapshot;
    /* The categories module keeps its own live copy (cats.all) alongside
       state.categories, resynced wherever categories are added, changed or
       removed - undo replaces state wholesale, so it needs the same. */
    cat.setCustom(state.categories);
    commit();
    return entry.label;
  }

  function canUndo() { return undoStack.length > 0; }

  function undoCount() { return undoStack.length; }

  /* The label of what a call to undo() would revert right now, or null. */
  function peekUndo() {
    var entry = undoStack[undoStack.length - 1];
    return entry ? entry.label : null;
  }

  /* ------------------------------------------------------------------ lists */

  function getLists() { return state.lists; }

  function getList(id) {
    return state.lists.filter(function (l) { return l.id === id; })[0] || null;
  }

  function touch(list) {
    list.updatedAt = now();
  }

  /* An item carries its own timestamp so two devices can be merged item by
     item rather than list against list. */
  function touchItem(list, item) {
    item.updatedAt = now();
    touch(list);
  }

  function forget(list, itemId) {
    list.removed[itemId] = now();
    touch(list);
  }

  /*
   * A line to add is either plain text, or { text, packed } - the shape a note
   * imported from elsewhere produces, where a ticked line is already packed.
   */
  function lineText(line) {
    if (line && typeof line === 'object') return String(line.text || '');
    return String(line == null ? '' : line);
  }

  function linePacked(line) {
    return !!(line && typeof line === 'object' && line.packed);
  }

  function makeItem(line) {
    var parsed = parseLine(lineText(line));
    if (!parsed.name) return null;
    return {
      id: uid(),
      name: parsed.name,
      qty: parsed.qty,
      category: cat.categorize(parsed.name, state.learned),
      packedQty: linePacked(line) ? parsed.qty : 0,
      note: '',
      order: 0,
      updatedAt: now()
    };
  }

  /* An item is packed once every one of its units is in the bag. */
  function isPacked(item) {
    return item.packedQty >= item.qty;
  }

  function createList(options) {
    options = options || {};
    var lang = i18n.getLang();
    var template = templates.get(options.templateId);
    var templateName = template ? templates.localized(template.name, lang) : '';
    var list = {
      id: uid(),
      name: options.name ||
        (template && template.id !== 'blank' ? templateName : i18n.t('menu.newList')),
      icon: options.icon || (template ? template.icon : '🧳'),
      notes: '',
      createdAt: now(),
      updatedAt: now(),
      removed: {},
      items: []
    };
    if (template) {
      templates.localized(template.items, lang).forEach(function (line) {
        var item = makeItem(line);
        if (item) list.items.push(item);
      });
    }
    checkpoint(i18n.t('undo.created', { name: list.name }));
    state.lists.unshift(list);
    commit();
    return list;
  }

  function duplicateList(id, options) {
    options = options || {};
    var source = getList(id);
    if (!source) return null;
    var copy = clone(source);
    copy.id = uid();
    copy.removed = {};
    copy.name = options.name || nextCopyName(source.name);
    copy.createdAt = now();
    copy.updatedAt = now();
    copy.items = copy.items.map(function (item) {
      item.id = uid();
      if (options.keepPacked !== true) item.packedQty = 0;
      return item;
    });
    checkpoint(i18n.t('undo.duplicated', { name: source.name }));
    state.lists.unshift(copy);
    commit();
    return copy;
  }

  /*
   * "Trip abroad" -> "Trip abroad (copy)" -> "Trip abroad (copy 2)" ...
   * The suffix follows the interface language, and a copy of a copy is
   * recognised whichever language made it.
   */
  var COPY_SUFFIXES = ['copy', 'עותק'];

  function nextCopyName(name) {
    var pattern = new RegExp('\\s*\\((?:' + COPY_SUFFIXES.join('|') + ')(?:\\s+\\d+)?\\)$', 'i');
    var base = name.replace(pattern, '');
    var word = i18n.t('dup.suffix');
    var candidate = base + ' (' + word + ')';
    var n = 2;
    while (state.lists.some(function (l) { return l.name === candidate; })) {
      candidate = base + ' (' + word + ' ' + n + ')';
      n++;
    }
    return candidate;
  }

  function updateList(id, changes) {
    var list = getList(id);
    if (!list) return null;
    checkpoint(i18n.t('undo.updatedList', { name: list.name }));
    Object.keys(changes).forEach(function (key) { list[key] = changes[key]; });
    touch(list);
    commit();
    return list;
  }

  function deleteList(id) {
    var list = getList(id);
    if (!list) return null;
    checkpoint(i18n.t('undo.deletedList', { name: list.name }));
    state.removedLists[id] = now();
    state.lists = state.lists.filter(function (l) { return l.id !== id; });
    /* Categories that existed only for this list go with it. */
    state.categories = state.categories.filter(function (c) { return c.listId !== id; });
    cat.setCustom(state.categories);
    commit();
    return list;
  }

  /* ------------------------------------------------------------------ items */

  function addItems(listId, lines) {
    var list = getList(listId);
    if (!list) return [];
    var added = [];
    lines.forEach(function (line) {
      var item = makeItem(line);
      if (!item) return;
      item.order = nextOrder(list);
      list.items.push(item);
      added.push(item);
    });
    if (added.length) {
      touch(list);
      commit();
    }
    return added;
  }

  function addItem(listId, line) {
    return addItems(listId, [line])[0] || null;
  }

  function nextOrder(list) {
    return list.items.reduce(function (top, item) {
      return Math.max(top, typeof item.order === 'number' ? item.order : 0);
    }, -1) + 1;
  }

  function getItem(list, itemId) {
    return list.items.filter(function (i) { return i.id === itemId; })[0] || null;
  }

  function updateItem(listId, itemId, changes) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;
    checkpoint(i18n.t('undo.updatedItem', { name: item.name }));

    if (typeof changes.name === 'string' && changes.name !== item.name) {
      var parsed = parseLine(changes.name);
      changes.name = parsed.name || item.name;
      if (parsed.qty > 1 && changes.qty === undefined) changes.qty = parsed.qty;
      /* re-categorise on rename unless the user pinned a category */
      if (changes.category === undefined && !item.categoryPinned) {
        changes.category = cat.categorize(changes.name, state.learned);
      }
    }
    Object.keys(changes).forEach(function (key) { item[key] = changes[key]; });
    if (item.qty < 1) item.qty = 1;
    item.packedQty = Math.max(0, Math.min(item.qty, item.packedQty || 0));
    touchItem(list, item);
    commit();
    return item;
  }

  /* A manual category change is remembered for future items with that name. */
  function setItemCategory(listId, itemId, categoryId) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;
    item.category = cat.get(categoryId).id;
    item.categoryPinned = true;
    state.learned[cat.normalize(item.name)] = item.category;
    touchItem(list, item);
    commit();
    return item;
  }

  function toggleItem(listId, itemId, packed) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;
    var full = packed === undefined ? !isPacked(item) : !!packed;
    item.packedQty = full ? item.qty : 0;
    touchItem(list, item);
    commit();
    return item;
  }

  /*
   * One tap on the counter: one more of this item went into the bag. Tapping
   * a finished item starts it over, the way unticking a checkbox does.
   */
  function advanceItem(listId, itemId) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;
    item.packedQty = isPacked(item) ? 0 : item.packedQty + 1;
    touchItem(list, item);
    commit();
    return item;
  }

  /* Exact count, from the item dialog or from undoing a tap. */
  function setPackedQty(listId, itemId, count) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;
    item.packedQty = Math.max(0, Math.min(item.qty, Math.round(count) || 0));
    touchItem(list, item);
    commit();
    return item;
  }

  function deleteItem(listId, itemId) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;
    checkpoint(i18n.t('undo.removedItem', { name: item.name }));
    list.items = list.items.filter(function (i) { return i.id !== itemId; });
    forget(list, itemId);
    commit();
    return item;
  }

  /* ---------------------------------------------------------- ordering */

  /* The items of one category, in the order they are shown. */
  function inCategory(list, categoryId) {
    return list.items.filter(function (item) { return item.category === categoryId; })
      .sort(function (a, b) { return a.order - b.order; });
  }

  /*
   * Moves an item one place up or down inside its own category. Categories
   * keep their own order, so an item never jumps out of its group.
   */
  function moveItem(listId, itemId, direction) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;

    var siblings = inCategory(list, item.category);
    var at = siblings.indexOf(item);
    var swapWith = siblings[at + (direction < 0 ? -1 : 1)];
    if (!swapWith) return null;

    var mine = item.order;
    item.order = swapWith.order;
    swapWith.order = mine;
    item.updatedAt = now();
    swapWith.updatedAt = now();
    touch(list);
    commit();
    return item;
  }

  /* --------------------------------------------------------- duplicates */

  /*
   * Two names describe the same item when their words pair up through any of
   * the readings categories.forms() knows about (Hebrew prefixes and plurals,
   * English plurals), or when the whole name is one typed character away.
   * Different word counts are left alone, so "מטען" and "מטען נייד" - charger
   * and power bank - stay separate items.
   */
  function sameItemName(a, b) {
    var textA = cat.normalize(a);
    var textB = cat.normalize(b);
    if (!textA || !textB) return false;
    if (textA === textB) return true;

    var wordsA = textA.split(' ');
    var wordsB = textB.split(' ');
    if (wordsA.length === wordsB.length) {
      var taken = [];
      var paired = wordsA.every(function (word) {
        var peeledA = cat.forms(word);
        var plainA = cat.forms(word, { prefixes: false });
        for (var i = 0; i < wordsB.length; i++) {
          if (taken[i]) continue;
          var peeledB = cat.forms(wordsB[i]);
          var plainB = cat.forms(wordsB[i], { prefixes: false });
          /* One of the two may have a prefix peeled off, never both. */
          if (shares(peeledA, plainB) || shares(plainA, peeledB)) {
            taken[i] = true;
            return true;
          }
        }
        return false;
      });
      if (paired) return true;
    }
    return withinOneEdit(textA, textB);
  }

  function shares(a, b) {
    return a.some(function (value) { return b.indexOf(value) !== -1; });
  }

  /* A single inserted, deleted or changed character - a mistyped "sunscren". */
  function withinOneEdit(a, b) {
    if (a.length < 5 || b.length < 5) return false;
    if (Math.abs(a.length - b.length) > 1) return false;
    if (a.charAt(0) !== b.charAt(0)) return false;

    var i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a.charAt(i) === b.charAt(j)) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  }

  /* The first item on the list that means the same thing, or null. */
  function findSimilar(listId, name, exceptId) {
    var list = getList(listId);
    if (!list) return null;
    for (var i = 0; i < list.items.length; i++) {
      var item = list.items[i];
      if (exceptId && item.id === exceptId) continue;
      if (sameItemName(item.name, name)) return item;
    }
    return null;
  }

  /* Swaps a new item into an existing one's place, keeping its position. */
  function replaceItem(listId, itemId, line) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;
    var parsed = parseLine(lineText(line));
    if (!parsed.name) return null;

    item.name = parsed.name;
    item.qty = parsed.qty;
    item.category = cat.categorize(parsed.name, state.learned);
    delete item.categoryPinned;
    item.packedQty = 0;
    item.note = '';
    touchItem(list, item);
    commit();
    return item;
  }

  function setAllPacked(listId, packed) {
    var list = getList(listId);
    if (!list) return null;
    checkpoint(i18n.t(packed ? 'undo.checkedAll' : 'undo.uncheckedAll'));
    list.items.forEach(function (item) {
      item.packedQty = packed ? item.qty : 0;
      item.updatedAt = now();
    });
    touch(list);
    commit();
    return list;
  }

  function removePacked(listId) {
    var list = getList(listId);
    if (!list) return null;
    checkpoint(i18n.t('undo.removedPacked'));
    list.items.filter(isPacked).forEach(function (item) { list.removed[item.id] = now(); });
    list.items = list.items.filter(function (item) { return !isPacked(item); });
    touch(list);
    commit();
    return list;
  }

  /* Re-runs auto categorisation over a whole list, keeping pinned items. */
  function recategorize(listId) {
    var list = getList(listId);
    if (!list) return null;
    checkpoint(i18n.t('undo.recategorized'));
    list.items.forEach(function (item) {
      if (item.categoryPinned) return;
      item.category = cat.categorize(item.name, state.learned);
      item.updatedAt = now();
    });
    touch(list);
    commit();
    return list;
  }

  /* ------------------------------------------------------------------ stats */

  /*
   * Counts are per item, so "63 items" keeps meaning what it always did.
   * The percentage is the average of how far each item has come, so an item
   * at 2 of 3 moves the bar two thirds of a row's worth.
   */
  function stats(list) {
    var total = list.items.length;
    var packed = 0;
    var progress = 0;
    list.items.forEach(function (item) {
      if (isPacked(item)) packed++;
      progress += Math.min(1, item.packedQty / item.qty);
    });
    return {
      total: total,
      packed: packed,
      remaining: total - packed,
      percent: total ? Math.round((progress / total) * 100) : 0
    };
  }

  /* Items grouped into categories, in the canonical category order. */
  function groupByCategory(items) {
    var buckets = {};
    items.forEach(function (item) {
      (buckets[item.category] = buckets[item.category] || []).push(item);
    });
    Object.keys(buckets).forEach(function (id) {
      buckets[id].sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    });
    return cat.all
      .filter(function (c) { return buckets[c.id] && buckets[c.id].length; })
      .map(function (c) {
        return { category: c, items: buckets[c.id] };
      });
  }

  /* ------------------------------------------------------ categories */

  /*
   * A category belongs either to one list or to all of them. "Photo gear" is
   * worth having on the trip it was invented for without cluttering every
   * other list, while something like "Documents" earns its place everywhere.
   *
   * getCategories(listId) answers what that list may use: the ones shared by
   * every list, plus its own. Called with nothing, it answers with all of
   * them, which is what the manager shows.
   */
  function getCategories(listId) {
    if (!listId) return state.categories;
    return state.categories.filter(function (c) {
      return !c.listId || c.listId === listId;
    });
  }

  /* Categories that name a list which no longer exists. */
  function orphanCategories() {
    return state.categories.filter(function (c) {
      return c.listId && !getList(c.listId);
    });
  }

  function addCategory(label, icon, listId) {
    var name = String(label || '').trim();
    if (!name) return null;
    var category = { id: 'c-' + uid(), label: name, icon: icon || '📦' };
    if (listId) category.listId = listId;
    checkpoint(i18n.t('undo.addedCategory', { name: name }));
    state.categories.push(category);
    cat.setCustom(state.categories);
    commit();
    return category;
  }

  function updateCategory(id, changes) {
    var category = state.categories.filter(function (c) { return c.id === id; })[0];
    if (!category) return null;
    checkpoint(i18n.t('undo.updatedCategory', { name: category.label }));
    if (changes.label !== undefined) category.label = String(changes.label).trim() || category.label;
    if (changes.icon !== undefined) category.icon = changes.icon;
    if (changes.listId !== undefined) {
      if (changes.listId) category.listId = changes.listId;
      else delete category.listId;
    }
    cat.setCustom(state.categories);
    commit();
    return category;
  }

  /* Removing a category leaves its items behind, under "Other". */
  function deleteCategory(id) {
    var category = state.categories.filter(function (c) { return c.id === id; })[0];
    if (!category) return null;
    checkpoint(i18n.t('undo.removedCategory', { name: category.label }));
    state.categories = state.categories.filter(function (c) { return c.id !== id; });
    state.lists.forEach(function (list) {
      list.items.forEach(function (item) {
        if (item.category !== id) return;
        item.category = 'misc';
        delete item.categoryPinned;
        item.updatedAt = now();
        touch(list);
      });
    });
    Object.keys(state.learned).forEach(function (key) {
      if (state.learned[key] === id) delete state.learned[key];
    });
    cat.setCustom(state.categories);
    commit();
    return category;
  }

  /* ------------------------------------------------------------- settings */

  function setSetting(key, value) {
    state.settings[key] = value;
    commit();
  }

  function getSetting(key) {
    return state.settings[key];
  }

  /* ------------------------------------------------------ import / export */

  function exportAll() {
    return JSON.stringify({
      app: 'PackMeUp',
      version: SCHEMA_VERSION,
      exportedAt: now(),
      lists: state.lists,
      categories: state.categories,
      removedLists: state.removedLists,
      learned: state.learned
    }, null, 2);
  }

  function exportList(id) {
    var list = getList(id);
    if (!list) return null;
    return JSON.stringify({
      app: 'PackMeUp',
      version: SCHEMA_VERSION,
      exportedAt: now(),
      lists: [list]
    }, null, 2);
  }

  function listToText(id) {
    var list = getList(id);
    if (!list) return '';
    var lines = [list.name, ''];
    groupByCategory(list.items).forEach(function (group) {
      lines.push(group.category.icon + ' ' + cat.label(group.category.id));
      group.items.forEach(function (item) {
        var mark = isPacked(item) ? 'x' : (item.packedQty > 0 ? '~' : ' ');
        lines.push('  [' + mark + '] ' +
          (item.qty > 1 ? item.packedQty + '/' + item.qty + ' ' : '') + item.name);
      });
      lines.push('');
    });
    return lines.join('\n').trim() + '\n';
  }

  /* ------------------------------------------------------------- merging */

  /*
   * Two devices holding the same lists are merged rather than stacked.
   *
   * Identity is what makes that possible: ids are preserved across an export,
   * so the same list arriving from another device is recognised as the same
   * list. Within it, every item carries its own timestamp and every deletion
   * leaves a tombstone, so the merge is decided item by item:
   *
   *   - an item on both sides -> the newer edit wins
   *   - an item on one side only -> it is kept, unless the other side deleted
   *     it after that edit
   *   - an item added independently on both devices under the same name ->
   *     treated as one item, not two
   */
  function newer(a, b) {
    return String(a || '') > String(b || '') ? a : b;
  }

  function mergeList(local, incoming) {
    var incomingIsNewer = String(incoming.updatedAt || '') > String(local.updatedAt || '');
    if (incomingIsNewer) {
      local.name = incoming.name;
      local.icon = incoming.icon;
      local.notes = incoming.notes;
    }

    var byId = {};
    var byName = {};
    local.items.forEach(function (item) {
      byId[item.id] = item;
      byName[cat.normalize(item.name)] = item;
    });

    /* deletions from the other device */
    Object.keys(incoming.removed || {}).forEach(function (itemId) {
      var when = incoming.removed[itemId];
      var mine = byId[itemId];
      if (mine && String(when) > String(mine.updatedAt || '')) {
        delete byId[itemId];
        delete byName[cat.normalize(mine.name)];
        local.items = local.items.filter(function (i) { return i.id !== itemId; });
      }
      local.removed[itemId] = newer(local.removed[itemId], when);
    });

    incoming.items.forEach(function (item) {
      var mine = byId[item.id] || byName[cat.normalize(item.name)];
      if (mine) {
        if (String(item.updatedAt || '') > String(mine.updatedAt || '')) {
          mine.name = item.name;
          mine.qty = item.qty;
          mine.category = item.category;
          mine.categoryPinned = item.categoryPinned;
          mine.packedQty = item.packedQty;
          mine.note = item.note;
          mine.updatedAt = item.updatedAt;
        }
        return;
      }
      /* deleted here after the other device last touched it */
      var tomb = local.removed[item.id];
      if (tomb && String(tomb) >= String(item.updatedAt || '')) return;

      local.items.push(item);
      byId[item.id] = item;
      byName[cat.normalize(item.name)] = item;
    });

    local.updatedAt = newer(local.updatedAt, incoming.updatedAt);
    return local;
  }

  /* Folds another device's whole state into this one. */
  function mergeState(incoming) {
    var summary = { lists: 0, merged: 0, added: 0 };
    var byId = {};
    state.lists.forEach(function (list) { byId[list.id] = list; });

    Object.keys(incoming.removedLists || {}).forEach(function (listId) {
      var when = incoming.removedLists[listId];
      var mine = byId[listId];
      if (mine && String(when) > String(mine.updatedAt || '')) {
        state.lists = state.lists.filter(function (l) { return l.id !== listId; });
        delete byId[listId];
      }
      state.removedLists[listId] = newer(state.removedLists[listId], when);
    });

    (incoming.lists || []).forEach(function (list) {
      summary.lists++;
      var mine = byId[list.id];
      if (mine) {
        mergeList(mine, list);
        summary.merged++;
        return;
      }
      var tomb = state.removedLists[list.id];
      if (tomb && String(tomb) >= String(list.updatedAt || '')) return;
      state.lists.unshift(list);
      byId[list.id] = list;
      summary.added++;
    });

    Object.keys(incoming.learned || {}).forEach(function (key) {
      state.learned[key] = incoming.learned[key];
    });

    var known = {};
    state.categories.forEach(function (c) { known[c.id] = true; });
    (incoming.categories || []).forEach(function (c) {
      if (c && c.id && c.label && !known[c.id]) state.categories.push(c);
    });
    cat.setCustom(state.categories);
    return summary;
  }

  /*
   * Imports an export file, merging it into what is already here. Lists keep
   * their ids across devices, so importing the same backup twice settles
   * rather than piling up copies.
   */
  function importJSON(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error(i18n.t('import.badJson'));
    }
    var incoming = Array.isArray(data) ? data : data.lists;
    if (!Array.isArray(incoming) || !incoming.length) {
      throw new Error(i18n.t('import.noLists'));
    }
    checkpoint(i18n.t('undo.imported'));
    var prepared = migrate({
      lists: incoming,
      categories: (state.categories || []).concat(data.categories || []),
      removedLists: data.removedLists,
      learned: data.learned
    });
    var summary = mergeState({
      lists: prepared.lists,
      categories: data.categories,
      removedLists: prepared.removedLists,
      learned: prepared.learned
    });
    commit();
    return summary;
  }

  global.PMU = global.PMU || {};
  global.PMU.store = {
    load: load,
    subscribe: subscribe,
    getState: function () { return state; },
    storageAvailable: function () { return storageAvailable; },

    getLists: getLists,
    getList: getList,
    createList: createList,
    duplicateList: duplicateList,
    updateList: updateList,
    deleteList: deleteList,

    addItem: addItem,
    addItems: addItems,
    updateItem: updateItem,
    setItemCategory: setItemCategory,
    toggleItem: toggleItem,
    advanceItem: advanceItem,
    setPackedQty: setPackedQty,
    isPacked: isPacked,
    deleteItem: deleteItem,
    findSimilar: findSimilar,
    sameItemName: sameItemName,
    replaceItem: replaceItem,
    setAllPacked: setAllPacked,
    removePacked: removePacked,
    recategorize: recategorize,

    stats: stats,
    groupByCategory: groupByCategory,
    moveItem: moveItem,
    inCategory: inCategory,
    getCategories: getCategories,
    orphanCategories: orphanCategories,
    addCategory: addCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    parseLine: parseLine,
    lineText: lineText,

    setSetting: setSetting,
    getSetting: getSetting,

    undo: undo,
    canUndo: canUndo,
    undoCount: undoCount,
    peekUndo: peekUndo,
    checkpoint: checkpoint,

    mergeState: mergeState,
    exportAll: exportAll,
    exportList: exportList,
    listToText: listToText,
    importJSON: importJSON
  };
})(window);
