/*
 * PackMeUp - automatic categorisation.
 *
 * Given a free-text item name ("2 pairs of wool socks", "3 גרביים") this module
 * decides which segment/category the item belongs to. It is a keyword scoring
 * engine: the longest keyword that matches the item wins.
 *
 * Both languages are matched at once, so a list can mix English and Hebrew.
 * Hebrew words are also matched through a small stemmer, because the same item
 * shows up with attached prefixes (ה, ו, ב, ל, כ, מ, ש) and in plural forms
 * (גרב / גרביים, מגבת / מגבות).
 */
(function (global) {
  'use strict';

  /* Ordered from most specific to most generic. "misc" is the fallback. */
  var CATEGORIES = [
    { id: 'documents',   label: 'Documents & Money', icon: '🪪' },
    { id: 'electronics', label: 'Electronics',       icon: '🔌' },
    { id: 'toiletries',  label: 'Toiletries',        icon: '🧴' },
    { id: 'health',      label: 'Health & Meds',     icon: '💊' },
    { id: 'military',    label: 'Military Gear',     icon: '🪖' },
    { id: 'gear',        label: 'Gear & Outdoors',   icon: '🎒' },
    { id: 'sleep',       label: 'Sleep',             icon: '🛏️' },
    { id: 'footwear',    label: 'Footwear',          icon: '👟' },
    { id: 'clothing',    label: 'Clothing',          icon: '👕' },
    { id: 'food',        label: 'Food & Drink',      icon: '🍫' },
    { id: 'sports',      label: 'Sports & Fitness',  icon: '🏋️' },
    { id: 'work',        label: 'Work & Study',      icon: '💼' },
    { id: 'kids',        label: 'Kids & Baby',       icon: '🧸' },
    { id: 'misc',        label: 'Other',             icon: '📦' }
  ];

  var KEYWORDS = {
    documents: [
      'passport', 'visa', 'id', 'identity card', 'drivers license', 'driving license',
      'license', 'licence', 'ticket', 'tickets', 'boarding pass', 'itinerary',
      'insurance', 'travel insurance', 'vaccination', 'reservation', 'booking',
      'wallet', 'purse', 'cash', 'money', 'currency', 'dollars', 'euros', 'shekels',
      'credit card', 'debit card', 'card', 'coins', 'sim', 'sim card', 'esim',
      'permit', 'form', 'certificate', 'contract', 'documents', 'papers', 'copies',
      'orders', 'call up orders', 'military id', 'dog tags', 'tags',
      'דרכון', 'דרכונים', 'תעודת זהות', 'תעודות', 'תעודה', 'ויזה', 'אשרה',
      'כרטיס טיסה', 'כרטיסי טיסה', 'כרטיס עלייה למטוס', 'כרטיס', 'כרטיסים',
      'ביטוח', 'ביטוח נסיעות', 'ביטוח רפואי', 'רישיון', 'רישיון נהיגה',
      'כסף', 'מזומן', 'ארנק', 'אשראי', 'כרטיס אשראי', 'שקלים', 'דולרים', 'יורו',
      'מטבעות', 'סים', 'כרטיס סים', 'מסמכים', 'טפסים', 'אישור', 'אישורים',
      'צו קריאה', 'צו 8', 'צו שמונה', 'תעודת חוגר', 'דיסקית', 'דיסקיות',
      'הזמנה', 'הזמנות', 'העתקים', 'חוזה'
    ],
    electronics: [
      'phone', 'mobile', 'smartphone', 'iphone', 'android', 'charger', 'chargers',
      'cable', 'cables', 'usb', 'usb c', 'lightning cable', 'power bank', 'powerbank',
      'battery', 'batteries', 'adapter', 'adaptor', 'plug', 'converter', 'laptop',
      'notebook computer', 'macbook', 'tablet', 'ipad', 'kindle', 'e reader',
      'headphones', 'earphones', 'earbuds', 'airpods', 'speaker', 'camera', 'gopro',
      'lens', 'memory card', 'sd card', 'tripod', 'drone', 'smartwatch', 'watch',
      'mouse', 'keyboard', 'hard drive', 'ssd', 'flash drive', 'router', 'hotspot',
      'extension cord', 'radio', 'walkie talkie', 'gps',
      'טלפון', 'פלאפון', 'סמארטפון', 'אייפון', 'מטען', 'מטענים', 'מטען נייד',
      'סוללה', 'סוללות', 'סוללות רזרביות', 'כבל', 'כבלים', 'כבל טעינה',
      'מחשב', 'מחשב נייד', 'לפטופ', 'טאבלט', 'אייפד', 'קינדל',
      'אוזניות', 'אוזניות אלחוטיות', 'רמקול', 'מצלמה', 'עדשה', 'חצובה', 'רחפן',
      'כרטיס זיכרון', 'דיסק און קי', 'כונן', 'מתאם', 'מתאם חשמל', 'שנאי', 'שקע',
      'מאריך', 'כבל מאריך', 'מפצל', 'עכבר', 'מקלדת', 'ראוטר', 'רדיו',
      'מכשיר קשר', 'שעון', 'שעון חכם', 'מטען לרכב', 'סטיק'
    ],
    toiletries: [
      'toothbrush', 'toothpaste', 'floss', 'mouthwash', 'shampoo', 'conditioner',
      'soap', 'body wash', 'shower gel', 'deodorant', 'antiperspirant', 'razor',
      'shaving cream', 'aftershave', 'comb', 'hairbrush', 'brush', 'hair gel',
      'hair ties', 'towel', 'towels', 'washcloth', 'toilet paper', 'wet wipes',
      'wipes', 'tissues', 'cotton buds', 'q tips', 'nail clipper', 'nail file',
      'tweezers', 'scissors', 'makeup', 'make up', 'lipstick', 'moisturizer',
      'moisturiser', 'face cream', 'lotion', 'sunscreen', 'sun cream', 'spf',
      'lip balm', 'perfume', 'cologne', 'contact lenses', 'lens solution',
      'glasses case', 'toiletry bag', 'washbag', 'tampons', 'pads', 'menstrual cup',
      'hand sanitizer', 'sanitiser', 'earplugs', 'ear plugs',
      'מברשת שיניים', 'משחת שיניים', 'חוט דנטלי', 'מי פה', 'שמפו', 'מרכך',
      'סבון', 'ג׳ל רחצה', 'קרם רחצה', 'דאודורנט', 'סכין גילוח', 'מכונת גילוח',
      'גילוח', 'ג׳ל גילוח', 'אפטרשייב', 'מסרק', 'מברשת שיער', 'מברשת',
      'גומיות לשיער', 'ג׳ל לשיער', 'מגבת', 'מגבות', 'מגבת ים', 'מגבונים',
      'מגבונים לחים', 'נייר טואלט', 'טישו', 'ממחטות', 'קוטם ציפורניים',
      'מספריים', 'פינצטה', 'איפור', 'שפתון', 'קרם לחות', 'קרם פנים', 'קרם ידיים',
      'קרם', 'קרם הגנה', 'קרם שיזוף', 'בושם', 'עדשות מגע', 'נוזל לעדשות',
      'תיק רחצה', 'טמפונים', 'תחבושות היגייניות', 'ג׳ל אלכוהול', 'אלכוג׳ל',
      'מטהר ידיים', 'אטמי אוזניים', 'קרם אחרי שיזוף', 'צמר גפן'
    ],
    health: [
      'medicine', 'medication', 'meds', 'pills', 'tablets', 'painkiller',
      'painkillers', 'ibuprofen', 'paracetamol', 'acamol', 'advil', 'aspirin',
      'antibiotics', 'antihistamine', 'allergy', 'inhaler', 'epipen', 'insulin',
      'vitamins', 'supplements', 'prescription', 'first aid', 'first aid kit',
      'band aid', 'bandaid', 'bandage', 'bandages', 'plaster', 'plasters', 'gauze',
      'antiseptic', 'alcohol swabs', 'iodine', 'thermometer', 'tourniquet',
      'israeli bandage', 'compression bandage', 'motion sickness', 'anti nausea',
      'imodium', 'electrolytes', 'ors', 'condoms', 'mask', 'masks',
      'blister plasters', 'bug spray', 'insect repellent', 'mosquito repellent',
      'after bite',
      'תרופה', 'תרופות', 'תרופות אישיות', 'כדורים', 'אקמול', 'נורופן', 'אדוויל',
      'אספירין', 'אנטיביוטיקה', 'אנטיהיסטמין', 'כדורי אלרגיה', 'משאף', 'אינהלר',
      'אפיפן', 'אינסולין', 'ויטמינים', 'תוספי תזונה', 'מרשם', 'מרשמים',
      'ערכת עזרה ראשונה', 'עזרה ראשונה', 'פלסטר', 'פלסטרים', 'פלסטרים לשלפוחיות',
      'אגד', 'אגד מדבק', 'תחבושת', 'תחבושות', 'תחבושת אישית', 'גזה',
      'חומר חיטוי', 'חיטוי', 'מד חום', 'כדורים נגד בחילה', 'נגד בחילות',
      'משחה', 'כפפות חד פעמיות', 'מסכות', 'מסכה', 'קרם נגד יתושים',
      'ספריי נגד יתושים', 'דוחה יתושים', 'אפטר בייט', 'חוסם עורקים', 'קונדומים'
    ],
    military: [
      'uniform', 'uniforms', 'fatigues', 'combat uniform', 'class a', 'class b',
      'beret', 'helmet', 'vest', 'ceramic vest', 'plate carrier', 'body armor',
      'body armour', 'webbing', 'chest rig', 'magazine', 'magazines', 'mag pouch',
      'ammo', 'ammunition', 'rifle', 'weapon', 'gun', 'sling', 'cleaning kit',
      'gun oil', 'bore snake', 'boot polish', 'insignia', 'rank', 'name tag',
      'canteen', 'canteens', 'camelbak', 'hydration pack', 'poncho', 'shelter half',
      'nvg', 'night vision', 'gas mask', 'ear protection',
      'tactical gloves', 'knee pads', 'duffel', 'duffel bag', 'kitbag', 'kit bag',
      'entrenching tool', 'camo', 'camouflage', 'field jacket',
      'מדים', 'מדי א', 'מדי ב', 'מדי שטח', 'מדי עבודה', 'כומתה', 'קסדה',
      'אפוד', 'אפוד קרמי', 'שכפץ', 'חגור', 'פאוץ', 'נרתיק מחסניות',
      'מחסנית', 'מחסניות', 'תחמושת', 'נשק', 'רובה', 'רצועת נשק', 'ערכת ניקוי',
      'שמן לנשק', 'משחת נעליים', 'סמלי דרגה', 'דרגות', 'תג שם', 'תגי שם',
      'מימייה', 'מימיות', 'ג׳ריקן', 'פונצ׳ו', 'שק שינה צבאי', 'אלונקה',
      'משקפי מגן', 'מגני אוזניים', 'כפפות טקטיות', 'ברכיות', 'שק דאפל',
      'כיתבג', 'תיק צבאי', 'את חפירה', 'מסכת אבכ', 'דובון', 'סרט זיהוי',
      'ציוד קרבי', 'ציוד צבאי', 'נרתיק'
    ],
    gear: [
      'backpack', 'daypack', 'rucksack', 'suitcase', 'luggage', 'carry on',
      'packing cubes', 'dry bag', 'tent', 'tarp', 'stakes', 'tent stakes',
      'guy lines', 'sleeping bag', 'bivy', 'hammock', 'stove', 'camping stove',
      'gas canister', 'fuel', 'lighter', 'matches', 'firestarter', 'flashlight',
      'torch', 'headlamp', 'lantern', 'multitool', 'leatherman', 'knife',
      'pocket knife', 'paracord', 'rope', 'carabiner', 'compass', 'map', 'maps',
      'binoculars', 'trekking poles', 'walking poles', 'water filter',
      'water bottle', 'thermos', 'hydration bladder', 'duct tape', 'zip ties',
      'sewing kit', 'umbrella', 'rain cover', 'poncho liner', 'laundry bag',
      'trash bags', 'ziplock', 'ziploc', 'padlock', 'lock', 'shovel',
      'תיק', 'תיקים', 'תרמיל', 'תרמילון', 'תיק גב', 'תיק יום', 'מזוודה',
      'מזוודות', 'טרולי', 'תיק עלייה למטוס', 'אורגנייזרים', 'שקית אטומה',
      'אוהל', 'יתדות', 'ברזנט', 'שק שינה', 'ערסל', 'גזייה', 'בלון גז',
      'דלק', 'מצית', 'גפרורים', 'פנס', 'פנס ראש', 'פנס כיס', 'פנסים',
      'פנס חירום', 'סכין', 'אולר', 'רב כלי', 'לידרמן', 'פרקורד', 'חבל',
      'קרבינר', 'מצפן', 'מפה', 'מפות', 'משקפת', 'מקלות הליכה', 'מסנן מים',
      'בקבוק מים', 'בקבוקי מים', 'תרמוס', 'שלוקר', 'איזולירבנד', 'סקוטש',
      'ערכת תפירה', 'מטרייה', 'כיסוי גשם', 'שקית כביסה', 'שקיות אשפה',
      'שקיות', 'שקית', 'מנעול', 'מנעולים', 'את חפירה קטן', 'כלי עבודה'
    ],
    sleep: [
      'pillow', 'pillowcase', 'blanket', 'sheet', 'sheets', 'bed linen', 'duvet',
      'sleep mask', 'eye mask', 'pyjamas', 'pajamas', 'nightgown', 'travel pillow',
      'air mattress', 'mattress', 'sleeping pad', 'sleeping mat', 'inflatable pillow',
      'כרית', 'כריות', 'ציפית', 'שמיכה', 'שמיכות', 'שמיכת פוך', 'סדין', 'סדינים',
      'פיג׳מה', 'פיז׳מה', 'כותונת לילה', 'מסכת שינה', 'כיסוי עיניים',
      'כרית נסיעה', 'מזרן', 'מזרן מתנפח', 'מזרן שטח', 'מיטה מתנפחת'
    ],
    footwear: [
      'shoes', 'sneakers', 'trainers', 'running shoes', 'boots', 'combat boots',
      'hiking boots', 'sandals', 'flip flops', 'flipflops', 'slippers', 'crocs',
      'heels', 'dress shoes', 'water shoes', 'insoles', 'shoe laces', 'laces',
      'נעליים', 'נעלי ספורט', 'נעלי ריצה', 'נעלי הליכה', 'נעלי עבודה',
      'נעליים אלגנטיות', 'נעלי בית', 'מגפיים', 'מגפי צבא', 'נעלי צבא',
      'סנדלים', 'כפכפים', 'קרוקס', 'עקבים', 'מדרסים', 'שרוכים', 'נעל'
    ],
    clothing: [
      'shirt', 'shirts', 't shirt', 'tshirt', 'tee', 'tees', 'polo', 'blouse',
      'sweater', 'jumper', 'hoodie', 'sweatshirt', 'fleece', 'jacket', 'coat',
      'raincoat', 'windbreaker', 'parka', 'pants', 'trousers',
      'jeans', 'chinos', 'shorts', 'skirt', 'dress', 'suit', 'blazer', 'tie',
      'belt', 'socks', 'sock', 'underwear', 'undies', 'boxers', 'briefs', 'bra',
      'bras', 'thermals', 'base layer', 'leggings', 'tights', 'swimsuit',
      'swimwear', 'bathing suit', 'bikini', 'trunks', 'hat', 'cap', 'beanie',
      'sun hat', 'scarf', 'gloves', 'mittens', 'sunglasses', 'undershirt',
      'change of clothes', 'laundry', 'clothes', 'clothing', 'kids clothes',
      'חולצה', 'חולצות', 'טי שירט', 'טישרט', 'גופייה', 'גופיות', 'חולצת פולו',
      'מכנסיים', 'מכנסיים קצרים', 'מכנסונים', 'ג׳ינס', 'חצאית', 'שמלה',
      'חליפה', 'בלייזר', 'עניבה', 'חגורה', 'גרב', 'גרביים', 'גרביונים',
      'תחתונים', 'תחתון', 'בוקסרים', 'חזייה', 'חזיות', 'תרמיות', 'תרמי',
      'טרנינג', 'סווטשירט', 'קפוצ׳ון', 'סוודר', 'מעיל', 'מעיל גשם', 'ג׳קט',
      'פליז', 'מיקרופליז', 'בגד ים', 'ביקיני', 'כובע', 'כובע שמש', 'כובע גרב',
      'צעיף', 'כפפות', 'משקפי שמש', 'בגדים', 'בגדים להחלפה', 'בגדי ילדים',
      'כביסה', 'פוך', 'שכבה ראשונה'
    ],
    food: [
      'snacks', 'snack', 'bars', 'energy bar', 'energy bars', 'protein bar',
      'granola', 'nuts', 'trail mix', 'chocolate', 'candy', 'gum', 'crackers',
      'sandwiches', 'sandwich', 'instant coffee', 'coffee', 'tea', 'tea bags',
      'sugar', 'water', 'juice', 'soda', 'drinks', 'canned food', 'tuna',
      'instant noodles', 'soup', 'rations', 'mre', 'cutlery', 'spork', 'plate',
      'bowl', 'mug', 'cup', 'can opener', 'napkins', 'cooler', 'ice pack',
      'חטיף', 'חטיפים', 'חטיפי אנרגיה', 'במבה', 'שוקולד', 'סוכריות', 'מסטיק',
      'קרקרים', 'אגוזים', 'פיצוחים', 'כריך', 'כריכים', 'קפה', 'קפה נמס',
      'נס קפה', 'תה', 'סוכר', 'שתייה', 'מיץ', 'שימורים', 'טונה', 'אטריות',
      'מרק', 'מנות קרב', 'אוכל', 'ספל', 'כוס', 'סכום', 'מזלג', 'כפית',
      'צלחת', 'קערה', 'פותחן', 'מפיות', 'צידנית', 'קרחומים', 'קופסת אוכל'
    ],
    sports: [
      'gym clothes', 'gym', 'workout', 'yoga mat', 'jump rope', 'resistance bands',
      'weights', 'goggles', 'swim cap', 'snorkel', 'fins', 'surfboard', 'wetsuit',
      'bike', 'bike helmet', 'racket', 'ball', 'shaker', 'protein powder',
      'fitness tracker', 'running belt', 'beach umbrella',
      'בגדי ספורט', 'בגדי אימון', 'חדר כושר', 'מזרן יוגה', 'יוגה', 'חבל קפיצה',
      'גומיות התנגדות', 'משקולות', 'משקפי שחייה', 'כובע ים', 'שנורקל',
      'סנפירים', 'גלשן', 'חליפת צלילה', 'אופניים', 'קסדת אופניים', 'מחבט',
      'כדור', 'שייקר', 'אבקת חלבון', 'שעון ספורט', 'שמשייה'
    ],
    work: [
      'laptop bag', 'notebook', 'notepad', 'pen', 'pens', 'pencil', 'markers',
      'highlighter', 'stapler', 'folder', 'binder', 'business cards', 'presentation',
      'projector', 'name badge', 'book', 'books', 'textbook', 'calculator',
      'planner', 'diary', 'sticky notes', 'envelope',
      'מחברת', 'מחברות', 'פנקס', 'עט', 'עטים', 'עיפרון', 'מרקר', 'מדגש',
      'מחשבון', 'ספר', 'ספרים', 'קלסר', 'תיקייה', 'כרטיסי ביקור', 'מצגת',
      'מקרן', 'תיק מחשב', 'יומן', 'פתקים', 'פתקיות', 'מעטפה', 'שדכן'
    ],
    kids: [
      'diapers', 'nappies', 'baby food', 'formula', 'baby bottle',
      'pacifier', 'dummy', 'stroller', 'pram', 'car seat', 'baby carrier', 'bib',
      'toys', 'toy', 'stuffed animal', 'teddy', 'colouring book', 'coloring book',
      'crayons', 'baby monitor', 'high chair', 'kids sunscreen', 'kids medication',
      'חיתולים', 'חיתול', 'מגבוני תינוקות', 'אוכל לתינוק', 'מטרנה', 'תמל',
      'פורמולה', 'בקבוק תינוק', 'מוצץ', 'סינר', 'עגלה', 'עגלת תינוק',
      'כיסא בטיחות', 'מנשא', 'מנשא תינוק', 'צעצוע', 'צעצועים', 'בובה', 'דובי',
      'ספר צביעה', 'צבעים', 'מוניטור', 'כיסא אוכל', 'בגדי תינוק',
      'קרם הגנה לילדים', 'תרופות לילדים', 'כיסוי גשם לעגלה'
    ]
  };

  var CATEGORY_BY_ID = {};
  CATEGORIES.forEach(function (c, i) { CATEGORY_BY_ID[c.id] = c; c.order = i; });

  var HEBREW = /[֐-׿]/;
  var HEBREW_PREFIXES = 'ובלכמשה';   /* only stripped from what the user types */
  var HEBREW_SUFFIXES = ['יים', 'ים', 'ות'];

  function isHebrew(word) { return HEBREW.test(word); }

  /*
   * Hebrew words carry attached prefixes (ה/ו/ב/ל/כ/מ/ש) and plural or dual
   * endings, so "ומגבות" and "מגבת" are the same item. Two conservative steps
   * handle that:
   *
   *   stem()        drops a plural/dual ending, and is applied to keywords and
   *                 to item text alike.
   *   stripPrefix() drops one leading prefix letter, and is only ever applied
   *                 to what the user typed - never to a keyword, because plenty
   *                 of real words (מגבת, מזרן, כובע) start with those letters.
   */
  function stem(word) {
    if (!isHebrew(word)) return word;
    for (var i = 0; i < HEBREW_SUFFIXES.length; i++) {
      var suffix = HEBREW_SUFFIXES[i];
      if (word.length - suffix.length >= 3 && word.slice(-suffix.length) === suffix) {
        return word.slice(0, -suffix.length);
      }
    }
    return word;
  }

  /* All readings of a Hebrew word, peeling up to two prefix letters:
     "שהתרופות" -> ["שהתרופות", "התרופות", "תרופות"] */
  function prefixForms(word) {
    var forms = [word];
    if (!isHebrew(word)) return forms;
    var current = word;
    for (var i = 0; i < 2; i++) {
      if (current.length - 1 < 3) break;
      if (HEBREW_PREFIXES.indexOf(current.charAt(0)) === -1) break;
      current = current.slice(1);
      forms.push(current);
    }
    return forms;
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[֑-ׇ]/g, '')          /* Hebrew niqqud and cantillation */
      .replace(/[׳״'"׳״]/g, '')       /* geresh / gershayim */
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  /* Pre-compile the keyword table into a flat, score-sorted list. */
  var INDEX = [];
  Object.keys(KEYWORDS).forEach(function (catId) {
    KEYWORDS[catId].forEach(function (raw) {
      var kw = normalize(raw);
      if (!kw) return;
      INDEX.push({
        cat: catId,
        kw: kw,
        words: kw.split(' '),
        stems: kw.split(' ').map(stem),
        len: kw.length
      });
    });
  });
  INDEX.sort(function (a, b) { return b.len - a.len; });

  /*
   * Scores one keyword against the item. Exact matches beat stem matches, and
   * longer keywords beat shorter ones so "sleeping bag" wins over "bag".
   */
  function score(item, entry) {
    var kw = entry.kw;
    if (!kw) return 0;

    if (entry.words.length > 1) {
      /* multi-word keyword: match the phrase, on word boundaries */
      var phrase = ' ' + kw + ' ';
      if ((' ' + item.text + ' ').indexOf(phrase) !== -1 ||
          (' ' + item.bareText + ' ').indexOf(phrase) !== -1) {
        return kw.length * 3;
      }
      var stemPhrase = ' ' + entry.stems.join(' ') + ' ';
      if ((' ' + item.stemText + ' ').indexOf(stemPhrase) !== -1 ||
          (' ' + item.bareStemText + ' ').indexOf(stemPhrase) !== -1) {
        return kw.length * 3 - 1;
      }
      return 0;
    }

    for (var i = 0; i < item.words.length; i++) {
      var word = item.words[i];
      if (item.forms[i].indexOf(kw) !== -1) return kw.length * 3 + 2;

      /* Hebrew: compare stems, so prefixes and plurals still match */
      if (isHebrew(kw) && entry.stems[0].length >= 3 &&
          item.stems[i].indexOf(entry.stems[0]) !== -1) {
        return kw.length * 3;
      }

      /* Latin: tolerate a short suffix, so "socks" matches "sock" */
      if (!isHebrew(word)) {
        if (word.length > kw.length && word.length - kw.length <= 2 && word.indexOf(kw) === 0) {
          return kw.length * 3 - 1;
        }
        if (kw.length > word.length && kw.length - word.length <= 2 &&
            kw.indexOf(word) === 0 && word.length >= 4) {
          return word.length * 3 - 1;
        }
      }
    }
    return 0;
  }

  /*
   * categorize(name, learned)
   *   name    - raw item text, in either language
   *   learned - optional { normalisedName: categoryId } map of user corrections,
   *             which always wins over the built-in keywords.
   */
  function categorize(name, learned) {
    var text = normalize(name);
    if (!text) return 'misc';
    if (learned && Object.prototype.hasOwnProperty.call(learned, text)) {
      var remembered = learned[text];
      if (CATEGORY_BY_ID[remembered]) return remembered;
    }

    var words = text.split(' ');
    var forms = words.map(prefixForms);
    var stems = forms.map(function (list) {
      return list.map(stem);
    });
    /* Phrase readings: as typed, and with every prefix peeled off. */
    var bareWords = forms.map(function (list) { return list[list.length - 1]; });
    var item = {
      text: text,
      words: words,
      forms: forms,
      stems: stems,
      bareText: bareWords.join(' '),
      stemText: words.map(stem).join(' '),
      bareStemText: bareWords.map(stem).join(' ')
    };

    var best = null, bestScore = 0;
    for (var i = 0; i < INDEX.length; i++) {
      var entry = INDEX[i];
      var s = score(item, entry);
      if (s > bestScore) {
        bestScore = s;
        best = entry.cat;
      } else if (s > 0 && s === bestScore && best &&
                 CATEGORY_BY_ID[entry.cat].order < CATEGORY_BY_ID[best].order) {
        best = entry.cat;
      }
    }
    return best || 'misc';
  }

  function get(id) {
    return CATEGORY_BY_ID[id] || CATEGORY_BY_ID.misc;
  }

  /* Display name in the current language, falling back to English. */
  function label(id) {
    var category = get(id);
    var i18n = global.PMU && global.PMU.i18n;
    return i18n ? i18n.t('cat.' + category.id) : category.label;
  }

  global.PMU = global.PMU || {};
  global.PMU.categories = {
    all: CATEGORIES,
    get: get,
    label: label,
    categorize: categorize,
    normalize: normalize,
    stem: stem
  };
})(window);
