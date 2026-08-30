/*
 * PackMeUp - starter templates.
 *
 * Names, descriptions and the item lines themselves exist in both languages;
 * the list is built from the language the app is running in. Categories are
 * assigned automatically when the list is created, and a leading number sets
 * the quantity ("3 x socks", "3 גרביים").
 */
(function (global) {
  'use strict';

  var TEMPLATES = [
    {
      id: 'blank',
      icon: '📝',
      name: { en: 'Blank list', he: 'רשימה ריקה' },
      description: {
        en: 'Start from nothing and add your own items.',
        he: 'להתחיל מאפס ולהוסיף פריטים משלכם.'
      },
      items: { en: [], he: [] }
    },
    {
      id: 'travel',
      icon: '✈️',
      name: { en: 'Trip abroad', he: 'טיול בחו״ל' },
      description: {
        en: 'Flights, hotels, a few days away.',
        he: 'טיסות, מלונות, כמה ימים בחוץ.'
      },
      items: {
        en: [
          'Passport', 'Boarding pass', 'Travel insurance', 'Credit card', 'Cash',
          'Phone', 'Phone charger', 'Power bank', 'Plug adapter', 'Headphones',
          '5 x T-shirt', '2 x Trousers', '7 x Underwear', '7 x Socks', 'Sweater',
          'Jacket', 'Pyjamas', 'Sneakers', 'Sandals', 'Sunglasses', 'Hat',
          'Toothbrush', 'Toothpaste', 'Deodorant', 'Shampoo', 'Razor', 'Sunscreen',
          'Painkillers', 'Personal medication', 'Band aids',
          'Suitcase', 'Packing cubes', 'Padlock', 'Laundry bag', 'Umbrella',
          'Book', 'Snacks', 'Water bottle'
        ],
        he: [
          'דרכון', 'כרטיס טיסה', 'ביטוח נסיעות', 'כרטיס אשראי', 'מזומן',
          'טלפון', 'מטען לטלפון', 'מטען נייד', 'מתאם חשמל', 'אוזניות',
          '5 חולצות', '2 מכנסיים', '7 תחתונים', '7 גרביים', 'סוודר',
          'מעיל', 'פיג׳מה', 'נעלי ספורט', 'סנדלים', 'משקפי שמש', 'כובע',
          'מברשת שיניים', 'משחת שיניים', 'דאודורנט', 'שמפו', 'סכין גילוח',
          'קרם הגנה', 'אקמול', 'תרופות אישיות', 'פלסטרים',
          'מזוודה', 'אורגנייזרים', 'מנעול', 'שקית כביסה', 'מטרייה',
          'ספר', 'חטיפים', 'בקבוק מים'
        ]
      }
    },
    {
      id: 'reserve',
      icon: '🪖',
      name: { en: 'Reserve duty', he: 'מילואים' },
      description: {
        en: 'Miluim / call-up kit for a few weeks in the field.',
        he: 'ציוד לצו 8 או לכמה שבועות בשטח.'
      },
      items: {
        en: [
          'Military ID', 'Dog tags', 'Call-up orders', 'Cash',
          '2 x Combat uniform', 'Class A uniform', 'Beret', 'Belt',
          'Combat boots', '2 x Insoles', '10 x Socks', '10 x Underwear',
          '4 x Undershirt', 'Thermals', 'Fleece', 'Field jacket', 'Gloves', 'Beanie',
          'Sleeping bag', 'Sleeping mat', 'Pillow', 'Blanket',
          'Duffel bag', 'Daypack', 'Headlamp', 'Spare batteries', 'Multitool',
          'Paracord', 'Duct tape', 'Canteen', 'Hydration pack', 'Poncho',
          'Towel', 'Toothbrush', 'Toothpaste', 'Soap', 'Deodorant', 'Razor',
          'Wet wipes', 'Toilet paper', 'Earplugs', 'Nail clipper',
          'Painkillers', 'Personal medication', 'Israeli bandage', 'Blister plasters',
          'Sunscreen', 'Insect repellent',
          'Phone charger', 'Power bank', 'Extension cord', 'Watch',
          'Instant coffee', 'Sugar', 'Snacks', 'Energy bars', 'Mug', 'Cutlery',
          'Book', 'Notepad', 'Pen', 'Laundry bag', 'Trash bags'
        ],
        he: [
          'תעודת חוגר', 'דיסקית', 'צו קריאה', 'מזומן',
          '2 מדי ב', 'מדי א', 'כומתה', 'חגורה',
          'נעלי צבא', '2 מדרסים', '10 גרביים', '10 תחתונים',
          '4 גופיות', 'תרמיות', 'פליז', 'דובון', 'כפפות', 'כובע גרב',
          'שק שינה', 'מזרן שטח', 'כרית', 'שמיכה',
          'שק דאפל', 'תיק יום', 'פנס ראש', 'סוללות רזרביות', 'רב כלי',
          'פרקורד', 'איזולירבנד', 'מימייה', 'שתייה', 'פונצ׳ו',
          'מגבת', 'מברשת שיניים', 'משחת שיניים', 'סבון', 'דאודורנט', 'סכין גילוח',
          'מגבונים לחים', 'נייר טואלט', 'אטמי אוזניים', 'קוטם ציפורניים',
          'אקמול', 'תרופות אישיות', 'תחבושת אישית', 'פלסטרים לשלפוחיות',
          'קרם הגנה', 'דוחה יתושים',
          'מטען לטלפון', 'מטען נייד', 'כבל מאריך', 'שעון',
          'קפה נמס', 'סוכר', 'חטיפים', 'חטיפי אנרגיה', 'ספל', 'סכום',
          'ספר', 'מחברת', 'עט', 'שקית כביסה', 'שקיות אשפה'
        ]
      }
    },
    {
      id: 'weekend',
      icon: '🧳',
      name: { en: 'Weekend away', he: 'סופ״ש קצר' },
      description: {
        en: 'Two or three nights, light packing.',
        he: 'שניים־שלושה לילות, אריזה קלה.'
      },
      items: {
        en: [
          'ID', 'Wallet', 'Phone charger', 'Power bank', 'Headphones',
          '3 x T-shirt', 'Trousers', 'Shorts', '3 x Underwear', '3 x Socks',
          'Sweater', 'Pyjamas', 'Sneakers', 'Sunglasses',
          'Toothbrush', 'Toothpaste', 'Deodorant', 'Shampoo', 'Towel',
          'Painkillers', 'Sunscreen', 'Book', 'Snacks', 'Water bottle', 'Backpack'
        ],
        he: [
          'תעודת זהות', 'ארנק', 'מטען לטלפון', 'מטען נייד', 'אוזניות',
          '3 חולצות', 'מכנסיים', 'מכנסיים קצרים', '3 תחתונים', '3 גרביים',
          'סוודר', 'פיג׳מה', 'נעלי ספורט', 'משקפי שמש',
          'מברשת שיניים', 'משחת שיניים', 'דאודורנט', 'שמפו', 'מגבת',
          'אקמול', 'קרם הגנה', 'ספר', 'חטיפים', 'בקבוק מים', 'תיק גב'
        ]
      }
    },
    {
      id: 'camping',
      icon: '⛺',
      name: { en: 'Camping & hiking', he: 'קמפינג וטיולים' },
      description: {
        en: 'Nights outdoors, everything on your back.',
        he: 'לילות בשטח, הכול על הגב.'
      },
      items: {
        en: [
          'ID', 'Cash', 'Map', 'Compass', 'Phone', 'Power bank', 'Headlamp',
          'Spare batteries', 'Backpack', 'Rain cover', 'Tent', 'Tent stakes',
          'Sleeping bag', 'Sleeping pad', 'Camping stove', 'Gas canister', 'Lighter',
          'Matches', 'Multitool', 'Pocket knife', 'Paracord', 'Water filter',
          '2 x Water bottle', 'Thermos', 'Mug', 'Spork', 'Bowl',
          'Hiking boots', '3 x Hiking socks', 'Thermals', 'Fleece', 'Rain jacket',
          'Hat', 'Sunglasses', 'Gloves', 'Trekking poles',
          'First aid kit', 'Blister plasters', 'Sunscreen', 'Insect repellent',
          'Toilet paper', 'Wet wipes', 'Trash bags', 'Trail mix', 'Energy bars'
        ],
        he: [
          'תעודת זהות', 'מזומן', 'מפה', 'מצפן', 'טלפון', 'מטען נייד', 'פנס ראש',
          'סוללות רזרביות', 'תיק גב', 'כיסוי גשם', 'אוהל', 'יתדות',
          'שק שינה', 'מזרן שטח', 'גזייה', 'בלון גז', 'מצית', 'גפרורים',
          'רב כלי', 'אולר', 'פרקורד', 'מסנן מים',
          '2 בקבוקי מים', 'תרמוס', 'ספל', 'סכום', 'קערה',
          'נעלי הליכה', '3 גרביים', 'תרמיות', 'פליז', 'מעיל גשם',
          'כובע', 'משקפי שמש', 'כפפות', 'מקלות הליכה',
          'ערכת עזרה ראשונה', 'פלסטרים לשלפוחיות', 'קרם הגנה', 'דוחה יתושים',
          'נייר טואלט', 'מגבונים לחים', 'שקיות אשפה', 'פיצוחים', 'חטיפי אנרגיה'
        ]
      }
    },
    {
      id: 'beach',
      icon: '🏖️',
      name: { en: 'Beach day', he: 'יום בים' },
      description: {
        en: 'Sun, sand and a short drive.',
        he: 'שמש, חול ונסיעה קצרה.'
      },
      items: {
        en: [
          'Swimsuit', 'Towel', 'Sunscreen', 'Sunglasses', 'Hat', 'Flip flops',
          'Change of clothes', 'Water bottle', 'Snacks', 'Cooler', 'Speaker',
          'Phone', 'Power bank', 'Cash', 'Beach umbrella', 'Ball', 'Wet wipes',
          'Trash bags', 'Dry bag'
        ],
        he: [
          'בגד ים', 'מגבת ים', 'קרם הגנה', 'משקפי שמש', 'כובע', 'כפכפים',
          'בגדים להחלפה', 'בקבוק מים', 'חטיפים', 'צידנית', 'רמקול',
          'טלפון', 'מטען נייד', 'מזומן', 'שמשייה', 'כדור', 'מגבונים לחים',
          'שקיות אשפה', 'שקית אטומה'
        ]
      }
    },
    {
      id: 'business',
      icon: '💼',
      name: { en: 'Business trip', he: 'נסיעת עבודה' },
      description: {
        en: 'Meetings, a laptop and a suit that survives the flight.',
        he: 'פגישות, מחשב וחליפה ששורדת את הטיסה.'
      },
      items: {
        en: [
          'Passport', 'ID', 'Boarding pass', 'Credit card', 'Business cards',
          'Laptop', 'Laptop charger', 'Mouse', 'Phone charger', 'Power bank',
          'Plug adapter', 'Headphones', 'Notebook', 'Pen',
          'Suit', 'Blazer', '3 x Shirt', 'Tie', 'Belt', 'Dress shoes',
          '3 x Underwear', '3 x Socks', 'Pyjamas', 'Gym clothes', 'Sneakers',
          'Toothbrush', 'Toothpaste', 'Deodorant', 'Razor', 'Shampoo',
          'Painkillers', 'Personal medication', 'Carry on', 'Umbrella'
        ],
        he: [
          'דרכון', 'תעודת זהות', 'כרטיס טיסה', 'כרטיס אשראי', 'כרטיסי ביקור',
          'מחשב נייד', 'מטען למחשב', 'עכבר', 'מטען לטלפון', 'מטען נייד',
          'מתאם חשמל', 'אוזניות', 'מחברת', 'עט',
          'חליפה', 'בלייזר', '3 חולצות', 'עניבה', 'חגורה', 'נעליים אלגנטיות',
          '3 תחתונים', '3 גרביים', 'פיג׳מה', 'בגדי ספורט', 'נעלי ספורט',
          'מברשת שיניים', 'משחת שיניים', 'דאודורנט', 'סכין גילוח', 'שמפו',
          'אקמול', 'תרופות אישיות', 'תיק עלייה למטוס', 'מטרייה'
        ]
      }
    },
    {
      id: 'gym',
      icon: '🏋️',
      name: { en: 'Gym bag', he: 'תיק לחדר כושר' },
      description: {
        en: 'The bag you refill twice a week.',
        he: 'התיק שממלאים מחדש פעמיים בשבוע.'
      },
      items: {
        en: [
          'Gym clothes', 'Sneakers', 'Socks', 'Towel', 'Water bottle',
          'Protein powder', 'Shaker', 'Headphones', 'Deodorant', 'Shampoo',
          'Soap', 'Flip flops', 'Padlock', 'Change of clothes'
        ],
        he: [
          'בגדי אימון', 'נעלי ספורט', 'גרביים', 'מגבת', 'בקבוק מים',
          'אבקת חלבון', 'שייקר', 'אוזניות', 'דאודורנט', 'שמפו',
          'סבון', 'כפכפים', 'מנעול', 'בגדים להחלפה'
        ]
      }
    },
    {
      id: 'family',
      icon: '🧸',
      name: { en: 'Family trip with kids', he: 'טיול משפחתי עם ילדים' },
      description: {
        en: 'Everything the small humans need.',
        he: 'כל מה שהקטנטנים צריכים.'
      },
      items: {
        en: [
          'Passports', 'Travel insurance', 'Diapers', 'Wet wipes', 'Baby food',
          'Formula', 'Baby bottle', 'Pacifier', 'Bib', 'Stroller', 'Car seat',
          'Baby carrier', 'Kids clothes', 'Pyjamas', 'Sun hat', 'Kids sunscreen',
          'Toys', 'Stuffed animal', 'Coloring book', 'Crayons', 'Tablet',
          'Snacks', 'Water bottle', 'Thermometer', 'Kids medication', 'Band aids',
          'Blanket', 'Stroller rain cover', 'Trash bags'
        ],
        he: [
          'דרכונים', 'ביטוח נסיעות', 'חיתולים', 'מגבוני תינוקות', 'אוכל לתינוק',
          'פורמולה', 'בקבוק תינוק', 'מוצץ', 'סינר', 'עגלה', 'כיסא בטיחות',
          'מנשא תינוק', 'בגדי ילדים', 'פיג׳מה', 'כובע שמש', 'קרם הגנה לילדים',
          'צעצועים', 'דובי', 'ספר צביעה', 'צבעים', 'טאבלט',
          'חטיפים', 'בקבוק מים', 'מד חום', 'תרופות לילדים', 'פלסטרים',
          'שמיכה', 'כיסוי גשם לעגלה', 'שקיות אשפה'
        ]
      }
    }
  ];

  /* Picks the current language out of a { en, he } field. */
  function localized(field, lang) {
    if (!field || typeof field === 'string') return field || '';
    return field[lang] !== undefined ? field[lang] : field.en;
  }

  function get(id) {
    return TEMPLATES.filter(function (t) { return t.id === id; })[0] || null;
  }

  global.PMU = global.PMU || {};
  global.PMU.templates = {
    all: TEMPLATES,
    get: get,
    localized: localized
  };
})(window);
