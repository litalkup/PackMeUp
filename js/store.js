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
  var SCHEMA_VERSION = 1;

  var cat = global.PMU.categories;
  var templates = global.PMU.templates;
  var i18n = global.PMU.i18n;

  var state = null;
  var listeners = [];
  var undoStack = [];
  var UNDO_LIMIT = 20;
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
      settings: { theme: 'system', lang: null, hidePacked: false }
    };
  }

  function migrate(raw) {
    var data = Object.assign(defaults(), raw || {});
    data.lists = (data.lists || []).map(function (list) {
      return {
        id: list.id || uid(),
        name: list.name || 'Untitled list',
        icon: list.icon || '🧳',
        notes: list.notes || '',
        createdAt: list.createdAt || now(),
        updatedAt: list.updatedAt || list.createdAt || now(),
        items: (list.items || []).map(function (item) {
          return {
            id: item.id || uid(),
            name: item.name || '',
            qty: item.qty > 0 ? item.qty : 1,
            category: cat.get(item.category).id,
            packed: !!item.packed,
            note: item.note || ''
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
    commit();
    return entry.label;
  }

  function canUndo() { return undoStack.length > 0; }

  /* ------------------------------------------------------------------ lists */

  function getLists() { return state.lists; }

  function getList(id) {
    return state.lists.filter(function (l) { return l.id === id; })[0] || null;
  }

  function touch(list) {
    list.updatedAt = now();
  }

  function makeItem(line) {
    var parsed = parseLine(line);
    if (!parsed.name) return null;
    return {
      id: uid(),
      name: parsed.name,
      qty: parsed.qty,
      category: cat.categorize(parsed.name, state.learned),
      packed: false,
      note: ''
    };
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
      items: []
    };
    if (template) {
      templates.localized(template.items, lang).forEach(function (line) {
        var item = makeItem(line);
        if (item) list.items.push(item);
      });
    }
    checkpoint('Created "' + list.name + '"');
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
    copy.name = options.name || nextCopyName(source.name);
    copy.createdAt = now();
    copy.updatedAt = now();
    copy.items = copy.items.map(function (item) {
      item.id = uid();
      if (options.keepPacked !== true) item.packed = false;
      return item;
    });
    checkpoint('Duplicated "' + source.name + '"');
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
    Object.keys(changes).forEach(function (key) { list[key] = changes[key]; });
    touch(list);
    commit();
    return list;
  }

  function deleteList(id) {
    var list = getList(id);
    if (!list) return null;
    checkpoint('Deleted "' + list.name + '"');
    state.lists = state.lists.filter(function (l) { return l.id !== id; });
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

  function getItem(list, itemId) {
    return list.items.filter(function (i) { return i.id === itemId; })[0] || null;
  }

  function updateItem(listId, itemId, changes) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;

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
    touch(list);
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
    touch(list);
    commit();
    return item;
  }

  function toggleItem(listId, itemId, packed) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;
    item.packed = packed === undefined ? !item.packed : !!packed;
    touch(list);
    commit();
    return item;
  }

  function deleteItem(listId, itemId) {
    var list = getList(listId);
    if (!list) return null;
    var item = getItem(list, itemId);
    if (!item) return null;
    checkpoint('Removed "' + item.name + '"');
    list.items = list.items.filter(function (i) { return i.id !== itemId; });
    touch(list);
    commit();
    return item;
  }

  function setAllPacked(listId, packed) {
    var list = getList(listId);
    if (!list) return null;
    checkpoint(packed ? 'Checked everything' : 'Unchecked everything');
    list.items.forEach(function (item) { item.packed = !!packed; });
    touch(list);
    commit();
    return list;
  }

  function removePacked(listId) {
    var list = getList(listId);
    if (!list) return null;
    checkpoint('Removed packed items');
    list.items = list.items.filter(function (item) { return !item.packed; });
    touch(list);
    commit();
    return list;
  }

  /* Re-runs auto categorisation over a whole list, keeping pinned items. */
  function recategorize(listId) {
    var list = getList(listId);
    if (!list) return null;
    checkpoint('Re-sorted categories');
    list.items.forEach(function (item) {
      if (item.categoryPinned) return;
      item.category = cat.categorize(item.name, state.learned);
    });
    touch(list);
    commit();
    return list;
  }

  /* ------------------------------------------------------------------ stats */

  function stats(list) {
    var total = list.items.length;
    var packed = list.items.filter(function (i) { return i.packed; }).length;
    return {
      total: total,
      packed: packed,
      remaining: total - packed,
      percent: total ? Math.round((packed / total) * 100) : 0
    };
  }

  /* Items grouped into categories, in the canonical category order. */
  function groupByCategory(items) {
    var buckets = {};
    items.forEach(function (item) {
      (buckets[item.category] = buckets[item.category] || []).push(item);
    });
    return cat.all
      .filter(function (c) { return buckets[c.id] && buckets[c.id].length; })
      .map(function (c) {
        return { category: c, items: buckets[c.id] };
      });
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
        lines.push('  [' + (item.packed ? 'x' : ' ') + '] ' +
          (item.qty > 1 ? item.qty + ' x ' : '') + item.name);
      });
      lines.push('');
    });
    return lines.join('\n').trim() + '\n';
  }

  /* Imports an export file. Lists are added, never overwritten. */
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
    checkpoint('Imported lists');
    var imported = migrate({ lists: incoming }).lists;
    imported.forEach(function (list) {
      list.id = uid();
      if (state.lists.some(function (l) { return l.name === list.name; })) {
        list.name = nextCopyName(list.name);
      }
      list.items.forEach(function (item) { item.id = uid(); });
      state.lists.unshift(list);
    });
    if (data.learned && typeof data.learned === 'object') {
      Object.keys(data.learned).forEach(function (key) {
        state.learned[key] = data.learned[key];
      });
    }
    commit();
    return imported.length;
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
    deleteItem: deleteItem,
    setAllPacked: setAllPacked,
    removePacked: removePacked,
    recategorize: recategorize,

    stats: stats,
    groupByCategory: groupByCategory,
    parseLine: parseLine,

    setSetting: setSetting,
    getSetting: getSetting,

    undo: undo,
    canUndo: canUndo,

    exportAll: exportAll,
    exportList: exportList,
    listToText: listToText,
    importJSON: importJSON
  };
})(window);
