/*
 * PackMeUp - UI layer.
 *
 * Two views (all lists / one list) driven by the hash, rendered from the
 * store. No framework, no build step: open index.html and it runs. Every
 * visible string comes from js/i18n.js, and the whole layout flips to
 * right-to-left when the language does.
 */
(function (global) {
  'use strict';

  var store = global.PMU.store;
  var notes = global.PMU.notes;
  var drive = global.PMU.drive;
  var cats = global.PMU.categories;
  var templates = global.PMU.templates;
  var i18n = global.PMU.i18n;

  function t(key, params) { return i18n.t(key, params); }
  function plural(count, kind) { return i18n.plural(count, kind); }

  var ICONS = ['🧳', '✈️', '🪖', '⛺', '🏖️', '💼', '🏋️', '🧸', '🚗', '🚲', '🎒',
               '🏔️', '🛶', '🎿', '🎪', '🎓', '🏥', '🏡', '🎉', '📦'];

  var CATEGORY_ICONS = ['📦', '📷', '🎨', '🎸', '📚', '🔧', '🎣', '🎿', '🐾', '🧷',
                        '🍼', '🏄', '⚽', '🛠️', '💡', '🧯', '🗺️', '🎧', '🪥', '🧳'];

  var THEMES = ['system', 'light', 'dark'];

  var ui = {
    route: { view: 'home', listId: null },
    listFilter: 'all',
    reordering: false,
    listQuery: '',
    homeQuery: '',
    collapsed: {}          /* listId -> { categoryId: true } */
  };

  /* ------------------------------------------------------------- helpers */

  function $(id) { return document.getElementById(id); }

  /* Tiny element builder: h('div', {class:'x'}, [children]) */
  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.indexOf('on') === 0 && typeof value === 'function') {
          node.addEventListener(key.slice(2), value);
        } else if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, value);
      });
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function relativeDate(iso) {
    var then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    var days = Math.floor((Date.now() - then) / 86400000);
    if (days <= 0) return t('date.today');
    if (days === 1) return t('date.yesterday');
    if (days < 7) return t('date.daysAgo', { n: days });
    if (days < 30) return t('date.weeksAgo', { n: Math.floor(days / 7) });
    return new Date(iso).toLocaleDateString(i18n.meta().locale, { day: 'numeric', month: 'short' });
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || 'application/json') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = h('a', { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copyText(text) {
    if (global.navigator.clipboard && global.isSecureContext) {
      return global.navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = h('textarea', { style: 'position:fixed;opacity:0' });
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(area);
      }
    });
  }

  /* Latin file names travel better than Hebrew ones across devices. */
  function slug(text) {
    var ascii = String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return ascii || 'packmeup-list';
  }

  /* --------------------------------------------------------------- toast */

  var toastTimer = null;

  function toast(message, action) {
    var box = $('toast');
    var btn = $('toast-action');
    $('toast-text').textContent = message;
    if (action) {
      btn.textContent = action.label;
      btn.hidden = false;
      btn.onclick = function () {
        hideToast();
        action.onClick();
      };
    } else {
      btn.hidden = true;
      btn.onclick = null;
    }
    box.dataset.open = 'true';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 6000 : 2600);
  }

  function hideToast() {
    $('toast').dataset.open = 'false';
    if (toastTimer) clearTimeout(toastTimer);
  }

  /* Pops the most recent checkpoint. Safe to call with nothing to undo. */
  function performUndo() {
    if (!store.canUndo()) return;
    store.undo();
    toast(t('toast.undone'));
  }

  function undoable(message) {
    toast(message, { label: t('action.undo'), onClick: performUndo });
  }

  /* -------------------------------------------------------------- dialog */

  var dialog = $('dialog');
  var dialogCleanup = null;

  /*
   * open({ title, body, actions, focus })
   *   body    - element to place in the dialog
   *   actions - [{ label, variant, close, onClick }]
   *   focus   - selector of the element to focus on open
   */
  function openDialog(options) {
    closeDialog();
    $('dialog-title').textContent = options.title || '';
    var body = $('dialog-body');
    var foot = $('dialog-foot');
    clear(body);
    clear(foot);

    if (options.body) body.appendChild(options.body);

    (options.actions || []).forEach(function (action) {
      foot.appendChild(h('button', {
        type: 'button',
        class: 'btn' + (action.variant ? ' btn--' + action.variant : ''),
        text: action.label,
        onclick: function () {
          if (action.onClick && action.onClick() === false) return;
          if (action.close !== false) closeDialog();
        }
      }));
    });
    foot.hidden = !(options.actions || []).length;

    dialogCleanup = options.onClose || null;
    dialog.showModal();

    var target = options.focus ? body.querySelector(options.focus) : null;
    if (target) {
      target.focus();
      if (target.select && target.type === 'text') target.select();
    }
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('close', function () {
    if (dialogCleanup) { var fn = dialogCleanup; dialogCleanup = null; fn(); }
  });
  dialog.addEventListener('click', function (event) {
    if (event.target.hasAttribute && event.target.hasAttribute('data-close')) closeDialog();
  });

  function confirmDialog(options) {
    openDialog({
      title: options.title,
      body: h('p', { text: options.message, style: 'margin:0;color:var(--text-muted)' }),
      actions: [
        { label: t('action.cancel') },
        {
          label: options.confirmLabel || t('action.delete'),
          variant: options.variant || 'danger',
          onClick: options.onConfirm
        }
      ]
    });
  }

  /* A menu row inside a dialog. */
  function menuEntry(icon, label, onClick, danger) {
    return h('button', {
      class: 'menu__item' + (danger ? ' menu__item--danger' : ''), type: 'button',
      onclick: function () { closeDialog(); setTimeout(onClick, 10); }
    }, [
      h('span', { class: 'menu__icon', text: icon, 'aria-hidden': 'true' }),
      h('span', { text: label })
    ]);
  }

  /* ------------------------------------------------------------- routing */

  function parseHash() {
    var hash = global.location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/').filter(Boolean);
    if (parts[0] === 'list' && parts[1]) return { view: 'list', listId: parts[1] };
    return { view: 'home', listId: null };
  }

  function navigate(hash) { global.location.hash = hash; }

  function onRouteChange() {
    var next = parseHash();
    if (next.view === 'list' && !store.getList(next.listId)) next = { view: 'home', listId: null };
    var changedList = next.listId !== ui.route.listId;
    ui.route = next;
    if (changedList) {
      ui.listFilter = 'all';
      ui.listQuery = '';
      ui.reordering = false;
      var search = $('list-search');
      if (search) search.value = '';
    }
    render();
    global.scrollTo(0, 0);
  }

  /* --------------------------------------------------------------- theme */

  function applyTheme() {
    var choice = store.getSetting('theme') || 'system';
    var dark = choice === 'dark' || (choice === 'system' &&
      global.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('theme-btn').title = t('menu.theme', { theme: t('theme.' + choice) });
  }

  function cycleTheme() {
    var current = store.getSetting('theme') || 'system';
    var next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    store.setSetting('theme', next);
    applyTheme();
    toast(t('theme.changed', { theme: t('theme.' + next) }));
  }

  /* ------------------------------------------------------------ language */

  /*
   * Applies the current language to the document: text direction, the page
   * title, and every element carrying a data-i18n* attribute.
   */
  function applyLanguage() {
    var meta = i18n.meta();
    var root = document.documentElement;
    root.lang = meta.id;
    root.dir = meta.dir;
    document.title = t('app.title');

    each('[data-i18n]', function (node) {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    each('[data-i18n-placeholder]', function (node) {
      node.setAttribute('placeholder', t(node.getAttribute('data-i18n-placeholder')));
    });
    each('[data-i18n-aria]', function (node) {
      node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria')));
    });
    each('[data-i18n-title]', function (node) {
      node.setAttribute('title', t(node.getAttribute('data-i18n-title')));
    });

    /* The back arrow points the way the language reads. */
    $('back-btn').textContent = i18n.isRTL() ? '→' : '←';
    applyTheme();
  }

  function each(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  }

  function setLanguage(id) {
    if (id === i18n.getLang()) return;
    i18n.setLang(id);
    store.setSetting('lang', id);
    applyLanguage();
    render();
  }

  function languageDialog() {
    var menu = h('div', { class: 'menu' }, i18n.languages().map(function (lang) {
      var active = lang.id === i18n.getLang();
      return menuEntry(active ? '✓' : '　', lang.label, function () {
        setLanguage(lang.id);
      });
    }));
    openDialog({ title: t('menu.language', { language: i18n.meta().label }), body: menu });
  }

  /* ----------------------------------------------------------- home view */

  function matchesQuery(list, query) {
    if (!query) return true;
    var q = query.toLowerCase();
    if (list.name.toLowerCase().indexOf(q) !== -1) return true;
    return list.items.some(function (item) {
      return item.name.toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderHome() {
    var container = $('home-cards');
    var lists = store.getLists().filter(function (list) {
      return matchesQuery(list, ui.homeQuery);
    });

    clear(container);
    lists.forEach(function (list) { container.appendChild(listCard(list)); });

    var total = store.getLists().length;
    $('home-heading').hidden = total === 0;
    $('home-count').textContent = ui.homeQuery
      ? plural(lists.length, 'match')
      : plural(total, 'list');

    var empty = $('home-empty');
    clear(empty);
    if (!total) {
      empty.hidden = false;
      empty.appendChild(emptyHomeState());
    } else if (!lists.length) {
      empty.hidden = false;
      empty.appendChild(h('div', { class: 'empty' }, [
        h('div', { class: 'empty__emoji', text: '🔍' }),
        h('h2', { text: t('home.noMatch.title', { q: ui.homeQuery }), dir: 'auto' }),
        h('p', { text: t('home.noMatch.body') })
      ]));
    } else {
      empty.hidden = true;
    }
  }

  function emptyHomeState() {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'empty__emoji', text: '🧳' }),
      h('h2', { text: t('home.empty.title') }),
      h('p', { text: t('home.empty.body') }),
      h('button', {
        class: 'btn btn--primary', type: 'button', text: t('home.newList'),
        onclick: newListDialog
      })
    ]);
  }

  function listCard(list) {
    var st = store.stats(list);
    var done = st.total > 0 && st.remaining === 0;

    return h('div', {
      class: 'card' + (done ? ' card--done' : ''),
      role: 'button', tabindex: '0',
      'aria-label': t('card.aria', { name: list.name, packed: st.packed, total: st.total }),
      onclick: function () { navigate('#/list/' + list.id); },
      onkeydown: function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate('#/list/' + list.id);
        }
      }
    }, [
      h('div', { class: 'card__top' }, [
        h('span', { class: 'card__icon', text: list.icon, 'aria-hidden': 'true' }),
        h('div', { class: 'card__head' }, [
          h('h3', { class: 'card__title', text: list.name, dir: 'auto' }),
          h('p', { class: 'card__meta', text: st.total
            ? plural(st.total, 'item') + ' · ' +
              plural(store.groupByCategory(list.items).length, 'category')
            : t('card.empty') })
        ]),
        h('button', {
          class: 'icon-btn card__menu', type: 'button',
          'aria-label': t('card.options', { name: list.name }),
          text: '⋯',
          onclick: function (event) { event.stopPropagation(); listMenuDialog(list.id); }
        })
      ]),
      h('div', {
        class: 'progress' + (done ? ' progress--done' : ''),
        role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
        'aria-valuenow': String(st.percent)
      }, [
        h('div', { class: 'progress__bar', style: 'width:' + st.percent + '%' })
      ]),
      h('div', { class: 'card__foot' }, [
        h('span', {
          class: 'badge' + (done ? ' badge--done' : ''),
          text: done ? t('card.allPacked') : t('card.packedOf', { packed: st.packed, total: st.total })
        }),
        h('span', { text: t('card.updated', { when: relativeDate(list.updatedAt) }) })
      ])
    ]);
  }

  /* ----------------------------------------------------------- list view */

  function visibleItems(list) {
    var q = ui.listQuery.toLowerCase();
    return list.items.filter(function (item) {
      if (ui.listFilter === 'todo' && store.isPacked(item)) return false;
      if (ui.listFilter === 'packed' && !store.isPacked(item)) return false;
      if (q && item.name.toLowerCase().indexOf(q) === -1 &&
          (item.note || '').toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderList() {
    var list = store.getList(ui.route.listId);
    if (!list) { navigate('#/'); return; }

    var st = store.stats(list);
    $('topbar-title').textContent = list.name;
    $('list-icon').textContent = list.icon;
    $('list-name').textContent = list.name;
    $('list-sub').textContent = st.total
      ? st.remaining === 0
        ? t('list.sub.allPacked')
        : t('list.sub.remaining', { remaining: plural(st.remaining, 'item'), total: st.total })
      : t('list.sub.empty');
    $('list-pct').textContent = st.percent + '%';
    $('list-progress').setAttribute('aria-valuenow', String(st.percent));
    $('list-progress-bar').style.width = st.percent + '%';
    $('list-progress').classList.toggle('progress--done', st.total > 0 && st.remaining === 0);

    each('.chip[data-filter]', function (chip) {
      chip.setAttribute('aria-pressed', chip.dataset.filter === ui.listFilter ? 'true' : 'false');
    });

    var banner = $('reorder-bar');
    banner.hidden = !ui.reordering;
    if (ui.reordering) {
      clear(banner);
      banner.appendChild(h('span', { text: t('reorder.on') }));
      banner.appendChild(h('button', {
        class: 'btn btn--sm', type: 'button', text: t('reorder.done'),
        onclick: function () { ui.reordering = false; renderList(); }
      }));
    }

    var groupsEl = $('list-groups');
    clear(groupsEl);
    var items = visibleItems(list);
    store.groupByCategory(items).forEach(function (group) {
      groupsEl.appendChild(categoryGroup(list, group));
    });

    var empty = $('list-empty');
    clear(empty);
    if (!items.length) {
      empty.hidden = false;
      empty.appendChild(listEmptyState(st));
    } else {
      empty.hidden = true;
    }
  }

  function listEmptyState(st) {
    if (!st.total) {
      return h('div', { class: 'empty' }, [
        h('div', { class: 'empty__emoji', text: '📝' }),
        h('h2', { text: t('empty.list.title') }),
        h('p', { text: t('empty.list.body') })
      ]);
    }
    if (ui.listQuery) {
      return h('div', { class: 'empty' }, [
        h('div', { class: 'empty__emoji', text: '🔍' }),
        h('h2', { text: t('empty.search.title', { q: ui.listQuery }), dir: 'auto' })
      ]);
    }
    if (ui.listFilter === 'todo') {
      return h('div', { class: 'empty' }, [
        h('div', { class: 'empty__emoji', text: '🎉' }),
        h('h2', { text: t('empty.todo.title') }),
        h('p', { text: t('empty.todo.body') })
      ]);
    }
    return h('div', { class: 'empty' }, [
      h('div', { class: 'empty__emoji', text: '📦' }),
      h('h2', { text: t('empty.packed.title') }),
      h('p', { text: t('empty.packed.body') })
    ]);
  }

  function isCollapsed(listId, categoryId) {
    return !!(ui.collapsed[listId] && ui.collapsed[listId][categoryId]);
  }

  function toggleCollapsed(listId, categoryId) {
    var map = ui.collapsed[listId] = ui.collapsed[listId] || {};
    map[categoryId] = !map[categoryId];
  }

  function categoryGroup(list, group) {
    var packed = group.items.filter(function (i) { return store.isPacked(i); }).length;
    var allPacked = packed === group.items.length;
    var collapsed = isCollapsed(list.id, group.category.id);

    return h('section', {
      class: 'group' + (allPacked ? ' group--done' : ''),
      'data-collapsed': collapsed ? 'true' : 'false'
    }, [
      h('button', {
        class: 'group__head', type: 'button',
        'aria-expanded': collapsed ? 'false' : 'true',
        onclick: function () {
          toggleCollapsed(list.id, group.category.id);
          renderList();
        }
      }, [
        h('span', { class: 'group__icon', text: group.category.icon, 'aria-hidden': 'true' }),
        h('span', { class: 'group__name', text: cats.label(group.category.id) }),
        h('span', { class: 'group__count', text: packed + '/' + group.items.length }),
        h('span', { class: 'group__chevron', text: '▾', 'aria-hidden': 'true' })
      ]),
      h('ul', { class: 'items' }, group.items.map(function (item, index) {
        return itemRow(list, item, {
          first: index === 0,
          last: index === group.items.length - 1
        });
      }))
    ]);
  }

  function itemRow(list, item, position) {
    var packed = store.isPacked(item);
    var left = item.qty - item.packedQty;
    var partly = !packed && item.packedQty > 0;

    return h('li', { class: 'item' + (packed ? ' item--packed' : '') }, [
      item.qty > 1 ? countControl(list, item) : checkControl(list, item),
      h('button', {
        class: 'item__body', type: 'button',
        'aria-label': t('item.edit', { name: item.name }),
        onclick: function () { itemDialog(list.id, item.id); }
      }, [
        h('span', { class: 'item__name', text: item.name, dir: 'auto' }),
        partly ? h('span', {
          class: 'item__left',
          text: left === 1 ? t('count.leftOne') : t('count.leftMany', { n: left })
        }) : null,
        item.note ? h('span', { class: 'item__note', text: item.note, dir: 'auto' }) : null
      ]),
      ui.reordering ? moveControls(list, item, position) : null
    ]);
  }

  /* Shown only while reordering, so an ordinary row stays uncluttered. */
  function moveControls(list, item, position) {
    function arrow(symbol, direction, labelKey, disabled) {
      return h('button', {
        class: 'move', type: 'button', disabled: disabled || null,
        'aria-label': t(labelKey, { name: item.name }),
        text: symbol,
        onclick: function () { store.moveItem(list.id, item.id, direction); }
      });
    }
    return h('span', { class: 'item__move' }, [
      arrow('↑', -1, 'item.moveUp', position.first),
      arrow('↓', 1, 'item.moveDown', position.last)
    ]);
  }

  function checkControl(list, item) {
    var packed = store.isPacked(item);
    return h('button', {
      class: 'check', type: 'button', role: 'checkbox',
      'aria-checked': packed ? 'true' : 'false',
      'aria-label': t(packed ? 'item.unpack' : 'item.pack', { name: item.name }),
      text: '✓',
      onclick: function () { store.toggleItem(list.id, item.id); }
    });
  }

  /*
   * Items that come in a quantity get a counter instead of a checkbox: one tap
   * puts one more of them in the bag, and the control fills up as it goes.
   * Tapping a full counter starts it over, the way unticking a box does.
   */
  function countControl(list, item) {
    var packed = store.isPacked(item);
    var filled = Math.round(Math.min(1, item.packedQty / item.qty) * 100);
    var before = item.packedQty;

    return h('button', {
      class: 'counter' + (packed ? ' counter--done' : ''), type: 'button',
      'aria-label': t('count.aria', {
        name: item.name, packed: item.packedQty, total: item.qty
      }),
      onclick: function () {
        var updated = store.advanceItem(list.id, item.id);
        if (!updated) return;
        toast(t('count.toast', { packed: updated.packedQty, total: updated.qty }), {
          label: t('action.undo'),
          onClick: function () { store.setPackedQty(list.id, item.id, before); }
        });
      }
    }, [
      h('span', { class: 'counter__fill', style: 'width:' + filled + '%', 'aria-hidden': 'true' }),
      h('span', { class: 'counter__text', text: item.packedQty + '/' + item.qty })
    ]);
  }

  /* ---------------------------------------------------- adding items */

  /*
   * Adds lines to a list one at a time. A line whose item is already on the
   * list stops the run and asks what to do with it; the rest continue once
   * that is answered. Items are added as we go, so a duplicate inside the
   * same paste is caught too.
   */
  function addLines(listId, lines) {
    var queue = lines.map(function (line) { return line; }).filter(Boolean);
    if (!queue.length) return;
    var firstName = queue.length === 1 ? store.parseLine(store.lineText(queue[0])).name : null;
    store.checkpoint(firstName
      ? t('undo.addedItem', { name: firstName })
      : t('undo.addedItems', { n: queue.length }));

    var tally = { added: 0, replaced: 0, skipped: 0, conflictsSeen: 0,
                  total: queue.length, lastItem: null, applyToAll: null };
    var conflicts = countConflicts(listId, queue);
    step(0);

    function step(index) {
      while (index < queue.length) {
        var line = queue[index];
        var parsed = store.parseLine(store.lineText(line));
        if (!parsed.name) { index++; continue; }

        var existing = store.findSimilar(listId, parsed.name);
        if (existing && tally.applyToAll) {
          resolveConflict(listId, line, existing, tally.applyToAll, tally);
          index++;
          continue;
        }
        if (existing) {
          conflictDialog({
            listId: listId,
            line: line,
            parsed: parsed,
            existing: existing,
            position: tally.conflictsSeen + 1,
            total: conflicts,
            onDone: function () { step(index + 1); }
          }, tally);
          return;
        }
        tally.lastItem = store.addItem(listId, line);
        if (tally.lastItem) tally.added++;
        index++;
      }
      report(tally);
    }
  }

  /* How many of these lines clash with what is already there (for "2 of 3"). */
  function countConflicts(listId, lines) {
    var names = [];
    var count = 0;
    lines.forEach(function (line) {
      var parsed = store.parseLine(store.lineText(line));
      if (!parsed.name) return;
      var clash = !!store.findSimilar(listId, parsed.name) ||
        names.some(function (seen) { return store.sameItemName(seen, parsed.name); });
      if (clash) count++;
      else names.push(parsed.name);
    });
    return count;
  }

  /* One toast for the whole run. */
  function report(tally) {
    if (tally.total === 1) {
      if (tally.replaced) { undoable(t('dupe.replaced')); return; }
      if (tally.skipped) { toast(t('dupe.skipped')); return; }
      if (tally.added && tally.lastItem) {
        var category = cats.get(tally.lastItem.category);
        undoable(t('add.addedTo', { category: category.icon + ' ' + cats.label(category.id) }));
      }
      return;
    }
    var parts = [];
    if (tally.added) parts.push(t('add.summaryAdded', { n: tally.added }));
    if (tally.replaced) parts.push(t('add.summaryReplaced', { n: tally.replaced }));
    if (tally.skipped) parts.push(t('add.summarySkipped', { n: tally.skipped }));
    if (!parts.length) return;
    if (tally.added || tally.replaced) undoable(parts.join(' · '));
    else toast(parts.join(' · '));
  }

  /* The two items side by side, so the choice is made on what is actually there. */
  function itemPreview(labelKey, name, qty, categoryId, packedNote) {
    var category = cats.get(categoryId);
    var meta = [category.icon + ' ' + cats.label(category.id)];
    if (qty > 1) meta.push(t('dupe.qty', { n: qty }));
    if (packedNote) meta.push(packedNote);
    return h('div', { class: 'compare__card' }, [
      h('div', { class: 'compare__label', text: t(labelKey) }),
      h('div', { class: 'compare__name', text: name, dir: 'auto' }),
      h('div', { class: 'compare__meta', text: meta.join(' · ') })
    ]);
  }

  /* Carries out one answer to a duplicate, with or without the dialog. */
  function resolveConflict(listId, line, existing, action, tally) {
    if (action === 'add') {
      tally.lastItem = store.addItem(listId, line);
      if (tally.lastItem) tally.added++;
    } else if (action === 'replace') {
      store.replaceItem(listId, existing.id, line);
      tally.replaced++;
    } else {
      tally.skipped++;
    }
  }

  function conflictDialog(conflict, tally) {
    var existing = conflict.existing;
    var parsed = conflict.parsed;
    var answered = false;
    var applyAll = null;

    function choose(action) {
      answered = true;
      tally.conflictsSeen++;
      /* Pasting a whole note can hit the same answer a dozen times over. */
      if (applyAll && applyAll.checked) tally.applyToAll = action;
      resolveConflict(conflict.listId, conflict.line, existing, action, tally);
      closeDialog();
      setTimeout(conflict.onDone, 10);
    }

    var newCategory = cats.categorize(parsed.name, store.getState().learned);
    var remaining = conflict.total - conflict.position + 1;

    var body = h('div', {}, [
      h('div', { class: 'compare' }, [
        itemPreview('dupe.existing', existing.name, existing.qty, existing.category,
          store.isPacked(existing)
            ? t('dupe.packed')
            : existing.packedQty > 0
              ? t('dupe.partly', { packed: existing.packedQty, total: existing.qty })
              : t('dupe.notPacked')),
        h('div', { class: 'compare__arrow', 'aria-hidden': 'true', text: '↓' }),
        itemPreview('dupe.new', parsed.name, parsed.qty, newCategory, null)
      ]),
      h('div', { class: 'menu' }, [
        choiceRow('➕', 'dupe.add', 'dupe.addDesc', function () { choose('add'); }),
        choiceRow('🔄', 'dupe.replace', 'dupe.replaceDesc', function () { choose('replace'); }),
        choiceRow('🚫', 'dupe.skip', 'dupe.skipDesc', function () { choose('skip'); })
      ]),
      remaining > 1 ? h('label', { class: 'field', style: 'display:flex;gap:9px;align-items:center;margin:14px 2px 0' }, [
        applyAll = h('input', { type: 'checkbox' }),
        h('span', { text: t('dupe.applyAll') })
      ]) : null
    ]);

    openDialog({
      title: conflict.total > 1
        ? t('dupe.titleCounted', { index: conflict.position, total: conflict.total })
        : t('dupe.title'),
      body: body,
      /* Dismissing the dialog is the safe answer: do not add, carry on. */
      onClose: function () {
        if (answered) return;
        tally.conflictsSeen++;
        tally.skipped++;
        setTimeout(conflict.onDone, 10);
      }
    });
  }

  function choiceRow(icon, labelKey, descKey, onClick) {
    return h('button', {
      class: 'menu__item menu__item--stack', type: 'button', onclick: onClick
    }, [
      h('span', { class: 'menu__icon', text: icon, 'aria-hidden': 'true' }),
      h('span', { class: 'menu__body' }, [
        h('span', { text: t(labelKey) }),
        h('span', { class: 'menu__desc', text: t(descKey) })
      ])
    ]);
  }

  /* ------------------------------------------------------------- dialogs */

  function newListDialog() {
    var chosen = 'blank';
    var lang = i18n.getLang();
    var nameInput = h('input', { class: 'input', type: 'text', id: 'new-list-name',
                                 placeholder: t('new.namePlaceholder'), dir: 'auto' });

    var grid = h('div', { class: 'templates' });
    templates.all.forEach(function (tpl) {
      var name = templates.localized(tpl.name, lang);
      var button = h('button', {
        class: 'template', type: 'button', 'aria-pressed': tpl.id === chosen ? 'true' : 'false',
        onclick: function () {
          chosen = tpl.id;
          Array.prototype.forEach.call(grid.children, function (child) {
            child.setAttribute('aria-pressed', child === button ? 'true' : 'false');
          });
          if (!nameInput.value.trim() && tpl.id !== 'blank') nameInput.value = name;
        }
      }, [
        h('span', { class: 'template__icon', text: tpl.icon, 'aria-hidden': 'true' }),
        h('span', { class: 'template__body' }, [
          h('div', { class: 'template__name', text: name }),
          h('div', { class: 'template__desc', text: templates.localized(tpl.description, lang) })
        ])
      ]);
      grid.appendChild(button);
    });

    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('new.name') }),
        nameInput
      ]),
      h('div', { class: 'field__label', text: t('new.startFrom') }),
      grid
    ]);

    openDialog({
      title: t('new.title'),
      body: body,
      focus: '#new-list-name',
      actions: [
        { label: t('action.cancel') },
        {
          label: t('new.create'), variant: 'primary',
          onClick: function () {
            var tpl = templates.get(chosen);
            var list = store.createList({
              name: nameInput.value.trim() || undefined,
              templateId: chosen,
              icon: tpl ? tpl.icon : undefined
            });
            navigate('#/list/' + list.id);
            toast(list.items.length
              ? t('new.createdWith', { count: plural(list.items.length, 'item') })
              : t('new.created'));
          }
        }
      ]
    });
  }

  function listMenuDialog(listId) {
    var list = store.getList(listId);
    if (!list) return;
    var st = store.stats(list);

    var menu = h('div', { class: 'menu' }, [
      menuEntry('📄', t('menu.duplicate'), function () { duplicateDialog(listId); }),
      menuEntry('✏️', t('menu.rename'), function () { renameDialog(listId); }),
      menuEntry('🔀', t('menu.reorder'), function () {
        /* Reachable from the home screen too, where the list is not open yet. */
        if (ui.route.listId !== listId) {
          navigate('#/list/' + listId);
          setTimeout(function () { ui.reordering = true; renderList(); }, 30);
          return;
        }
        ui.reordering = true;
        renderList();
      }),
      menuEntry('🗂️', t('menu.recategorize'), function () {
        store.recategorize(listId);
        undoable(t('toast.recategorized'));
      }),
      h('div', { class: 'menu__sep' }),
      st.packed < st.total
        ? menuEntry('✅', t('menu.checkAll'), function () {
            store.setAllPacked(listId, true);
            undoable(t('toast.checked'));
          })
        : null,
      st.packed > 0
        ? menuEntry('⬜', t('menu.uncheckAll'), function () {
            store.setAllPacked(listId, false);
            undoable(t('toast.unchecked'));
          })
        : null,
      st.packed > 0
        ? menuEntry('🧹', t('menu.removePacked'), function () {
            confirmDialog({
              title: t('confirm.removePacked.title'),
              message: t('confirm.removePacked.body', { count: plural(st.packed, 'item') }),
              confirmLabel: t('confirm.remove'),
              onConfirm: function () {
                store.removePacked(listId);
                undoable(t('toast.removed', { count: plural(st.packed, 'item') }));
              }
            });
          })
        : null,
      h('div', { class: 'menu__sep' }),
      menuEntry('📤', t('menu.share'), function () { exportDialog(listId); }),
      menuEntry('🖨️', t('menu.print'), function () { global.print(); }),
      h('div', { class: 'menu__sep' }),
      menuEntry('🗑️', t('menu.delete'), function () {
        confirmDialog({
          title: t('confirm.deleteList.title', { name: list.name }),
          message: t('confirm.deleteList.body', { count: plural(st.total, 'item') }),
          onConfirm: function () {
            store.deleteList(listId);
            if (ui.route.listId === listId) navigate('#/');
            undoable(t('toast.listDeleted'));
          }
        });
      }, true)
    ]);

    openDialog({ title: list.name, body: menu });
  }

  function duplicateDialog(listId) {
    var list = store.getList(listId);
    if (!list) return;
    var nameInput = h('input', { class: 'input', type: 'text', id: 'dup-name', dir: 'auto' });
    nameInput.value = list.name + ' (' + t('dup.suffix') + ')';
    var keep = h('input', { type: 'checkbox', id: 'dup-keep' });

    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('dup.name') }),
        nameInput
      ]),
      h('label', { class: 'field', style: 'display:flex;gap:9px;align-items:center' }, [
        keep,
        h('span', { text: t('dup.keep') })
      ]),
      h('p', { class: 'field__hint', style: 'margin:0',
               text: t('dup.hint', { count: plural(list.items.length, 'item') }) })
    ]);

    openDialog({
      title: t('dup.title'),
      body: body,
      focus: '#dup-name',
      actions: [
        { label: t('action.cancel') },
        {
          label: t('dup.action'), variant: 'primary',
          onClick: function () {
            var copy = store.duplicateList(listId, {
              name: nameInput.value.trim() || undefined,
              keepPacked: keep.checked
            });
            navigate('#/list/' + copy.id);
            toast(t('dup.done', { name: copy.name }));
          }
        }
      ]
    });
  }

  function renameDialog(listId) {
    var list = store.getList(listId);
    if (!list) return;
    var chosenIcon = list.icon;
    var nameInput = h('input', { class: 'input', type: 'text', id: 'rename-name', dir: 'auto' });
    nameInput.value = list.name;
    var notes = h('textarea', { class: 'textarea', dir: 'auto',
                                placeholder: t('rename.notesPlaceholder') });
    notes.value = list.notes || '';

    var picker = h('div', { class: 'icon-picker' });
    ICONS.forEach(function (icon) {
      var button = h('button', {
        type: 'button', text: icon, 'aria-label': t('rename.iconAria', { icon: icon }),
        'aria-pressed': icon === chosenIcon ? 'true' : 'false',
        onclick: function () {
          chosenIcon = icon;
          Array.prototype.forEach.call(picker.children, function (child) {
            child.setAttribute('aria-pressed', child === button ? 'true' : 'false');
          });
        }
      });
      picker.appendChild(button);
    });

    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('new.name') }),
        nameInput
      ]),
      h('div', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('rename.icon') }),
        picker
      ]),
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('rename.notes') }),
        notes
      ])
    ]);

    openDialog({
      title: t('rename.title'),
      body: body,
      focus: '#rename-name',
      actions: [
        { label: t('action.cancel') },
        {
          label: t('action.save'), variant: 'primary',
          onClick: function () {
            store.updateList(listId, {
              name: nameInput.value.trim() || list.name,
              icon: chosenIcon,
              notes: notes.value.trim()
            });
            undoable(t('toast.saved'));
          }
        }
      ]
    });
  }

  function itemDialog(listId, itemId) {
    var list = store.getList(listId);
    if (!list) return;
    var item = list.items.filter(function (i) { return i.id === itemId; })[0];
    if (!item) return;

    var nameInput = h('input', { class: 'input', type: 'text', id: 'item-name', dir: 'auto' });
    nameInput.value = item.name;
    var qtyInput = h('input', { class: 'input', type: 'number', min: '1', max: '999',
                                inputmode: 'numeric', dir: 'ltr' });
    qtyInput.value = String(item.qty);
    var packedInput = h('input', { class: 'input', type: 'number', min: '0',
                                   max: String(item.qty), inputmode: 'numeric', dir: 'ltr' });
    packedInput.value = String(item.packedQty);
    qtyInput.addEventListener('input', function () {
      packedInput.max = String(Math.max(1, parseInt(qtyInput.value, 10) || 1));
    });
    /* Built-in categories, plus the ones this list is allowed to use. */
    var offered = cats.all.filter(function (c) {
      if (!c.custom) return true;
      var mine = store.getCategories(listId);
      return mine.some(function (own) { return own.id === c.id; }) || c.id === item.category;
    });
    var select = h('select', { class: 'select' }, offered.map(function (c) {
      return h('option', { value: c.id, text: c.icon + '  ' + cats.label(c.id) });
    }).concat([h('option', { value: '__new__', text: t('cats.newOption') })]));
    select.value = item.category;
    select.addEventListener('change', function () {
      if (select.value !== '__new__') return;
      select.value = item.category;
      newCategoryDialog(listId, function (category) {
        /* Rebuild the options so the new one can be chosen. */
        itemDialog(listId, itemId);
        var reopened = $('dialog-body').querySelector('select');
        if (reopened) reopened.value = category.id;
      });
    });
    var note = h('input', { class: 'input', type: 'text', dir: 'auto',
                            placeholder: t('item.notePlaceholder') });
    note.value = item.note || '';

    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('item.name') }),
        nameInput
      ]),
      h('div', { class: 'row' }, [
        h('label', { class: 'field' }, [
          h('span', { class: 'field__label', text: t('item.qty') }),
          qtyInput
        ]),
        h('label', { class: 'field' }, [
          h('span', { class: 'field__label', text: t('item.packedQty') }),
          packedInput
        ])
      ]),
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('item.category') }),
        select
      ]),
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('item.note') }),
        note
      ]),
      h('p', { class: 'field__hint', style: 'margin:0', text: t('item.learnHint') })
    ]);

    openDialog({
      title: t('item.title'),
      body: body,
      focus: '#item-name',
      actions: [
        {
          label: t('action.delete'), variant: 'danger',
          onClick: function () {
            store.deleteItem(listId, itemId);
            undoable(t('item.removed', { name: item.name }));
          }
        },
        { label: t('action.cancel') },
        {
          label: t('action.save'), variant: 'primary',
          onClick: function () {
            var name = nameInput.value.trim() || item.name;
            var qty = Math.max(1, Math.min(999, parseInt(qtyInput.value, 10) || 1));
            store.updateItem(listId, itemId, { name: name, qty: qty, note: note.value.trim() });
            store.setPackedQty(listId, itemId, parseInt(packedInput.value, 10) || 0);
            if (select.value !== item.category) {
              store.setItemCategory(listId, itemId, select.value);
            }
            undoable(t('toast.saved'));
          }
        }
      ]
    });
  }

  /*
   * listId is the list the category is being made for. The dialog offers to
   * keep it to that list or to share it with all of them; either way the list
   * it was made from ends up with it.
   */
  function newCategoryDialog(listId, onCreated) {
    var list = listId ? store.getList(listId) : null;
    var scope = h('select', { class: 'select' }, [
      list ? h('option', { value: 'list', text: t('cats.scopeList', { name: list.name }) }) : null,
      h('option', { value: 'all', text: t('cats.scopeAll') })
    ].filter(Boolean));

    var chosenIcon = CATEGORY_ICONS[0];
    var nameInput = h('input', {
      class: 'input', type: 'text', id: 'cat-name', dir: 'auto',
      placeholder: t('cats.namePlaceholder')
    });

    var picker = h('div', { class: 'icon-picker' });
    CATEGORY_ICONS.forEach(function (icon) {
      var button = h('button', {
        type: 'button', text: icon, 'aria-label': t('rename.iconAria', { icon: icon }),
        'aria-pressed': icon === chosenIcon ? 'true' : 'false',
        onclick: function () {
          chosenIcon = icon;
          Array.prototype.forEach.call(picker.children, function (child) {
            child.setAttribute('aria-pressed', child === button ? 'true' : 'false');
          });
        }
      });
      picker.appendChild(button);
    });

    openDialog({
      title: t('cats.add'),
      focus: '#cat-name',
      body: h('div', {}, [
        h('label', { class: 'field' }, [
          h('span', { class: 'field__label', text: t('cats.name') }),
          nameInput
        ]),
        h('div', { class: 'field' }, [
          h('span', { class: 'field__label', text: t('cats.icon') }),
          picker
        ]),
        h('label', { class: 'field' }, [
          h('span', { class: 'field__label', text: t('cats.scope') }),
          scope
        ])
      ]),
      actions: [
        { label: t('action.cancel') },
        {
          label: t('cats.create'), variant: 'primary',
          onClick: function () {
            var onlyHere = scope.value === 'list' && list;
            var category = store.addCategory(nameInput.value, chosenIcon,
              onlyHere ? list.id : null);
            if (!category) return false;
            undoable(onlyHere ? t('cats.addedTo', { name: list.name })
                               : t('cats.addedEverywhere'));
            if (onCreated) setTimeout(function () { onCreated(category); }, 10);
          }
        }
      ]
    });
  }

  function categoriesDialog() {
    var mine = store.getCategories();
    var openList = ui.route.view === 'list' ? store.getList(ui.route.listId) : null;
    var counts = {};
    store.getLists().forEach(function (list) {
      list.items.forEach(function (item) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });
    });

    var rows = mine.map(function (category) {
      return h('div', { class: 'menu__item menu__item--stack' }, [
        h('span', { class: 'menu__icon', text: category.icon, 'aria-hidden': 'true' }),
        h('span', { class: 'menu__body' }, [
          h('span', { text: category.label, dir: 'auto' }),
          h('span', { class: 'menu__desc', text: scopeLabel(category) + ' · ' +
                      t('cats.itemCount', { count: counts[category.id] || 0 }) })
        ]),
        h('button', {
          class: 'icon-btn', type: 'button', text: '✏️',
          'aria-label': t('menu.rename'),
          onclick: function () { renameCategoryDialog(category); }
        }),
        h('button', {
          class: 'icon-btn', type: 'button', text: '🗑️',
          'aria-label': t('action.delete'),
          onclick: function () {
            confirmDialog({
              title: t('cats.deleteTitle', { name: category.label }),
              message: t('cats.deleteBody'),
              onConfirm: function () {
                store.deleteCategory(category.id);
                undoable(t('cats.deleted'));
              }
            });
          }
        })
      ]);
    });

    openDialog({
      title: t('cats.title'),
      body: h('div', {}, [
        h('div', { class: 'field__label', text: t('cats.yours') }),
        mine.length
          ? h('div', { class: 'menu' }, rows)
          : h('p', { class: 'field__hint', style: 'margin:0 0 12px', text: t('cats.none') }),
        h('div', { class: 'menu' }, [
          menuEntry('➕', t('cats.add'), function () {
            newCategoryDialog(openList ? openList.id : null, function () {
              categoriesDialog();
            });
          })
        ]),
        h('p', { class: 'field__hint', style: 'margin:10px 2px 0',
                 text: t('cats.builtIn', { count: cats.all.length - mine.length }) })
      ]),
      actions: [{ label: t('action.close') }]
    });
  }

  /* "only in Copenhagen" / "in all lists", for the manager's rows. */
  function scopeLabel(category) {
    if (!category.listId) return t('cats.scopeAllShort');
    var list = store.getList(category.listId);
    return t('cats.scopeListShort', { name: list ? list.name : '…' });
  }

  function renameCategoryDialog(category) {
    var nameInput = h('input', { class: 'input', type: 'text', id: 'cat-rename', dir: 'auto' });
    nameInput.value = category.label;
    var chosenIcon = category.icon;

    var picker = h('div', { class: 'icon-picker' });
    CATEGORY_ICONS.forEach(function (icon) {
      var button = h('button', {
        type: 'button', text: icon, 'aria-label': t('rename.iconAria', { icon: icon }),
        'aria-pressed': icon === chosenIcon ? 'true' : 'false',
        onclick: function () {
          chosenIcon = icon;
          Array.prototype.forEach.call(picker.children, function (child) {
            child.setAttribute('aria-pressed', child === button ? 'true' : 'false');
          });
        }
      });
      picker.appendChild(button);
    });

    var owner = category.listId ? store.getList(category.listId) : null;
    var scope = h('select', { class: 'select' }, [
      owner ? h('option', { value: 'list', text: t('cats.scopeList', { name: owner.name }) }) : null,
      h('option', { value: 'all', text: t('cats.scopeAll') })
    ].filter(Boolean));
    scope.value = category.listId ? 'list' : 'all';

    openDialog({
      title: t('menu.rename'),
      focus: '#cat-rename',
      body: h('div', {}, [
        h('label', { class: 'field' }, [
          h('span', { class: 'field__label', text: t('cats.name') }),
          nameInput
        ]),
        h('div', { class: 'field' }, [
          h('span', { class: 'field__label', text: t('cats.icon') }),
          picker
        ]),
        h('label', { class: 'field' }, [
          h('span', { class: 'field__label', text: t('cats.scope') }),
          scope
        ])
      ]),
      actions: [
        { label: t('action.cancel'), onClick: function () { setTimeout(categoriesDialog, 10); } },
        {
          label: t('action.save'), variant: 'primary',
          onClick: function () {
            store.updateCategory(category.id, {
              label: nameInput.value, icon: chosenIcon,
              listId: scope.value === 'list' && owner ? owner.id : null
            });
            undoable(t('toast.saved'));
            setTimeout(categoriesDialog, 10);
          }
        }
      ]
    });
  }

  function bulkAddDialog(listId) {
    var area = h('textarea', {
      class: 'textarea', id: 'bulk-area', dir: 'auto', rows: '8',
      placeholder: t('bulk.placeholder')
    });
    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('bulk.label') }),
        area,
        h('span', { class: 'field__hint', text: t('bulk.hint') })
      ])
    ]);

    openDialog({
      title: t('bulk.title'),
      body: body,
      focus: '#bulk-area',
      actions: [
        { label: t('action.cancel') },
        {
          label: t('bulk.action'), variant: 'primary',
          onClick: function () {
            var lines = area.value.split('\n').map(function (l) { return l.trim(); })
              .filter(Boolean);
            if (!lines.length) return false;
            closeDialog();
            setTimeout(function () { addLines(listId, lines); }, 10);
          }
        }
      ]
    });
  }

  function exportDialog(listId) {
    var list = listId ? store.getList(listId) : null;
    var name = list ? slug(list.name) : 'packmeup-all-lists';

    var menu = h('div', { class: 'menu' }, [
      list ? menuEntry('📋', t('export.copyText'), function () {
        copyText(store.listToText(listId))
          .then(function () { toast(t('export.copied')); })
          .catch(function () { toast(t('export.copyFailed')); });
      }) : null,
      list ? menuEntry('📝', t('export.downloadText'), function () {
        download(name + '.txt', store.listToText(listId), 'text/plain');
        toast(t('export.downloaded'));
      }) : null,
      menuEntry('💾', list ? t('export.downloadJson') : t('export.downloadJsonAll'), function () {
        download(name + '.json', list ? store.exportList(listId) : store.exportAll());
        toast(t('export.downloaded'));
      }),
      h('div', { class: 'menu__sep' }),
      h('p', { class: 'field__hint', style: 'margin:0 12px', text: t('export.hint') })
    ]);

    openDialog({
      title: list ? t('export.title', { name: list.name }) : t('export.titleAll'),
      body: menu
    });
  }

  /* Plain text with several lines and no JSON punctuation around it. */
  function looksLikeNote(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed || trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') return false;
    return notes.parse(trimmed).lines.length > 1;
  }

  function importDialog() {
    var file = h('input', { class: 'input', type: 'file', accept: '.json,application/json' });
    var area = h('textarea', { class: 'textarea', placeholder: t('import.pastePlaceholder') });

    function run(text) {
      try {
        var summary = store.importJSON(text);
        closeDialog();
        toast(summary.merged
          ? t('import.doneMerged', {
              count: plural(summary.lists, 'list'), merged: summary.merged
            })
          : t('import.done', { count: plural(summary.lists, 'list') }));
      } catch (err) {
        /* A pasted note is the likeliest mistake here - hand it to the
           importer that can actually read it, rather than refusing. */
        if (looksLikeNote(text)) {
          closeDialog();
          toast(t('import.looksLikeNote'));
          setTimeout(function () { noteImportDialog({ text: text }); }, 400);
          return;
        }
        toast(err.message || t('import.failed'));
      }
    }

    file.addEventListener('change', function () {
      var chosen = file.files && file.files[0];
      if (!chosen) return;
      var reader = new FileReader();
      reader.onload = function () { run(String(reader.result)); };
      reader.readAsText(chosen);
    });

    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('import.file') }),
        file
      ]),
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('import.paste') }),
        area
      ]),
      h('p', { class: 'field__hint', style: 'margin:0', text: t('import.hint') })
    ]);

    openDialog({
      title: t('import.title'),
      body: body,
      actions: [
        { label: t('action.cancel') },
        {
          label: t('import.action'), variant: 'primary', close: false,
          onClick: function () {
            if (!area.value.trim()) { toast(t('import.needFile')); return false; }
            run(area.value);
            return false;
          }
        }
      ]
    });
  }

  /*
   * Bringing a list in from another app - Google Keep in particular, which has
   * no API for personal accounts. The note arrives as text: pasted here, or
   * handed over by Android's share sheet (see the share_target in the
   * manifest, which opens the app with the note in the URL).
   */
  function noteImportDialog(prefill) {
    var lists = store.getLists();
    var area = h('textarea', {
      class: 'textarea', id: 'note-area', dir: 'auto', rows: '8',
      placeholder: t('note.placeholder')
    });
    area.value = prefill && prefill.text ? prefill.text : '';

    var nameInput = h('input', { class: 'input', type: 'text', id: 'note-name', dir: 'auto' });
    var targetSelect = h('select', { class: 'select' }, [
      h('option', { value: 'new', text: t('note.newList') })
    ].concat(lists.length ? [h('option', { value: 'existing', text: t('note.existingList') })] : []));

    var listSelect = h('select', { class: 'select' }, lists.map(function (list) {
      return h('option', { value: list.id, text: list.icon + '  ' + list.name });
    }));

    var newField = h('label', { class: 'field' }, [
      h('span', { class: 'field__label', text: t('note.listName') }),
      nameInput
    ]);
    var existingField = h('label', { class: 'field' }, [
      h('span', { class: 'field__label', text: t('note.existingList') }),
      listSelect
    ]);
    existingField.hidden = true;

    var preview = h('p', { class: 'field__hint', id: 'note-preview', style: 'margin:0 0 14px' });

    function readNote() {
      return notes.parse(area.value);
    }

    function refresh() {
      var note = readNote();
      var packed = notes.packedCount(note.lines);
      if (!note.lines.length) {
        preview.textContent = t('note.previewNone');
      } else if (packed) {
        preview.textContent = t('note.preview', {
          items: plural(note.lines.length, 'item'), packed: packed
        });
      } else {
        preview.textContent = t('note.previewPlain', { items: plural(note.lines.length, 'item') });
      }
      /* A note with a heading names the new list after it. */
      if (note.title && !nameInput.dataset.touched) nameInput.value = note.title;
    }

    area.addEventListener('input', refresh);
    nameInput.addEventListener('input', function () { nameInput.dataset.touched = '1'; });
    targetSelect.addEventListener('change', function () {
      var toNew = targetSelect.value === 'new';
      newField.hidden = !toNew;
      existingField.hidden = toNew;
    });

    if (prefill && prefill.title) {
      nameInput.value = prefill.title;
      nameInput.dataset.touched = '1';
    }

    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('note.paste') }),
        area,
        h('span', { class: 'field__hint', text: t('note.hint') })
      ]),
      preview,
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('note.target') }),
        targetSelect
      ]),
      newField,
      existingField,
      h('p', { class: 'field__hint', style: 'margin:0', text: t('note.shareHint') })
    ]);

    refresh();

    openDialog({
      title: t('note.title'),
      body: body,
      focus: prefill && prefill.text ? '#note-name' : '#note-area',
      actions: [
        { label: t('action.cancel') },
        {
          label: t('note.action'), variant: 'primary',
          onClick: function () {
            var note = readNote();
            if (!note.lines.length) { toast(t('note.empty')); return false; }

            var listId;
            if (targetSelect.value === 'existing' && listSelect.value) {
              listId = listSelect.value;
            } else {
              listId = store.createList({
                name: nameInput.value.trim() || note.title || undefined,
                templateId: 'blank'
              }).id;
            }
            closeDialog();
            navigate('#/list/' + listId);
            setTimeout(function () { addLines(listId, note.lines); }, 10);
            return false;
          }
        }
      ]
    });
  }

  /* Android hands a shared note over in the query string - see the manifest. */
  function sharedNote() {
    var params = new URLSearchParams(global.location.search);
    var text = params.get('text') || '';
    var title = params.get('title') || '';
    if (!text && !title) return null;
    /* Do not import the same note again on a refresh. */
    global.history.replaceState({}, '', global.location.pathname + global.location.hash);
    return { text: text || title, title: text ? title : '' };
  }

  /* ------------------------------------------------------------ syncing */

  function driveDialog() {
    var idInput = h('input', {
      class: 'input', type: 'text', id: 'drive-id', dir: 'ltr',
      placeholder: t('drive.clientIdPlaceholder')
    });
    idInput.value = drive.clientId();

    var auto = h('input', { type: 'checkbox' });
    auto.checked = !!store.getSetting('driveAuto');
    auto.addEventListener('change', function () {
      store.setSetting('driveAuto', auto.checked);
    });

    var status = h('p', { class: 'field__hint', style: 'margin:0 0 14px' });
    function showStatus(text) {
      if (text) { status.textContent = text; return; }
      var when = drive.lastSync();
      status.textContent = !drive.connected()
        ? t('drive.status.off')
        : when ? t('drive.status.at', { when: relativeDate(when) }) : t('drive.status.never');
    }
    showStatus();

    function run(interactive) {
      var wasConnected = drive.connected();
      showStatus(t('drive.syncing'));
      drive.sync({ interactive: interactive }).then(function (result) {
        var merged = result.summary && result.summary.merged;
        toast(merged ? t('drive.syncedMerged', { merged: merged }) : t('drive.synced'));
        render();
        /* Connecting for the first time changes which actions belong here. */
        if (!wasConnected) driveDialog();
        else showStatus();
      }).catch(function (err) {
        showStatus();
        toast(err.message || t('drive.failed'));
      });
    }

    /* These rows act inside the open dialog, so the status can update in place. */
    function actionRow(icon, label, onClick) {
      return h('button', { class: 'menu__item', type: 'button', onclick: onClick }, [
        h('span', { class: 'menu__icon', text: icon, 'aria-hidden': 'true' }),
        h('span', { text: label })
      ]);
    }

    var body = h('div', {}, [
      h('p', { style: 'margin-top:0;color:var(--text-muted)', text: t('drive.what') }),
      status,
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: t('drive.clientId') }),
        idInput
      ]),
      h('label', { class: 'field', style: 'display:flex;gap:9px;align-items:center' }, [
        auto,
        h('span', { text: t('drive.auto') })
      ]),
      h('div', { class: 'menu' }, [
        actionRow('☁️', drive.connected() ? t('drive.syncNow') : t('drive.connect'), function () {
          drive.setClientId(idInput.value);
          if (!drive.configured()) { toast(t('drive.noClientId')); return; }
          run(!drive.connected());
        }),
        drive.connected() ? actionRow('🔌', t('drive.disconnect'), function () {
          drive.disconnect();
          toast(t('drive.status.off'));
          driveDialog();
        }) : null
      ]),
      h('div', { class: 'menu__sep' }),
      h('div', { class: 'field__label', text: t('drive.setupTitle') }),
      h('p', { class: 'field__hint', style: 'margin:0 0 8px',
               text: t('drive.setupBody', { origin: global.location.origin }) }),
      h('p', { class: 'field__hint', style: 'margin:0', text: t('drive.setupWarning') })
    ]);

    openDialog({
      title: t('drive.title'),
      body: body,
      actions: [{
        label: t('drive.save'), variant: 'primary',
        onClick: function () { drive.setClientId(idInput.value); toast(t('toast.saved')); }
      }]
    });
  }

  /* A quiet sync in the background, once the dust settles after a change. */
  var autoSyncTimer = null;
  function scheduleAutoSync() {
    if (!drive.configured() || !drive.connected() || !store.getSetting('driveAuto')) return;
    if (autoSyncTimer) clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(function () {
      drive.sync({ interactive: false }).then(function (result) {
        if (result.summary && result.summary.merged) render();
      }).catch(function () { /* the menu shows the state; no toast for a quiet try */ });
    }, 8000);
  }

  /*
   * A row that stays in place instead of closing the menu, so pressing it
   * repeatedly walks back through up to three steps of history without
   * having to reopen the menu each time. It disappears once there is
   * nothing left to undo.
   */
  function undoRow() {
    if (!store.canUndo()) return null;
    return h('button', {
      class: 'menu__item menu__item--stack', type: 'button',
      onclick: function () {
        performUndo();
        renderAppMenu();
      }
    }, [
      h('span', { class: 'menu__icon', text: '↩️', 'aria-hidden': 'true' }),
      h('span', { class: 'menu__body' }, [
        h('span', { text: t('menu.undo', { label: store.peekUndo() }), dir: 'auto' }),
        h('span', { class: 'menu__desc', text: plural(store.undoCount(), 'step') })
      ])
    ]);
  }

  /* Rebuilds the app menu's contents in place, so undoRow() can refresh
     itself (new label, lower count, or gone entirely) without the whole
     dialog visibly closing and reopening. */
  function renderAppMenu() {
    var body = $('dialog-body');
    if (!body || !dialog.open) return;
    clear(body);
    body.appendChild(appMenuBody());
  }

  function appMenuBody() {
    var theme = store.getSetting('theme') || 'system';
    var undo = undoRow();
    return h('div', { class: 'menu' }, [
      menuEntry('➕', t('menu.newList'), newListDialog),
      menuEntry('🗂️', t('cats.menu'), categoriesDialog),
      menuEntry('☁️', t('drive.menu'), driveDialog),
      menuEntry('📋', t('note.menu'), function () { noteImportDialog(null); }),
      menuEntry('📥', t('menu.import'), importDialog),
      menuEntry('💾', t('menu.exportAll'), function () { exportDialog(null); }),
      undo ? h('div', { class: 'menu__sep' }) : null,
      undo,
      h('div', { class: 'menu__sep' }),
      menuEntry('🌐', t('menu.language', { language: i18n.meta().label }), languageDialog),
      menuEntry('◐', t('menu.theme', { theme: t('theme.' + theme) }), cycleTheme),
      menuEntry('ℹ️', t('menu.about'), aboutDialog)
    ]);
  }

  function appMenuDialog() {
    openDialog({ title: t('app.name'), body: appMenuBody() });
  }

  function aboutDialog() {
    var lists = store.getLists();
    var items = lists.reduce(function (sum, l) { return sum + l.items.length; }, 0);
    var body = h('div', {}, [
      h('p', { style: 'margin-top:0;color:var(--text-muted)', text: t('about.p1') }),
      h('p', { style: 'color:var(--text-muted)', text: t('about.p2') }),
      h('p', { class: 'field__hint', text: t('about.stats', {
        lists: plural(lists.length, 'list'), items: plural(items, 'item')
      }) }),
      store.storageAvailable() ? null : h('p', {
        style: 'color:var(--danger)', text: t('about.noStorage')
      })
    ]);
    openDialog({
      title: t('about.title'), body: body, actions: [{ label: t('action.close') }]
    });
  }

  /* -------------------------------------------------------------- render */

  function render() {
    var onList = ui.route.view === 'list';
    $('view-home').hidden = onList;
    $('view-list').hidden = !onList;
    $('back-btn').hidden = !onList;
    if (onList) {
      renderList();
    } else {
      $('topbar-title').textContent = t('app.name');
      renderHome();
    }
  }

  /* --------------------------------------------------------------- wiring */

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments, self = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function wire() {
    $('new-list-btn').addEventListener('click', newListDialog);
    $('app-menu-btn').addEventListener('click', appMenuDialog);
    $('theme-btn').addEventListener('click', cycleTheme);
    $('back-btn').addEventListener('click', function () { navigate('#/'); });

    $('home-search').addEventListener('input', debounce(function (event) {
      ui.homeQuery = event.target.value.trim();
      renderHome();
    }, 120));

    $('list-search').addEventListener('input', debounce(function (event) {
      ui.listQuery = event.target.value.trim();
      renderList();
    }, 120));

    each('.chip[data-filter]', function (chip) {
      chip.addEventListener('click', function () {
        ui.listFilter = chip.dataset.filter;
        renderList();
      });
    });

    $('add-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var input = $('add-input');
      var value = input.value.trim();
      if (!value || ui.route.view !== 'list') return;
      /* several items at once if the text was pasted with commas or newlines */
      var lines = value.split(/[\n,]+/).map(function (l) { return l.trim(); }).filter(Boolean);
      input.value = '';
      input.focus();
      addLines(ui.route.listId, lines);
    });

    $('bulk-btn').addEventListener('click', function () {
      if (ui.route.view === 'list') bulkAddDialog(ui.route.listId);
    });

    global.addEventListener('hashchange', onRouteChange);

    global.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if ((store.getSetting('theme') || 'system') === 'system') applyTheme();
    });

    /* keyboard shortcuts on desktop */
    document.addEventListener('keydown', function (event) {
      if (event.defaultPrevented || dialog.open) return;
      var tag = (event.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (event.key === 'Escape' && typing) { event.target.blur(); return; }
      if (typing) return;
      if (event.key === 'n' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        newListDialog();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        performUndo();
      } else if (event.key === '/') {
        event.preventDefault();
        (ui.route.view === 'list' ? $('list-search') : $('home-search')).focus();
      } else if (event.key === 'Escape' && ui.route.view === 'list') {
        navigate('#/');
      }
    });

    /* Another tab changed the data - pick it up. */
    global.addEventListener('storage', function (event) {
      if (event.key && event.key.indexOf('packmeup') === 0) {
        store.load();
        startLanguage();
        applyLanguage();
        render();
      }
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in global.navigator)) return;
    if (global.location.protocol !== 'http:' && global.location.protocol !== 'https:') return;
    global.addEventListener('load', function () {
      global.navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache is optional */ });
    });
  }

  /* Saved choice first, otherwise the language of the device. */
  function startLanguage() {
    var saved = store.getSetting('lang');
    i18n.setLang(saved && i18n.has(saved) ? saved : i18n.detect());
  }

  function start() {
    store.load();
    startLanguage();
    applyLanguage();
    wire();
    store.subscribe(render);
    store.subscribe(scheduleAutoSync);
    ui.route = parseHash();
    if (ui.route.view === 'list' && !store.getList(ui.route.listId)) {
      ui.route = { view: 'home', listId: null };
    }
    render();
    registerServiceWorker();

    var shared = sharedNote();
    if (shared) setTimeout(function () { noteImportDialog(shared); }, 60);

    /* Pick up whatever the other device left, without asking. */
    if (drive.configured() && drive.connected() && store.getSetting('driveAuto')) {
      setTimeout(function () {
        drive.sync({ interactive: false }).catch(function () {});
      }, 1200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
