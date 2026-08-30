/*
 * PackMeUp - automatic categorisation
 *
 * Given a free-text item name ("2 pairs of wool socks") this module decides
 * which segment/category the item belongs to. It is a keyword scoring engine:
 * every category owns a list of keywords, the longest keyword that matches the
 * item wins. Keywords are given in English and Hebrew so the app is usable for
 * both travelling and reserve duty (miluim) lists.
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
      'orders', 'military id', 'dog tags', 'tags',
      'דרכון', 'תעודת זהות', 'אשראי', 'כסף', 'ארנק',
      'כרטיס', 'ביטוח', 'רישיון', 'דיסקית', 'מסמכים'
    ],
    electronics: [
      'phone', 'mobile', 'smartphone', 'iphone', 'android', 'charger', 'chargers',
      'cable', 'cables', 'usb', 'usb c', 'lightning cable', 'power bank', 'powerbank',
      'battery', 'batteries', 'adapter', 'adaptor', 'plug', 'converter', 'laptop',
      'notebook computer', 'macbook', 'tablet', 'ipad', 'kindle', 'e reader',
      'headphones', 'earphones', 'earbuds', 'airpods', 'speaker', 'camera', 'gopro',
      'lens', 'memory card', 'sd card', 'tripod', 'drone', 'smartwatch', 'watch',
      'mouse', 'keyboard', 'hard drive', 'ssd', 'flash drive', 'router', 'hotspot',
      'extension cord', 'headlamp battery', 'radio', 'walkie talkie', 'gps',
      'מטען', 'פלאפון', 'מחשב', 'כבל', 'סוללה', 'אוזניות', 'מצלמה', 'מטען נייד'
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
      'מברשת שיניים', 'משחת שיניים', 'סבון', 'שמפו', 'דאודורנט',
      'מגבת', 'גילוח', 'מגבונים', 'קרם הגנה', 'אטמי אוזניים'
    ],
    health: [
      'medicine', 'medication', 'meds', 'pills', 'tablets', 'painkiller',
      'painkillers', 'ibuprofen', 'paracetamol', 'acamol', 'advil', 'aspirin',
      'antibiotics', 'antihistamine', 'allergy', 'inhaler', 'epipen', 'insulin',
      'vitamins', 'supplements', 'prescription', 'first aid', 'first aid kit',
      'band aid', 'bandaid', 'bandage', 'bandages', 'plaster', 'plasters', 'gauze',
      'antiseptic', 'alcohol swabs', 'iodine', 'thermometer', 'tourniquet',
      'israeli bandage', 'compression bandage', 'motion sickness', 'anti nausea',
      'imodium', 'electrolytes', 'ors', 'condoms', 'mask', 'masks', 'gloves',
      'bug spray', 'insect repellent', 'mosquito repellent', 'after bite',
      'תרופות', 'אקמול', 'נורופן', 'עזרה ראשונה', 'אגד', 'חבישה', 'ויטמינים'
    ],
    military: [
      'uniform', 'uniforms', 'fatigues', 'combat uniform', 'class a', 'class b',
      'beret', 'helmet', 'vest', 'ceramic vest', 'plate carrier', 'body armor',
      'body armour', 'webbing', 'chest rig', 'magazine', 'magazines', 'mag pouch',
      'ammo', 'ammunition', 'rifle', 'weapon', 'gun', 'sling', 'cleaning kit',
      'gun oil', 'bore snake', 'boot polish', 'insignia', 'rank', 'name tag',
      'canteen', 'canteens', 'camelbak', 'hydration pack', 'poncho', 'shelter half',
      'sleeping mat', 'nvg', 'night vision', 'gas mask', 'ear protection',
      'tactical gloves', 'knee pads', 'duffel', 'duffel bag', 'kitbag', 'kit bag',
      'shovel', 'entrenching tool', 'camo', 'camouflage', 'field jacket', 'dubon',
      'מדים', 'מדי א', 'מדי ב', 'כומתה', 'קסדה', 'וסט', 'אפוד', 'מחסנית',
      'נשק', 'רובה', 'מימיה', 'חגור', 'שק שינה צבאי', 'דובון', 'פונצו\'', 'מגבוני צבא'
    ],
    gear: [
      'backpack', 'daypack', 'rucksack', 'suitcase', 'luggage', 'carry on',
      'packing cubes', 'dry bag', 'tent', 'tarp', 'stakes', 'guy lines',
      'sleeping bag', 'bivy', 'hammock', 'stove', 'gas canister', 'fuel',
      'lighter', 'matches', 'firestarter', 'flashlight', 'torch', 'headlamp',
      'lantern', 'multitool', 'leatherman', 'knife', 'pocket knife', 'paracord',
      'rope', 'carabiner', 'compass', 'map', 'maps', 'binoculars', 'trekking poles',
      'walking poles', 'water filter', 'water bottle', 'thermos', 'hydration bladder',
      'duct tape', 'zip ties', 'sewing kit', 'umbrella', 'rain cover', 'poncho liner',
      'laundry bag', 'trash bags', 'ziplock', 'ziploc', 'padlock', 'lock',
      'תיק', 'מזוודה', 'אוהל', 'שק שינה', 'פנס', 'סכין', 'מצית', 'בקבוק מים', 'מצפן'
    ],
    sleep: [
      'pillow', 'pillowcase', 'blanket', 'sheet', 'sheets', 'bed linen', 'duvet',
      'sleep mask', 'eye mask', 'pyjamas', 'pajamas', 'nightgown', 'travel pillow',
      'air mattress', 'mattress', 'sleeping pad', 'inflatable pillow',
      'כרית', 'שמיכה', 'סדין', 'פיגמה', 'מזרן', 'מסכת שינה'
    ],
    footwear: [
      'shoes', 'sneakers', 'trainers', 'running shoes', 'boots', 'combat boots',
      'hiking boots', 'sandals', 'flip flops', 'flipflops', 'slippers', 'crocs',
      'heels', 'dress shoes', 'water shoes', 'insoles', 'shoe laces', 'laces',
      'נעליים', 'מגפיים', 'סנדלים', 'כפכפים', 'נעלי ספורט'
    ],
    clothing: [
      'shirt', 'shirts', 't shirt', 'tshirt', 'tee', 'tees', 'polo', 'blouse',
      'sweater', 'jumper', 'hoodie', 'sweatshirt', 'fleece', 'jacket', 'coat',
      'raincoat', 'windbreaker', 'parka', 'vest jacket', 'pants', 'trousers',
      'jeans', 'chinos', 'shorts', 'skirt', 'dress', 'suit', 'blazer', 'tie',
      'belt', 'socks', 'sock', 'underwear', 'undies', 'boxers', 'briefs', 'bra',
      'bras', 'thermals', 'base layer', 'leggings', 'tights', 'swimsuit',
      'swimwear', 'bathing suit', 'bikini', 'trunks', 'hat', 'cap', 'beanie',
      'scarf', 'gloves clothing', 'mittens', 'sunglasses', 'poncho rain',
      'laundry', 'clothes', 'clothing',
      'חולצה', 'חולצות', 'מכנסיים', 'גרביים', 'תחתונים', 'סוודר', 'מעיל',
      'בגד ים', 'כובע', 'משקפי שמש', 'בגדים'
    ],
    food: [
      'snacks', 'snack', 'bars', 'energy bar', 'protein bar', 'granola', 'nuts',
      'trail mix', 'chocolate', 'candy', 'gum', 'crackers', 'sandwiches',
      'sandwich', 'instant coffee', 'coffee', 'tea', 'tea bags', 'sugar', 'water',
      'juice', 'soda', 'drinks', 'canned food', 'tuna', 'instant noodles', 'soup',
      'rations', 'mre', 'cutlery', 'spork', 'plate', 'bowl', 'mug', 'cup',
      'can opener', 'napkins', 'cooler', 'ice pack',
      'חטיפים', 'שוקולד', 'קפה', 'תה', 'מים', 'אוכל', 'סכום', 'שימורים'
    ],
    sports: [
      'gym clothes', 'gym', 'workout', 'yoga mat', 'jump rope', 'resistance bands',
      'weights', 'goggles', 'swim cap', 'snorkel', 'fins', 'surfboard', 'wetsuit',
      'helmet bike', 'bike', 'racket', 'ball', 'gloves gym', 'shaker', 'protein powder',
      'fitness tracker', 'running belt',
      'חדר כושר', 'יוגה', 'משקפי שחייה', 'אופניים', 'כדור'
    ],
    work: [
      'laptop bag', 'notebook', 'notepad', 'pen', 'pens', 'pencil', 'markers',
      'highlighter', 'stapler', 'folder', 'binder', 'business cards', 'presentation',
      'projector', 'name badge', 'book', 'books', 'textbook', 'calculator',
      'planner', 'diary', 'sticky notes', 'envelope',
      'מחברת', 'עט', 'עיפרון', 'ספר', 'תיק מחשב'
    ],
    kids: [
      'diapers', 'nappies', 'wet wipes baby', 'baby food', 'formula', 'bottle',
      'pacifier', 'dummy', 'stroller', 'pram', 'car seat', 'baby carrier', 'bib',
      'toys', 'toy', 'stuffed animal', 'teddy', 'colouring book', 'coloring book',
      'crayons', 'baby monitor', 'high chair', 'kids clothes',
      'חיתולים', 'מוצץ', 'עגלה', 'צעצועים', 'בקבוק תינוק'
    ]
  };

  var CATEGORY_BY_ID = {};
  CATEGORIES.forEach(function (c, i) { CATEGORY_BY_ID[c.id] = c; c.order = i; });

  /* Pre-compile the keyword table into a flat, score-sorted list. */
  var INDEX = [];
  Object.keys(KEYWORDS).forEach(function (catId) {
    KEYWORDS[catId].forEach(function (kw) {
      INDEX.push({ cat: catId, kw: normalize(kw), len: kw.length });
    });
  });
  INDEX.sort(function (a, b) { return b.len - a.len; });

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[֑-ׇ]/g, '')          /* Hebrew niqqud */
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  /* Matches a keyword against the normalised item name on word boundaries.
     Returns a score, or 0 when there is no match. */
  function score(itemWords, itemText, entry) {
    var kw = entry.kw;
    if (!kw) return 0;
    if (kw.indexOf(' ') !== -1) {
      /* multi-word keyword: match as a whole phrase */
      return (' ' + itemText + ' ').indexOf(' ' + kw + ' ') !== -1 ? kw.length * 2 : 0;
    }
    for (var i = 0; i < itemWords.length; i++) {
      var w = itemWords[i];
      if (w === kw) return kw.length * 2 + 1;
      /* simple plural / suffix tolerance: "socks" matches "sock" */
      if (w.length > kw.length && w.length - kw.length <= 2 && w.indexOf(kw) === 0) {
        return kw.length * 2;
      }
      if (kw.length > w.length && kw.length - w.length <= 2 && kw.indexOf(w) === 0 && w.length >= 4) {
        return w.length * 2;
      }
    }
    return 0;
  }

  /*
   * categorize(name, learned)
   *   name    - raw item text
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
    var best = null, bestScore = 0;
    for (var i = 0; i < INDEX.length; i++) {
      var entry = INDEX[i];
      var s = score(words, text, entry);
      if (s > bestScore) {
        bestScore = s;
        best = entry.cat;
      } else if (s > 0 && s === bestScore && best && CATEGORY_BY_ID[entry.cat].order < CATEGORY_BY_ID[best].order) {
        best = entry.cat;
      }
    }
    return best || 'misc';
  }

  function get(id) {
    return CATEGORY_BY_ID[id] || CATEGORY_BY_ID.misc;
  }

  global.PMU = global.PMU || {};
  global.PMU.categories = {
    all: CATEGORIES,
    get: get,
    categorize: categorize,
    normalize: normalize
  };
})(window);
