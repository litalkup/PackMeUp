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
  navigator: { languages: ['en-GB'] },
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
['js/i18n.js', 'js/notes.js', 'js/categories.js', 'js/templates.js', 'js/store.js'].forEach(function (file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
});

var cats = sandbox.PMU.categories;
var store = sandbox.PMU.store;
var i18n = sandbox.PMU.i18n;
var notes = sandbox.PMU.notes;
var templates = sandbox.PMU.templates;
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
check('hebrew: מברשת שיניים -> toiletries', cats.categorize('מברשת שיניים'), 'toiletries');
check('hebrew: נעלי הליכה -> footwear', cats.categorize('נעלי הליכה'), 'footwear');
check('hebrew: שק שינה -> gear', cats.categorize('שק שינה'), 'gear');
check('hebrew: חיתולים -> kids', cats.categorize('חיתולים'), 'kids');
check('hebrew plural: גרב = גרביים', cats.categorize('גרב'), cats.categorize('גרביים'));
check('hebrew prefix: הדרכון -> documents', cats.categorize('הדרכון'), 'documents');
check('hebrew two prefixes: שהתרופות -> health', cats.categorize('שהתרופות'), 'health');
check('hebrew prefix + plural: ומגבות -> toiletries', cats.categorize('ומגבות'), 'toiletries');
check('hebrew phrase with prefix: לתיק גב -> gear', cats.categorize('לתיק גב'), 'gear');
check('prefix letters are not stripped off keywords', cats.categorize('מגבת'), 'toiletries');
check('mixed languages in one list', cats.categorize('3 גרביים'), cats.categorize('3 socks'));
check('unknown -> misc', cats.categorize('flux capacitor'), 'misc');
check('וולטרן -> health', cats.categorize('וולטרן'), 'health');
check('נססר -> toiletries', cats.categorize('כלי רחצה - נססר ירוק'), 'toiletries');
check('קרדיגן -> clothing', cats.categorize('קרדיגן'), 'clothing');
check('פיט ביט -> electronics', cats.categorize('מטען פיט ביט'), 'electronics');
check('טייץ -> clothing', cats.categorize('טייץ'), 'clothing');
check('עדשות -> toiletries', cats.categorize('עדשות חדפ'), 'toiletries');
check('user correction wins', cats.categorize('umbrella', { umbrella: 'clothing' }), 'clothing');

console.log('quantity parsing');
check('"3 x socks"', store.parseLine('3 x socks'), { name: 'socks', qty: 3 });
check('"2 socks"', store.parseLine('2 socks'), { name: 'socks', qty: 2 });
check('"socks x3"', store.parseLine('socks x3'), { name: 'socks', qty: 3 });
check('"socks (4)"', store.parseLine('socks (4)'), { name: 'socks', qty: 4 });
check('"- passport"', store.parseLine('- passport'), { name: 'passport', qty: 1 });
check('plain text', store.parseLine('Sun hat'), { name: 'Sun hat', qty: 1 });
check('hebrew "3 גרביים"', store.parseLine('3 גרביים'), { name: 'גרביים', qty: 3 });
check('hebrew "2 x מגבת"', store.parseLine('2 x מגבת'), { name: 'מגבת', qty: 2 });

console.log('lists');
var list = store.createList({ name: 'Test trip', templateId: 'travel' });
check('template fills the list', list.items.length > 20, true);
check('items are categorised', list.items.every(function (i) { return !!i.category; }), true);
check('grouping is non-empty', store.groupByCategory(list.items).length > 5, true);

store.toggleItem(list.id, list.items[0].id);
check('stats track packed items', store.stats(list).packed, 1);

console.log('partly packed quantities');
var counted = store.createList({ name: 'counting', templateId: 'blank' });
var vest = store.addItem(counted.id, '3 undershirts');
check('a new item starts at zero', vest.packedQty, 0);
check('and is not packed', store.isPacked(vest), false);

store.advanceItem(counted.id, vest.id);
store.advanceItem(counted.id, vest.id);
check('two taps pack two of them', store.getList(counted.id).items[0].packedQty, 2);
check('still not finished', store.isPacked(store.getList(counted.id).items[0]), false);
check('a part-packed list shows two thirds', store.stats(store.getList(counted.id)).percent, 67);
check('and the item is still to pack', store.stats(store.getList(counted.id)).remaining, 1);

store.advanceItem(counted.id, vest.id);
check('the third tap finishes it', store.isPacked(store.getList(counted.id).items[0]), true);
check('a finished list is at 100', store.stats(store.getList(counted.id)).percent, 100);

store.advanceItem(counted.id, vest.id);
check('tapping a full counter starts over', store.getList(counted.id).items[0].packedQty, 0);

store.setPackedQty(counted.id, vest.id, 2);
check('an exact count can be set', store.getList(counted.id).items[0].packedQty, 2);
store.setPackedQty(counted.id, vest.id, 99);
check('over the quantity is clamped', store.getList(counted.id).items[0].packedQty, 3);
store.setPackedQty(counted.id, vest.id, -4);
check('under zero is clamped', store.getList(counted.id).items[0].packedQty, 0);

store.setPackedQty(counted.id, vest.id, 3);
store.updateItem(counted.id, vest.id, { qty: 2 });
check('lowering the quantity lowers what is packed',
  store.getList(counted.id).items[0].packedQty, 2);

store.setAllPacked(counted.id, true);
check('"mark everything packed" fills the counters',
  store.getList(counted.id).items[0].packedQty, 2);
store.setAllPacked(counted.id, false);
check('and unchecking empties them', store.getList(counted.id).items[0].packedQty, 0);

store.setPackedQty(counted.id, vest.id, 1);
check('the text export marks a part-packed item',
  /\[~\] 1\/2 undershirts/.test(store.listToText(counted.id)), true);

var oldFormat = JSON.stringify({ lists: [{ name: 'old', items: [
  { name: 'socks', qty: 4, packed: true }, { name: 'hat', qty: 1, packed: false }
] }] });
store.importJSON(oldFormat);
var migrated = store.getLists()[0];
check('a ticked item from an older save becomes fully packed',
  migrated.items[0].packedQty, 4);
check('an unticked one starts empty', migrated.items[1].packedQty, 0);

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

console.log('notes pasted or shared from elsewhere');
var keepNote = notes.parse([
  'רשימת מילואים',
  '☑ דרכון',
  '☐ 3 גרביים',
  '  ☐ מברשת שיניים',
  '',
  '☑ מגבת'
].join('\n'));
check('a heading becomes the title', keepNote.title, 'רשימת מילואים');
check('every line below it is an item', keepNote.lines.length, 4);
check('ticked lines are marked packed', notes.packedCount(keepNote.lines), 2);
check('checkbox characters are stripped', keepNote.lines[0].text, 'דרכון');
check('indented lines come through', keepNote.lines[2].text, 'מברשת שיניים');
check('blank lines are dropped',
  keepNote.lines.filter(function (l) { return !l.text; }).length, 0);

var markdown = notes.parse('- [x] Passport\n- [ ] 3 x socks\n* Toothbrush\n• Towel');
check('markdown checkboxes', markdown.lines[0].text, 'Passport');
check('markdown ticked state', markdown.lines[0].packed, true);
check('markdown unticked state', markdown.lines[1].packed, false);
check('bullets are stripped', markdown.lines[2].text, 'Toothbrush');
check('bullet lines are not packed', markdown.lines[3].packed, false);

var struck = notes.parse('* ~~סבון גוף ~~\n* ~~מקלחת~~\n* שמפו');
check('a crossed-out line arrives packed', struck.lines[0].packed, true);
check('and loses its ~~ markers', struck.lines[0].text, 'סבון גוף');
check('a line beside it is untouched', struck.lines[2].packed, false);
check('a bullet with nothing after it is not an item',
  notes.parse('* כובע\n* \n*\n---\n* מגבת').lines.length, 2);

var plainNote = notes.parse('Passport\nSocks\nToothbrush');
check('a note with no markers keeps every line', plainNote.lines.length, 3);
check('and takes no title from it', plainNote.title, null);
check('an empty note yields nothing', notes.parse('   \n\n').lines.length, 0);
check('one bare line is an item, not a title', notes.parse('Passport').lines.length, 1);

var imported = store.createList({ name: 'from keep', templateId: 'blank' });
store.addItems(imported.id, keepNote.lines);
var importedItems = store.getList(imported.id).items;
check('imported items are categorised', importedItems[0].category, 'documents');
check('a ticked note line arrives packed', store.isPacked(importedItems[0]), true);
check('an unticked one does not', importedItems[1].packedQty, 0);
check('quantities survive the import', importedItems[1].qty, 3);
check('a ticked line with a quantity arrives fully packed',
  store.addItem(imported.id, { text: '4 גופיות', packed: true }).packedQty, 4);

console.log('duplicate detection');
check('same word, different case', store.sameItemName('Socks', 'socks'), true);
check('english plural', store.sameItemName('socks', 'sock'), true);
check('english irregular plural', store.sameItemName('batteries', 'battery'), true);
check('hebrew plural', store.sameItemName('גרביים', 'גרב'), true);
check('hebrew feminine plural', store.sameItemName('מגבת', 'מגבות'), true);
check('hebrew prefix', store.sameItemName('הגרביים', 'גרביים'), true);
check('one typo apart', store.sameItemName('sunscreen', 'sunscren'), true);
check('quantity is not part of the name',
  store.sameItemName(store.parseLine('3 socks').name, 'socks'), true);
check('an extra word makes a different item', store.sameItemName('wool socks', 'socks'), false);
check('charger is not a power bank', store.sameItemName('מטען', 'מטען נייד'), false);
check('unrelated items', store.sameItemName('phone charger', 'power bank'), false);
check('short words are not typo-matched', store.sameItemName('hat', 'bat'), false);
/* Peeling a prefix off both words let unrelated ones meet on a shared tail. */
check('שישי is not שלישי', store.sameItemName('שישי', 'שלישי'), false);
check('a prefix on one side still matches', store.sameItemName('הכובע', 'כובע'), true);

var dupeList = store.createList({ name: 'dupes', templateId: 'blank' });
store.addItem(dupeList.id, '3 socks');
check('finds the existing item', !!store.findSimilar(dupeList.id, 'sock'), true);
check('leaves other items alone', store.findSimilar(dupeList.id, 'tent'), null);

var original = store.findSimilar(dupeList.id, 'socks');
store.toggleItem(dupeList.id, original.id);
store.replaceItem(dupeList.id, original.id, '7 wool socks');
var replaced = store.getList(dupeList.id).items[0];
check('replacing keeps the same slot', replaced.id, original.id);
check('replacing takes the new name', replaced.name, 'wool socks');
check('replacing takes the new quantity', replaced.qty, 7);
check('replacing clears the tick', replaced.packedQty, 0);
check('replacing does not grow the list', store.getList(dupeList.id).items.length, 1);
check('replacing is undoable', typeof store.undo(), 'string');
check('undo restores the original item', store.getList(dupeList.id).items[0].name, 'socks');
check('undo restores its tick', store.isPacked(store.getList(dupeList.id).items[0]), true);

console.log('hebrew interface');
i18n.setLang('he');
check('direction flips', i18n.dir(), 'rtl');
check('category labels translate', cats.label('clothing'), 'ביגוד');
check('hebrew singular', i18n.plural(1, 'item'), 'פריט אחד');
check('hebrew plural', i18n.plural(3, 'item'), '3 פריטים');
check('interpolation', i18n.t('card.updated', { when: 'היום' }), 'עודכן היום');
check('missing keys fall back to english', i18n.t('nope.nope'), 'nope.nope');

var hebrewList = store.createList({ templateId: 'reserve' });
check('template name is hebrew', hebrewList.name, 'מילואים');
check('template items are hebrew', /[֐-׿]/.test(hebrewList.items[0].name), true);
check('every hebrew item is categorised',
  hebrewList.items.filter(function (i) { return i.category === 'misc'; }).length, 0);
check('hebrew list groups into categories', store.groupByCategory(hebrewList.items).length > 8, true);
check('text export uses hebrew labels', /ציוד צבאי/.test(store.listToText(hebrewList.id)), true);

var hebrewCopy = store.duplicateList(hebrewList.id);
check('copy suffix is hebrew', hebrewCopy.name, 'מילואים (עותק)');
check('second hebrew copy is numbered', store.duplicateList(hebrewList.id).name, 'מילואים (עותק 2)');

i18n.setLang('en');
check('an english copy of a hebrew copy strips the hebrew suffix',
  store.duplicateList(hebrewCopy.id).name, 'מילואים (copy)');
check('english labels come back', cats.label('clothing'), 'Clothing');
check('templates keep both languages',
  templates.localized(templates.get('travel').name, 'he'), 'טיול בחו״ל');

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
