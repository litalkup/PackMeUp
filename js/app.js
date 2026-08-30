/*
 * PackMeUp - UI layer.
 *
 * Two views (all lists / one list) driven by the hash, rendered from the
 * store. No framework, no build step: open index.html and it runs.
 */
(function (global) {
  'use strict';

  var store = global.PMU.store;
  var cats = global.PMU.categories;
  var templates = global.PMU.templates;

  var ICONS = ['🧳', '✈️', '🪖', '⛺', '🏖️', '💼', '🏋️', '🧸', '🚗', '🚲', '🎒',
               '🏔️', '🛶', '🎿', '🎪', '🎓', '🏥', '🏡', '🎉', '📦'];

  var THEMES = ['system', 'light', 'dark'];

  var ui = {
    route: { view: 'home', listId: null },
    listFilter: 'all',
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
        else if (key === 'html') node.innerHTML = value;
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

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  function relativeDate(iso) {
    var then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    var days = Math.floor((Date.now() - then) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return days + ' days ago';
    if (days < 30) return Math.floor(days / 7) + 'w ago';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
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

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'list';
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

  function undoable(message) {
    toast(message, {
      label: 'Undo',
      onClick: function () {
        store.undo();
        toast('Undone');
      }
    });
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
        { label: 'Cancel' },
        {
          label: options.confirmLabel || 'Delete',
          variant: options.variant || 'danger',
          onClick: options.onConfirm
        }
      ]
    });
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
    $('theme-btn').title = 'Theme: ' + choice + ' (tap to change)';
  }

  function cycleTheme() {
    var current = store.getSetting('theme') || 'system';
    var next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    store.setSetting('theme', next);
    applyTheme();
    toast('Theme: ' + next);
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
      ? plural(lists.length, 'match', 'matches')
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
        h('h2', { text: 'Nothing matches “' + ui.homeQuery + '”' }),
        h('p', { text: 'Try a different word, or start a new list.' })
      ]));
    } else {
      empty.hidden = true;
    }
  }

  function emptyHomeState() {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'empty__emoji', text: '🧳' }),
      h('h2', { text: 'No lists yet' }),
      h('p', { text: 'Start from a ready-made template — a trip abroad, reserve duty, ' +
                     'camping — or build your own from scratch. Everything you add sorts ' +
                     'itself into categories.' }),
      h('button', {
        class: 'btn btn--primary', type: 'button', text: '+ New list',
        onclick: newListDialog
      })
    ]);
  }

  function listCard(list) {
    var st = store.stats(list);
    var done = st.total > 0 && st.remaining === 0;

    var card = h('div', {
      class: 'card' + (done ? ' card--done' : ''),
      role: 'button', tabindex: '0',
      'aria-label': list.name + ', ' + st.packed + ' of ' + st.total + ' packed',
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
            ? plural(st.total, 'item') + ' · ' + plural(store.groupByCategory(list.items).length, 'category', 'categories')
            : 'Empty list' })
        ]),
        h('button', {
          class: 'icon-btn card__menu', type: 'button', 'aria-label': 'Options for ' + list.name,
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
        h('span', { class: 'badge' + (done ? ' badge--done' : ''),
                    text: done ? '✓ All packed' : st.packed + ' / ' + st.total + ' packed' }),
        h('span', { text: 'updated ' + relativeDate(list.updatedAt) })
      ])
    ]);
    return card;
  }

  /* ----------------------------------------------------------- list view */

  function visibleItems(list) {
    var q = ui.listQuery.toLowerCase();
    return list.items.filter(function (item) {
      if (ui.listFilter === 'todo' && item.packed) return false;
      if (ui.listFilter === 'packed' && !item.packed) return false;
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
        ? 'Everything is packed 🎉'
        : plural(st.remaining, 'item') + ' still to pack · ' + plural(st.total, 'item') + ' total'
      : 'Nothing here yet';
    $('list-pct').textContent = st.percent + '%';
    $('list-progress').setAttribute('aria-valuenow', String(st.percent));
    $('list-progress-bar').style.width = st.percent + '%';
    $('list-progress').classList.toggle('progress--done', st.total > 0 && st.remaining === 0);

    Array.prototype.forEach.call(document.querySelectorAll('.chip[data-filter]'), function (chip) {
      chip.setAttribute('aria-pressed', chip.dataset.filter === ui.listFilter ? 'true' : 'false');
    });

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
      empty.appendChild(listEmptyState(list, st));
    } else {
      empty.hidden = true;
    }
  }

  function listEmptyState(list, st) {
    if (!st.total) {
      return h('div', { class: 'empty' }, [
        h('div', { class: 'empty__emoji', text: '📝' }),
        h('h2', { text: 'Empty list' }),
        h('p', { text: 'Add items in the box below. Type “3 x socks” to set a quantity — ' +
                       'each item lands in the right category by itself.' })
      ]);
    }
    if (ui.listQuery) {
      return h('div', { class: 'empty' }, [
        h('div', { class: 'empty__emoji', text: '🔍' }),
        h('h2', { text: 'No items match “' + ui.listQuery + '”' })
      ]);
    }
    if (ui.listFilter === 'todo') {
      return h('div', { class: 'empty' }, [
        h('div', { class: 'empty__emoji', text: '🎉' }),
        h('h2', { text: 'Nothing left to pack' }),
        h('p', { text: 'Every item on this list is ticked off. Safe travels!' })
      ]);
    }
    return h('div', { class: 'empty' }, [
      h('div', { class: 'empty__emoji', text: '📦' }),
      h('h2', { text: 'Nothing packed yet' }),
      h('p', { text: 'Tick items off as they go into the bag and they will show up here.' })
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
    var packed = group.items.filter(function (i) { return i.packed; }).length;
    var allPacked = packed === group.items.length;
    var collapsed = isCollapsed(list.id, group.category.id);

    var section = h('section', {
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
        h('span', { class: 'group__name', text: group.category.label }),
        h('span', { class: 'group__count', text: packed + '/' + group.items.length }),
        h('span', { class: 'group__chevron', text: '▾', 'aria-hidden': 'true' })
      ]),
      h('ul', { class: 'items' }, group.items.map(function (item) {
        return itemRow(list, item);
      }))
    ]);
    return section;
  }

  function itemRow(list, item) {
    return h('li', { class: 'item' + (item.packed ? ' item--packed' : '') }, [
      h('button', {
        class: 'check', type: 'button', role: 'checkbox',
        'aria-checked': item.packed ? 'true' : 'false',
        'aria-label': (item.packed ? 'Unpack ' : 'Pack ') + item.name,
        text: '✓',
        onclick: function () {
          store.toggleItem(list.id, item.id);
        }
      }),
      h('button', {
        class: 'item__body', type: 'button',
        'aria-label': 'Edit ' + item.name,
        onclick: function () { itemDialog(list.id, item.id); }
      }, [
        h('span', { class: 'item__name', text: item.name, dir: 'auto' }),
        item.qty > 1 ? h('span', { class: 'item__qty', text: '×' + item.qty }) : null,
        item.note ? h('span', { class: 'item__note', text: item.note, dir: 'auto' }) : null
      ])
    ]);
  }

  /* ------------------------------------------------------------- dialogs */

  function newListDialog() {
    var chosen = 'blank';
    var nameInput = h('input', { class: 'input', type: 'text', id: 'new-list-name',
                                 placeholder: 'e.g. Greece, August', dir: 'auto' });

    var grid = h('div', { class: 'templates' });
    templates.forEach(function (tpl) {
      var button = h('button', {
        class: 'template', type: 'button', 'aria-pressed': tpl.id === chosen ? 'true' : 'false',
        onclick: function () {
          chosen = tpl.id;
          Array.prototype.forEach.call(grid.children, function (child) {
            child.setAttribute('aria-pressed', child === button ? 'true' : 'false');
          });
          if (!nameInput.value.trim() && tpl.id !== 'blank') nameInput.value = tpl.name;
        }
      }, [
        h('span', { class: 'template__icon', text: tpl.icon, 'aria-hidden': 'true' }),
        h('span', { class: 'template__body' }, [
          h('div', { class: 'template__name', text: tpl.name }),
          h('div', { class: 'template__desc', text: tpl.description })
        ])
      ]);
      grid.appendChild(button);
    });

    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'List name' }),
        nameInput
      ]),
      h('div', { class: 'field__label', text: 'Start from' }),
      grid
    ]);

    openDialog({
      title: 'New packing list',
      body: body,
      focus: '#new-list-name',
      actions: [
        { label: 'Cancel' },
        {
          label: 'Create list', variant: 'primary',
          onClick: function () {
            var tpl = templates.filter(function (t) { return t.id === chosen; })[0];
            var list = store.createList({
              name: nameInput.value.trim() || undefined,
              templateId: chosen,
              icon: tpl ? tpl.icon : undefined
            });
            navigate('#/list/' + list.id);
            toast(list.items.length
              ? 'Created with ' + plural(list.items.length, 'item')
              : 'List created');
          }
        }
      ]
    });
  }

  function listMenuDialog(listId) {
    var list = store.getList(listId);
    if (!list) return;
    var st = store.stats(list);

    function entry(icon, label, onClick, danger) {
      return h('button', {
        class: 'menu__item' + (danger ? ' menu__item--danger' : ''), type: 'button',
        onclick: function () { closeDialog(); setTimeout(onClick, 10); }
      }, [
        h('span', { class: 'menu__icon', text: icon, 'aria-hidden': 'true' }),
        h('span', { text: label })
      ]);
    }

    var menu = h('div', { class: 'menu' }, [
      entry('📄', 'Duplicate this list', function () { duplicateDialog(listId); }),
      entry('✏️', 'Rename & change icon', function () { renameDialog(listId); }),
      entry('🗂️', 'Re-sort into categories', function () {
        store.recategorize(listId);
        undoable('Categories refreshed');
      }),
      h('div', { class: 'menu__sep' }),
      st.packed < st.total
        ? entry('✅', 'Mark everything packed', function () {
            store.setAllPacked(listId, true);
            undoable('Everything checked');
          })
        : null,
      st.packed > 0
        ? entry('⬜', 'Uncheck everything', function () {
            store.setAllPacked(listId, false);
            undoable('Everything unchecked');
          })
        : null,
      st.packed > 0
        ? entry('🧹', 'Remove packed items', function () {
            confirmDialog({
              title: 'Remove packed items?',
              message: plural(st.packed, 'item') + ' will be removed from this list.',
              confirmLabel: 'Remove',
              onConfirm: function () {
                store.removePacked(listId);
                undoable(plural(st.packed, 'item') + ' removed');
              }
            });
          })
        : null,
      h('div', { class: 'menu__sep' }),
      entry('📤', 'Share or export', function () { exportDialog(listId); }),
      entry('🖨️', 'Print this list', function () { global.print(); }),
      h('div', { class: 'menu__sep' }),
      entry('🗑️', 'Delete list', function () {
        confirmDialog({
          title: 'Delete “' + list.name + '”?',
          message: 'The list and its ' + plural(st.total, 'item') + ' will be removed. You can undo this straight after.',
          onConfirm: function () {
            store.deleteList(listId);
            if (ui.route.listId === listId) navigate('#/');
            undoable('List deleted');
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
    nameInput.value = list.name + ' (copy)';
    var keep = h('input', { type: 'checkbox', id: 'dup-keep' });

    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'Name of the copy' }),
        nameInput
      ]),
      h('label', { class: 'field', style: 'display:flex;gap:9px;align-items:center' }, [
        keep,
        h('span', { text: 'Keep the ticks — copy what is already packed' })
      ]),
      h('p', { class: 'field__hint', style: 'margin:0',
               text: 'All ' + plural(list.items.length, 'item') + ' and their categories are copied.' })
    ]);

    openDialog({
      title: 'Duplicate list',
      body: body,
      focus: '#dup-name',
      actions: [
        { label: 'Cancel' },
        {
          label: 'Duplicate', variant: 'primary',
          onClick: function () {
            var copy = store.duplicateList(listId, {
              name: nameInput.value.trim() || undefined,
              keepPacked: keep.checked
            });
            navigate('#/list/' + copy.id);
            toast('Copied to “' + copy.name + '”');
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
                                placeholder: 'Flight at 06:40, bag drop closes 05:40…' });
    notes.value = list.notes || '';

    var picker = h('div', { class: 'icon-picker' });
    ICONS.forEach(function (icon) {
      var button = h('button', {
        type: 'button', text: icon, 'aria-label': 'Icon ' + icon,
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
        h('span', { class: 'field__label', text: 'List name' }),
        nameInput
      ]),
      h('div', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'Icon' }),
        picker
      ]),
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'Notes (optional)' }),
        notes
      ])
    ]);

    openDialog({
      title: 'Rename list',
      body: body,
      focus: '#rename-name',
      actions: [
        { label: 'Cancel' },
        {
          label: 'Save', variant: 'primary',
          onClick: function () {
            store.updateList(listId, {
              name: nameInput.value.trim() || list.name,
              icon: chosenIcon,
              notes: notes.value.trim()
            });
            toast('Saved');
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
                                inputmode: 'numeric' });
    qtyInput.value = String(item.qty);
    var select = h('select', { class: 'select' }, cats.all.map(function (c) {
      return h('option', { value: c.id, text: c.icon + '  ' + c.label });
    }));
    select.value = item.category;
    var note = h('input', { class: 'input', type: 'text', dir: 'auto',
                            placeholder: 'e.g. the blue one, in the hall cupboard' });
    note.value = item.note || '';

    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'Item' }),
        nameInput
      ]),
      h('div', { class: 'row' }, [
        h('label', { class: 'field' }, [
          h('span', { class: 'field__label', text: 'Quantity' }),
          qtyInput
        ]),
        h('label', { class: 'field' }, [
          h('span', { class: 'field__label', text: 'Category' }),
          select
        ])
      ]),
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'Note (optional)' }),
        note
      ]),
      h('p', { class: 'field__hint', style: 'margin:0',
               text: 'Change the category and PackMeUp will remember it for this item next time.' })
    ]);

    openDialog({
      title: 'Edit item',
      body: body,
      focus: '#item-name',
      actions: [
        {
          label: 'Delete', variant: 'danger',
          onClick: function () {
            store.deleteItem(listId, itemId);
            undoable('“' + item.name + '” removed');
          }
        },
        { label: 'Cancel' },
        {
          label: 'Save', variant: 'primary',
          onClick: function () {
            var name = nameInput.value.trim() || item.name;
            var qty = Math.max(1, Math.min(999, parseInt(qtyInput.value, 10) || 1));
            store.updateItem(listId, itemId, { name: name, qty: qty, note: note.value.trim() });
            if (select.value !== item.category) {
              store.setItemCategory(listId, itemId, select.value);
            }
            toast('Saved');
          }
        }
      ]
    });
  }

  function bulkAddDialog(listId) {
    var area = h('textarea', {
      class: 'textarea', id: 'bulk-area', dir: 'auto', rows: '8',
      placeholder: 'Sunglasses\n3 x socks\nPassport\nPower bank'
    });
    var body = h('div', {}, [
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'One item per line' }),
        area,
        h('span', { class: 'field__hint',
                    text: 'Paste a list from anywhere. Quantities like “3 x socks” are understood, ' +
                          'and every line is filed into a category automatically.' })
      ])
    ]);

    openDialog({
      title: 'Add several items',
      body: body,
      focus: '#bulk-area',
      actions: [
        { label: 'Cancel' },
        {
          label: 'Add items', variant: 'primary',
          onClick: function () {
            var lines = area.value.split('\n').map(function (l) { return l.trim(); })
              .filter(Boolean);
            if (!lines.length) return false;
            var added = store.addItems(listId, lines);
            toast(plural(added.length, 'item') + ' added');
          }
        }
      ]
    });
  }

  function exportDialog(listId) {
    var list = listId ? store.getList(listId) : null;
    var name = list ? slug(list.name) : 'packmeup-all-lists';

    function entry(icon, label, onClick) {
      return h('button', {
        class: 'menu__item', type: 'button',
        onclick: function () { closeDialog(); setTimeout(onClick, 10); }
      }, [
        h('span', { class: 'menu__icon', text: icon, 'aria-hidden': 'true' }),
        h('span', { text: label })
      ]);
    }

    var menu = h('div', { class: 'menu' }, [
      list ? entry('📋', 'Copy list as text', function () {
        copyText(store.listToText(listId))
          .then(function () { toast('Copied to clipboard'); })
          .catch(function () { toast('Could not copy — try the download instead'); });
      }) : null,
      list ? entry('📝', 'Download as text file', function () {
        download(name + '.txt', store.listToText(listId), 'text/plain');
        toast('Downloaded');
      }) : null,
      entry('💾', list ? 'Download as backup file (.json)' : 'Download all lists (.json)', function () {
        download(name + '.json', list ? store.exportList(listId) : store.exportAll());
        toast('Downloaded');
      }),
      h('div', { class: 'menu__sep' }),
      h('p', { class: 'field__hint', style: 'margin:0 12px',
               text: 'A backup file can be imported on any other device from the ⋯ menu.' })
    ]);

    openDialog({ title: list ? 'Share “' + list.name + '”' : 'Export', body: menu });
  }

  function importDialog() {
    var file = h('input', { class: 'input', type: 'file', accept: '.json,application/json' });
    var area = h('textarea', { class: 'textarea', placeholder: '…or paste the contents of a backup file here' });

    function run(text) {
      try {
        var count = store.importJSON(text);
        closeDialog();
        toast(plural(count, 'list') + ' imported');
      } catch (err) {
        toast(err.message || 'Import failed');
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
        h('span', { class: 'field__label', text: 'Choose a PackMeUp backup file' }),
        file
      ]),
      h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'Or paste it' }),
        area
      ]),
      h('p', { class: 'field__hint', style: 'margin:0',
               text: 'Imported lists are added alongside what you already have — nothing is overwritten.' })
    ]);

    openDialog({
      title: 'Import lists',
      body: body,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Import', variant: 'primary', close: false,
          onClick: function () {
            if (!area.value.trim()) { toast('Choose a file or paste a backup first'); return false; }
            run(area.value);
            return false;
          }
        }
      ]
    });
  }

  function appMenuDialog() {
    function entry(icon, label, onClick) {
      return h('button', {
        class: 'menu__item', type: 'button',
        onclick: function () { closeDialog(); setTimeout(onClick, 10); }
      }, [
        h('span', { class: 'menu__icon', text: icon, 'aria-hidden': 'true' }),
        h('span', { text: label })
      ]);
    }

    var menu = h('div', { class: 'menu' }, [
      entry('➕', 'New list', newListDialog),
      entry('📥', 'Import lists from a backup', importDialog),
      entry('💾', 'Export everything', function () { exportDialog(null); }),
      h('div', { class: 'menu__sep' }),
      entry('◐', 'Theme: ' + (store.getSetting('theme') || 'system'), cycleTheme),
      entry('ℹ️', 'About PackMeUp', aboutDialog)
    ]);
    openDialog({ title: 'PackMeUp', body: menu });
  }

  function aboutDialog() {
    var lists = store.getLists();
    var items = lists.reduce(function (sum, l) { return sum + l.items.length; }, 0);
    var body = h('div', {}, [
      h('p', { style: 'margin-top:0;color:var(--text-muted)',
               text: 'PackMeUp keeps your packing lists for trips, reserve duty and anything ' +
                     'else you need a bag for. Items sort themselves into categories, you tick ' +
                     'them off as they go into the luggage, and you duplicate a list when the ' +
                     'next trip comes around.' }),
      h('p', { style: 'color:var(--text-muted)',
               text: 'Everything is stored on this device only — no account, no server, and it ' +
                     'keeps working with no signal. Use Export to move your lists to another device.' }),
      h('p', { class: 'field__hint',
               text: 'Right now: ' + plural(lists.length, 'list') + ', ' + plural(items, 'item') + '.' }),
      store.storageAvailable() ? null : h('p', {
        style: 'color:var(--danger)',
        text: 'Warning: this browser is blocking local storage, so changes will not survive a reload. ' +
              'Private browsing mode is the usual cause.'
      })
    ]);
    openDialog({ title: 'About', body: body, actions: [{ label: 'Close' }] });
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
      $('topbar-title').textContent = 'PackMeUp';
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

    Array.prototype.forEach.call(document.querySelectorAll('.chip[data-filter]'), function (chip) {
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
      var added = store.addItems(ui.route.listId, lines);
      input.value = '';
      input.focus();
      if (added.length === 1) {
        var category = cats.get(added[0].category);
        toast('Added to ' + category.icon + ' ' + category.label);
      } else if (added.length > 1) {
        toast(plural(added.length, 'item') + ' added');
      }
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
      } else if (event.key === '/' ) {
        event.preventDefault();
        var box = ui.route.view === 'list' ? $('list-search') : $('home-search');
        box.focus();
      } else if (event.key === 'Escape' && ui.route.view === 'list') {
        navigate('#/');
      }
    });

    /* Another tab changed the data - pick it up. */
    global.addEventListener('storage', function (event) {
      if (event.key && event.key.indexOf('packmeup') === 0) {
        store.load();
        applyTheme();
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

  function start() {
    store.load();
    applyTheme();
    wire();
    store.subscribe(render);
    ui.route = parseHash();
    if (ui.route.view === 'list' && !store.getList(ui.route.listId)) {
      ui.route = { view: 'home', listId: null };
    }
    render();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
