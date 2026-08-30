/*
 * PackMeUp - translations.
 *
 * Two languages: English (ltr) and Hebrew (rtl). Every string the user can
 * see goes through t(). Interpolation uses {name} placeholders, and counted
 * nouns go through plural(), which follows each language's own rules.
 */
(function (global) {
  'use strict';

  var LANGS = {
    en: { id: 'en', label: 'English', dir: 'ltr', locale: 'en' },
    he: { id: 'he', label: 'עברית', dir: 'rtl', locale: 'he' }
  };

  var STRINGS = {
    en: {
      'app.title': 'PackMeUp — packing lists that sort themselves',
      'app.name': 'PackMeUp',

      'nav.back': 'Back to all lists',
      'nav.theme': 'Switch colour theme',
      'nav.more': 'More options',

      'home.search': 'Search lists and items',
      'home.newList': '+ New list',
      'home.yourLists': 'Your lists',
      'home.empty.title': 'No lists yet',
      'home.empty.body': 'Start from a ready-made template — a trip abroad, reserve duty, camping — or build your own from scratch. Everything you add sorts itself into categories.',
      'home.noMatch.title': 'Nothing matches “{q}”',
      'home.noMatch.body': 'Try a different word, or start a new list.',

      'card.aria': '{name}, {packed} of {total} packed',
      'card.options': 'Options for {name}',
      'card.empty': 'Empty list',
      'card.packedOf': '{packed} / {total} packed',
      'card.allPacked': '✓ All packed',
      'card.updated': 'updated {when}',

      'date.today': 'today',
      'date.yesterday': 'yesterday',
      'date.daysAgo': '{n} days ago',
      'date.weeksAgo': '{n}w ago',

      'list.progress': 'Packing progress',
      'list.sub.remaining': '{remaining} still to pack · {total} in total',
      'list.sub.allPacked': 'Everything is packed 🎉',
      'list.sub.empty': 'Nothing here yet',
      'list.filter.aria': 'Filter items',
      'list.filter.all': 'All',
      'list.filter.todo': 'To pack',
      'list.filter.packed': 'Packed',
      'list.search': 'Search items',
      'list.search.aria': 'Search items in this list',

      'add.label': 'Add an item',
      'add.placeholder': 'Add an item — try “3 x socks”',
      'add.button': 'Add',
      'add.bulk': 'Add several items at once',
      'add.addedTo': 'Added to {category}',
      'add.addedMany': '{count} added',

      'dupe.title': 'This item is already on the list',
      'dupe.titleCounted': 'Already on the list ({index} of {total})',
      'dupe.existing': 'Already on the list',
      'dupe.new': 'What you just added',
      'dupe.packed': 'ticked off',
      'dupe.notPacked': 'not packed yet',
      'dupe.qty': 'quantity {n}',
      'dupe.add': 'Add it anyway',
      'dupe.addDesc': 'Keep both items on the list',
      'dupe.skip': 'Do not add it',
      'dupe.skipDesc': 'Leave the list as it is',
      'dupe.replace': 'Replace the existing item',
      'dupe.replaceDesc': 'The new one takes its place, unticked',
      'dupe.replaced': 'Item replaced',
      'dupe.skipped': 'Item not added',
      'add.summaryAdded': 'added: {n}',
      'add.summaryReplaced': 'replaced: {n}',
      'add.summarySkipped': 'not added: {n}',

      'count.aria': '{name}: {packed} of {total} packed, tap to add one',
      'count.toast': '{packed} of {total} packed',
      'count.leftOne': '1 left',
      'count.leftMany': '{n} left',
      'item.packedQty': 'Already packed',
      'dupe.partly': '{packed} of {total} packed',
      'item.pack': 'Pack {name}',
      'item.unpack': 'Unpack {name}',
      'item.edit': 'Edit {name}',

      'empty.list.title': 'Empty list',
      'empty.list.body': 'Add items in the box below. Type “3 x socks” to set a quantity — each item lands in the right category by itself.',
      'empty.search.title': 'No items match “{q}”',
      'empty.todo.title': 'Nothing left to pack',
      'empty.todo.body': 'Every item on this list is ticked off. Safe travels!',
      'empty.packed.title': 'Nothing packed yet',
      'empty.packed.body': 'Tick items off as they go into the bag and they will show up here.',

      'new.title': 'New packing list',
      'new.name': 'List name',
      'new.namePlaceholder': 'e.g. Greece, August',
      'new.startFrom': 'Start from',
      'new.create': 'Create list',
      'new.created': 'List created',
      'new.createdWith': 'Created with {count}',

      'menu.duplicate': 'Duplicate this list',
      'menu.rename': 'Rename & change icon',
      'menu.recategorize': 'Re-sort into categories',
      'menu.checkAll': 'Mark everything packed',
      'menu.uncheckAll': 'Uncheck everything',
      'menu.removePacked': 'Remove packed items',
      'menu.share': 'Share or export',
      'menu.print': 'Print this list',
      'menu.delete': 'Delete list',
      'menu.newList': 'New list',
      'menu.import': 'Import lists from a backup',
      'menu.exportAll': 'Export everything',
      'menu.theme': 'Theme: {theme}',
      'menu.language': 'Language: {language}',
      'menu.about': 'About PackMeUp',

      'theme.system': 'system',
      'theme.light': 'light',
      'theme.dark': 'dark',
      'theme.changed': 'Theme: {theme}',

      'dup.title': 'Duplicate list',
      'dup.name': 'Name of the copy',
      'dup.keep': 'Keep the ticks — copy what is already packed',
      'dup.hint': 'All {count} and their categories are copied.',
      'dup.action': 'Duplicate',
      'dup.done': 'Copied to “{name}”',
      'dup.suffix': 'copy',

      'rename.title': 'Rename list',
      'rename.icon': 'Icon',
      'rename.iconAria': 'Icon {icon}',
      'rename.notes': 'Notes (optional)',
      'rename.notesPlaceholder': 'Flight at 06:40, bag drop closes 05:40…',

      'item.title': 'Edit item',
      'item.name': 'Item',
      'item.qty': 'Quantity',
      'item.category': 'Category',
      'item.note': 'Note (optional)',
      'item.notePlaceholder': 'e.g. the blue one, in the hall cupboard',
      'item.learnHint': 'Change the category and PackMeUp will remember it for this item next time.',
      'item.removed': '“{name}” removed',

      'bulk.title': 'Add several items',
      'bulk.label': 'One item per line',
      'bulk.placeholder': 'Sunglasses\n3 x socks\nPassport\nPower bank',
      'bulk.hint': 'Paste a list from anywhere. Quantities like “3 x socks” are understood, and every line is filed into a category automatically.',
      'bulk.action': 'Add items',
      'bulk.added': '{count} added',

      'export.title': 'Share “{name}”',
      'export.titleAll': 'Export',
      'export.copyText': 'Copy list as text',
      'export.downloadText': 'Download as text file',
      'export.downloadJson': 'Download as backup file (.json)',
      'export.downloadJsonAll': 'Download all lists (.json)',
      'export.hint': 'A backup file can be imported on any other device from the ⋯ menu.',
      'export.copied': 'Copied to clipboard',
      'export.copyFailed': 'Could not copy — try the download instead',
      'export.downloaded': 'Downloaded',

      'import.title': 'Import lists',
      'import.file': 'Choose a PackMeUp backup file',
      'import.paste': 'Or paste it',
      'import.pastePlaceholder': '…or paste the contents of a backup file here',
      'import.hint': 'Imported lists are added alongside what you already have — nothing is overwritten.',
      'import.action': 'Import',
      'import.needFile': 'Choose a file or paste a backup first',
      'import.done': '{count} imported',
      'import.badJson': 'That file is not valid JSON.',
      'import.noLists': 'No packing lists found in that file.',
      'import.failed': 'Import failed',

      'about.title': 'About',
      'about.p1': 'PackMeUp keeps your packing lists for trips, reserve duty and anything else you need a bag for. Items sort themselves into categories, you tick them off as they go into the luggage, and you duplicate a list when the next trip comes around.',
      'about.p2': 'Everything is stored on this device only — no account, no server, and it keeps working with no signal. Use Export to move your lists to another device.',
      'about.stats': 'Right now: {lists}, {items}.',
      'about.noStorage': 'Warning: this browser is blocking local storage, so changes will not survive a reload. Private browsing mode is the usual cause.',

      'confirm.deleteList.title': 'Delete “{name}”?',
      'confirm.deleteList.body': 'The list and its {count} will be removed. You can undo this straight after.',
      'confirm.removePacked.title': 'Remove packed items?',
      'confirm.removePacked.body': '{count} will be removed from this list.',
      'confirm.remove': 'Remove',

      'action.cancel': 'Cancel',
      'action.save': 'Save',
      'action.delete': 'Delete',
      'action.close': 'Close',
      'action.undo': 'Undo',

      'toast.saved': 'Saved',
      'toast.undone': 'Undone',
      'toast.listDeleted': 'List deleted',
      'toast.removed': '{count} removed',
      'toast.checked': 'Everything checked',
      'toast.unchecked': 'Everything unchecked',
      'toast.recategorized': 'Categories refreshed',

      'plural.item.one': '{n} item',
      'plural.item.other': '{n} items',
      'plural.list.one': '{n} list',
      'plural.list.other': '{n} lists',
      'plural.category.one': '{n} category',
      'plural.category.other': '{n} categories',
      'plural.match.one': '{n} match',
      'plural.match.other': '{n} matches',

      'cat.documents': 'Documents & Money',
      'cat.electronics': 'Electronics',
      'cat.toiletries': 'Toiletries',
      'cat.health': 'Health & Meds',
      'cat.military': 'Military Gear',
      'cat.gear': 'Gear & Outdoors',
      'cat.sleep': 'Sleep',
      'cat.footwear': 'Footwear',
      'cat.clothing': 'Clothing',
      'cat.food': 'Food & Drink',
      'cat.sports': 'Sports & Fitness',
      'cat.work': 'Work & Study',
      'cat.kids': 'Kids & Baby',
      'cat.misc': 'Other'
    },

    he: {
      'app.title': 'PackMeUp — רשימות אריזה שמסדרות את עצמן',
      'app.name': 'PackMeUp',

      'nav.back': 'חזרה לכל הרשימות',
      'nav.theme': 'החלפת ערכת צבעים',
      'nav.more': 'אפשרויות נוספות',

      'home.search': 'חיפוש ברשימות ובפריטים',
      'home.newList': '+ רשימה חדשה',
      'home.yourLists': 'הרשימות שלי',
      'home.empty.title': 'עדיין אין רשימות',
      'home.empty.body': 'אפשר להתחיל מתבנית מוכנה — טיול בחו״ל, מילואים, קמפינג — או לבנות רשימה מאפס. כל פריט שמוסיפים מסתדר לבד בקטגוריה המתאימה.',
      'home.noMatch.title': 'אין תוצאות עבור ״{q}״',
      'home.noMatch.body': 'אפשר לנסות מילה אחרת, או לפתוח רשימה חדשה.',

      'card.aria': '{name}, {packed} מתוך {total} ארוזים',
      'card.options': 'אפשרויות עבור {name}',
      'card.empty': 'רשימה ריקה',
      'card.packedOf': '{packed} מתוך {total} ארוזים',
      'card.allPacked': '✓ הכול ארוז',
      'card.updated': 'עודכן {when}',

      'date.today': 'היום',
      'date.yesterday': 'אתמול',
      'date.daysAgo': 'לפני {n} ימים',
      'date.weeksAgo': 'לפני {n} שבועות',

      'list.progress': 'התקדמות האריזה',
      'list.sub.remaining': 'נשארו {remaining} לארוז · {total} בסך הכול',
      'list.sub.allPacked': 'הכול ארוז 🎉',
      'list.sub.empty': 'עדיין אין כאן כלום',
      'list.filter.aria': 'סינון פריטים',
      'list.filter.all': 'הכול',
      'list.filter.todo': 'לארוז',
      'list.filter.packed': 'ארוז',
      'list.search': 'חיפוש פריטים',
      'list.search.aria': 'חיפוש פריטים ברשימה הזאת',

      'add.label': 'הוספת פריט',
      'add.placeholder': 'הוספת פריט, למשל 3 גרביים',
      'add.button': 'הוספה',
      'add.bulk': 'הוספת כמה פריטים בבת אחת',
      'add.addedTo': 'נוסף אל {category}',
      'add.addedMany': 'נוספו {count}',

      'dupe.title': 'הפריט כבר קיים ברשימה',
      'dupe.titleCounted': 'כבר קיים ברשימה ({index} מתוך {total})',
      'dupe.existing': 'כבר ברשימה',
      'dupe.new': 'הפריט שהוספת',
      'dupe.packed': 'מסומן כארוז',
      'dupe.notPacked': 'עדיין לא ארוז',
      'dupe.qty': 'כמות {n}',
      'dupe.add': 'להוסיף בכל זאת',
      'dupe.addDesc': 'שני הפריטים יישארו ברשימה',
      'dupe.skip': 'לא להוסיף',
      'dupe.skipDesc': 'הרשימה תישאר כמו שהיא',
      'dupe.replace': 'להחליף את הפריט הקיים',
      'dupe.replaceDesc': 'הפריט החדש ייכנס במקומו, בלי סימון',
      'dupe.replaced': 'הפריט הוחלף',
      'dupe.skipped': 'הפריט לא נוסף',
      'add.summaryAdded': 'נוספו: {n}',
      'add.summaryReplaced': 'הוחלפו: {n}',
      'add.summarySkipped': 'לא נוספו: {n}',

      'count.aria': '{name}: ארוז {packed} מתוך {total}, נגיעה מוסיפה עוד אחד',
      'count.toast': 'ארוז {packed} מתוך {total}',
      'count.leftOne': 'נותר 1',
      'count.leftMany': 'נותרו {n}',
      'item.packedQty': 'כבר ארוז',
      'dupe.partly': 'ארוז {packed} מתוך {total}',
      'item.pack': 'סימון {name} כארוז',
      'item.unpack': 'ביטול הסימון של {name}',
      'item.edit': 'עריכת {name}',

      'empty.list.title': 'רשימה ריקה',
      'empty.list.body': 'אפשר להוסיף פריטים בשורה שלמטה. מספר בתחילת השורה קובע כמות, למשל: 3 גרביים — וכל פריט נכנס לבד לקטגוריה הנכונה.',
      'empty.search.title': 'אין פריטים שמתאימים ל״{q}״',
      'empty.todo.title': 'לא נשאר מה לארוז',
      'empty.todo.body': 'כל הפריטים ברשימה מסומנים. נסיעה טובה!',
      'empty.packed.title': 'עדיין לא ארוז כלום',
      'empty.packed.body': 'מסמנים פריטים כשהם נכנסים לתיק, והם יופיעו כאן.',

      'new.title': 'רשימת אריזה חדשה',
      'new.name': 'שם הרשימה',
      'new.namePlaceholder': 'למשל: יוון, אוגוסט',
      'new.startFrom': 'להתחיל מ־',
      'new.create': 'יצירת רשימה',
      'new.created': 'הרשימה נוצרה',
      'new.createdWith': 'נוצרה רשימה עם {count}',

      'menu.duplicate': 'שכפול הרשימה',
      'menu.rename': 'שינוי שם וסמל',
      'menu.recategorize': 'סידור מחדש לקטגוריות',
      'menu.checkAll': 'סימון הכול כארוז',
      'menu.uncheckAll': 'ביטול כל הסימונים',
      'menu.removePacked': 'מחיקת הפריטים הארוזים',
      'menu.share': 'שיתוף וייצוא',
      'menu.print': 'הדפסת הרשימה',
      'menu.delete': 'מחיקת הרשימה',
      'menu.newList': 'רשימה חדשה',
      'menu.import': 'ייבוא רשימות מגיבוי',
      'menu.exportAll': 'ייצוא הכול',
      'menu.theme': 'ערכת צבעים: {theme}',
      'menu.language': 'שפה: {language}',
      'menu.about': 'על PackMeUp',

      'theme.system': 'לפי המכשיר',
      'theme.light': 'בהיר',
      'theme.dark': 'כהה',
      'theme.changed': 'ערכת צבעים: {theme}',

      'dup.title': 'שכפול רשימה',
      'dup.name': 'שם העותק',
      'dup.keep': 'לשמור את הסימונים — להעתיק גם מה שכבר ארוז',
      'dup.hint': 'כל {count} והקטגוריות שלהם מועתקים.',
      'dup.action': 'שכפול',
      'dup.done': 'הועתק אל ״{name}״',
      'dup.suffix': 'עותק',

      'rename.title': 'שינוי שם הרשימה',
      'rename.icon': 'סמל',
      'rename.iconAria': 'סמל {icon}',
      'rename.notes': 'הערות (לא חובה)',
      'rename.notesPlaceholder': 'טיסה ב־06:40, שליחת מזוודות נסגרת ב־05:40…',

      'item.title': 'עריכת פריט',
      'item.name': 'פריט',
      'item.qty': 'כמות',
      'item.category': 'קטגוריה',
      'item.note': 'הערה (לא חובה)',
      'item.notePlaceholder': 'למשל: הכחול, בארון במסדרון',
      'item.learnHint': 'אחרי שינוי הקטגוריה, PackMeUp יזכור אותה לפריט הזה בפעם הבאה.',
      'item.removed': '״{name}״ נמחק',

      'bulk.title': 'הוספת כמה פריטים',
      'bulk.label': 'פריט אחד בכל שורה',
      'bulk.placeholder': 'משקפי שמש\n3 גרביים\nדרכון\nמטען נייד',
      'bulk.hint': 'אפשר להדביק רשימה מכל מקום. כמויות שנכתבות בתחילת השורה (למשל: 3 גרביים) מזוהות, וכל שורה מסודרת לקטגוריה באופן אוטומטי.',
      'bulk.action': 'הוספת הפריטים',
      'bulk.added': 'נוספו {count}',

      'export.title': 'שיתוף ״{name}״',
      'export.titleAll': 'ייצוא',
      'export.copyText': 'העתקת הרשימה כטקסט',
      'export.downloadText': 'הורדה כקובץ טקסט',
      'export.downloadJson': 'הורדה כקובץ גיבוי (‎.json)',
      'export.downloadJsonAll': 'הורדת כל הרשימות (‎.json)',
      'export.hint': 'אפשר לייבא קובץ גיבוי בכל מכשיר אחר דרך תפריט ⋯.',
      'export.copied': 'הועתק ללוח',
      'export.copyFailed': 'ההעתקה נכשלה — אפשר להוריד את הקובץ במקום',
      'export.downloaded': 'ההורדה הסתיימה',

      'import.title': 'ייבוא רשימות',
      'import.file': 'בחירת קובץ גיבוי של PackMeUp',
      'import.paste': 'או הדבקה של התוכן',
      'import.pastePlaceholder': '…או להדביק כאן את התוכן של קובץ הגיבוי',
      'import.hint': 'הרשימות המיובאות נוספות למה שכבר קיים — שום דבר לא נמחק.',
      'import.action': 'ייבוא',
      'import.needFile': 'צריך לבחור קובץ או להדביק גיבוי',
      'import.done': 'יובאו {count}',
      'import.badJson': 'הקובץ הזה אינו JSON תקין.',
      'import.noLists': 'לא נמצאו רשימות אריזה בקובץ הזה.',
      'import.failed': 'הייבוא נכשל',

      'about.title': 'אודות',
      'about.p1': 'PackMeUp שומר את רשימות האריזה שלכם — לטיולים, למילואים ולכל דבר אחר שדורש תיק. הפריטים מסתדרים לבד בקטגוריות, מסמנים אותם כשהם נכנסים למזוודה, ומשכפלים רשימה כשמגיעה הנסיעה הבאה.',
      'about.p2': 'הכול נשמר על המכשיר הזה בלבד — בלי חשבון, בלי שרת, וממשיך לעבוד גם בלי קליטה. אפשר להעביר רשימות למכשיר אחר דרך הייצוא.',
      'about.stats': 'כרגע: {lists}, {items}.',
      'about.noStorage': 'שימו לב: הדפדפן חוסם את האחסון המקומי, ולכן שינויים לא יישמרו אחרי רענון. בדרך כלל הסיבה היא גלישה בסתר.',

      'confirm.deleteList.title': 'למחוק את ״{name}״?',
      'confirm.deleteList.body': 'הרשימה ו{count} שבה יימחקו. אפשר לבטל מיד אחר כך.',
      'confirm.removePacked.title': 'למחוק את הפריטים הארוזים?',
      'confirm.removePacked.body': '{count} יימחקו מהרשימה.',
      'confirm.remove': 'מחיקה',

      'action.cancel': 'ביטול',
      'action.save': 'שמירה',
      'action.delete': 'מחיקה',
      'action.close': 'סגירה',
      'action.undo': 'ביטול',

      'toast.saved': 'נשמר',
      'toast.undone': 'הפעולה בוטלה',
      'toast.listDeleted': 'הרשימה נמחקה',
      'toast.removed': '{count} נמחקו',
      'toast.checked': 'הכול סומן',
      'toast.unchecked': 'הסימונים בוטלו',
      'toast.recategorized': 'הקטגוריות סודרו מחדש',

      'plural.item.one': 'פריט אחד',
      'plural.item.other': '{n} פריטים',
      'plural.list.one': 'רשימה אחת',
      'plural.list.other': '{n} רשימות',
      'plural.category.one': 'קטגוריה אחת',
      'plural.category.other': '{n} קטגוריות',
      'plural.match.one': 'תוצאה אחת',
      'plural.match.other': '{n} תוצאות',

      'cat.documents': 'מסמכים וכסף',
      'cat.electronics': 'אלקטרוניקה',
      'cat.toiletries': 'רחצה וטיפוח',
      'cat.health': 'בריאות ותרופות',
      'cat.military': 'ציוד צבאי',
      'cat.gear': 'ציוד ושטח',
      'cat.sleep': 'שינה',
      'cat.footwear': 'הנעלה',
      'cat.clothing': 'ביגוד',
      'cat.food': 'אוכל ושתייה',
      'cat.sports': 'ספורט וכושר',
      'cat.work': 'עבודה ולימודים',
      'cat.kids': 'ילדים ותינוקות',
      'cat.misc': 'שונות'
    }
  };

  var current = 'en';

  function detect() {
    var langs = (global.navigator && (global.navigator.languages ||
      [global.navigator.language])) || [];
    for (var i = 0; i < langs.length; i++) {
      var tag = String(langs[i] || '').toLowerCase();
      if (tag.indexOf('he') === 0 || tag.indexOf('iw') === 0) return 'he';
      if (tag.indexOf('en') === 0) return 'en';
    }
    return 'en';
  }

  function setLang(id) {
    current = STRINGS[id] ? id : 'en';
    return current;
  }

  function getLang() { return current; }

  function meta(id) { return LANGS[id || current] || LANGS.en; }

  function dir() { return meta().dir; }

  function isRTL() { return meta().dir === 'rtl'; }

  function interpolate(template, params) {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match;
    });
  }

  /* t('key', { placeholders }) - falls back to English, then to the key. */
  function t(key, params) {
    var table = STRINGS[current] || STRINGS.en;
    var value = table[key];
    if (value === undefined) value = STRINGS.en[key];
    if (value === undefined) return key;
    return interpolate(value, params);
  }

  /*
   * plural(3, 'item') -> "3 items" / "3 פריטים"
   * plural(1, 'item') -> "1 item"  / "פריט אחד"
   */
  function plural(count, kind) {
    var form = count === 1 ? 'one' : 'other';
    return t('plural.' + kind + '.' + form, { n: count });
  }

  function languages() {
    return Object.keys(LANGS).map(function (id) { return LANGS[id]; });
  }

  global.PMU = global.PMU || {};
  global.PMU.i18n = {
    t: t,
    plural: plural,
    setLang: setLang,
    getLang: getLang,
    detect: detect,
    dir: dir,
    isRTL: isRTL,
    meta: meta,
    languages: languages,
    has: function (id) { return !!STRINGS[id]; }
  };
})(window);
