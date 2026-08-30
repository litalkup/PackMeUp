/*
 * Headless checks for the logic layer (no browser needed):
 *   node tools/test.js
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..');
var storage = {};
/* The store debounces its writes; in tests we let the timer fire at once so
   persistence can be asserted synchronously. */
var sandbox = {
  console: console,
  setTimeout: function (fn) { fn(); return 0; },
  clearTimeout: function () {}
};
sandbox.window = sandbox;
sandbox.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null; },
  setItem: function (k, v) { storage[k] = String(v); },
  removeItem: function (k) { delete storage[k]; }
};
vm.createContext(sandbox);
['js/categories.js', 'js/templates.js', 'js/store.js'].forEach(function (file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
});

var cats = sandbox.PMU.categories;
var store = sandbox.PMU.store;
store.load();

var failures = 0;
function check(label, actual, expected) {
  var ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log((ok ? '  ok   ' : '  FAIL ') + label +
    (ok ? '' : '\n         expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)));
}

console.log('categorisation');
check('passport -> documents', cats.categorize('Passport'), 'documents');
check('3 pairs of wool socks -> clothing', cats.categorize('3 pairs of wool socks'), 'clothing');
check('hiking boots -> footwear', cats.categorize('Hiking boots'), 'footwear');
check('power bank -> electronics', cats.categorize('Power bank'), 'electronics');
check('toothpaste -> toiletries', cats.categorize('Toothpaste'), 'toiletries');
check('israeli bandage -> health', cats.categorize('Israeli bandage'), 'health');
check('combat uniform -> military', cats.categorize('Combat uniform'), 'military');
check('hebrew: מטען -> electronics', cats.categorize('מטען'), 'electronics');
check('hebrew: מדים -> military', cats.categorize('מדים'), 'military');
check('unknown -> misc', cats.categorize('flux capacitor'), 'misc');
check('user correction wins', cats.categorize('umbrella', { umbrella: 'clothing' }), 'clothing');

console.log('quantity parsing');
check('"3 x socks"', store.parseLine('3 x socks'), { name: 'socks', qty: 3 });
check('"2 socks"', store.parseLine('2 socks'), { name: 'socks', qty: 2 });
check('"socks x3"', store.parseLine('socks x3'), { name: 'socks', qty: 3 });
check('"socks (4)"', store.parseLine('socks (4)'), { name: 'socks', qty: 4 });
check('"- passport"', store.parseLine('- passport'), { name: 'passport', qty: 1 });
check('plain text', store.parseLine('Sun hat'), { name: 'Sun hat', qty: 1 });

console.log('lists');
var list = store.createList({ name: 'Test trip', templateId: 'travel' });
check('template fills the list', list.items.length > 20, true);
check('items are categorised', list.items.every(function (i) { return !!i.category; }), true);
check('grouping is non-empty', store.groupByCategory(list.items).length > 5, true);

store.toggleItem(list.id, list.items[0].id);
check('stats track packed items', store.stats(list).packed, 1);

var copy = store.duplicateList(list.id);
check('duplicate keeps the items', copy.items.length, list.items.length);
check('duplicate resets the ticks', store.stats(copy).packed, 0);
check('duplicate gets its own name', copy.name, 'Test trip (copy)');
check('duplicate gets fresh item ids', copy.items[0].id !== list.items[0].id, true);

var again = store.duplicateList(list.id);
check('second duplicate is numbered', again.name, 'Test trip (copy 2)');

console.log('items');
var added = store.addItem(list.id, '3 x wool socks');
check('added item is categorised', added.category, 'clothing');
check('added item keeps the quantity', added.qty, 3);
store.setItemCategory(list.id, added.id, 'military');
check('manual category sticks', store.getList(list.id).items.filter(function (i) { return i.id === added.id; })[0].category, 'military');
check('manual category is remembered', cats.categorize('wool socks', store.getState().learned), 'military');

store.deleteItem(list.id, added.id);
check('item deleted', store.getList(list.id).items.some(function (i) { return i.id === added.id; }), false);
check('delete can be undone', typeof store.undo(), 'string');
check('item is back', store.getList(list.id).items.some(function (i) { return i.id === added.id; }), true);

console.log('persistence and transfer');
var json = store.exportAll();
var count = store.getLists().length;
var imported = store.importJSON(json);
check('import adds every list', imported, count);
check('import does not overwrite', store.getLists().length, count * 2);
check('export as text has categories', /Documents & Money/.test(store.listToText(list.id)), true);
check('bad import throws', (function () {
  try { store.importJSON('not json'); return false; } catch (e) { return true; }
})(), true);

store.load();
check('state survives a reload', store.getLists().length, count * 2);

console.log(failures ? '\n' + failures + ' check(s) failed' : '\nall checks passed');
process.exit(failures ? 1 : 0);
