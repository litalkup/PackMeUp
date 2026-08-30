/*
 * PackMeUp - starter templates.
 * Each template is just a list of item lines; categories are assigned
 * automatically when the list is created. "3 x socks" sets the quantity.
 */
(function (global) {
  'use strict';

  var TEMPLATES = [
    {
      id: 'blank',
      name: 'Blank list',
      icon: '📝',
      description: 'Start from nothing and add your own items.',
      items: []
    },
    {
      id: 'travel',
      name: 'Trip abroad',
      icon: '✈️',
      description: 'Flights, hotels, a few days away.',
      items: [
        'Passport', 'Boarding pass', 'Travel insurance', 'Credit card', 'Cash',
        'Phone', 'Phone charger', 'Power bank', 'Plug adapter', 'Headphones',
        '5 x T-shirt', '2 x Trousers', '7 x Underwear', '7 x Socks', 'Sweater',
        'Jacket', 'Pyjamas', 'Sneakers', 'Sandals', 'Sunglasses', 'Hat',
        'Toothbrush', 'Toothpaste', 'Deodorant', 'Shampoo', 'Razor', 'Sunscreen',
        'Painkillers', 'Personal medication', 'Band aids',
        'Suitcase', 'Packing cubes', 'Padlock', 'Laundry bag', 'Umbrella',
        'Book', 'Snacks', 'Water bottle'
      ]
    },
    {
      id: 'reserve',
      name: 'Reserve duty',
      icon: '🪖',
      description: 'Miluim / call-up kit for a few weeks in the field.',
      items: [
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
      ]
    },
    {
      id: 'weekend',
      name: 'Weekend away',
      icon: '🧳',
      description: 'Two or three nights, light packing.',
      items: [
        'ID', 'Wallet', 'Phone charger', 'Power bank', 'Headphones',
        '3 x T-shirt', 'Trousers', 'Shorts', '3 x Underwear', '3 x Socks',
        'Sweater', 'Pyjamas', 'Sneakers', 'Sunglasses',
        'Toothbrush', 'Toothpaste', 'Deodorant', 'Shampoo', 'Towel',
        'Painkillers', 'Sunscreen', 'Book', 'Snacks', 'Water bottle', 'Backpack'
      ]
    },
    {
      id: 'camping',
      name: 'Camping & hiking',
      icon: '⛺',
      description: 'Nights outdoors, everything on your back.',
      items: [
        'ID', 'Cash', 'Map', 'Compass', 'Phone', 'Power bank', 'Headlamp',
        'Spare batteries', 'Backpack', 'Rain cover', 'Tent', 'Tent stakes',
        'Sleeping bag', 'Sleeping pad', 'Camping stove', 'Gas canister', 'Lighter',
        'Matches', 'Multitool', 'Pocket knife', 'Paracord', 'Water filter',
        '2 x Water bottle', 'Thermos', 'Mug', 'Spork', 'Bowl',
        'Hiking boots', '3 x Hiking socks', 'Thermals', 'Fleece', 'Rain jacket',
        'Hat', 'Sunglasses', 'Gloves', 'Trekking poles',
        'First aid kit', 'Blister plasters', 'Sunscreen', 'Insect repellent',
        'Toilet paper', 'Wet wipes', 'Trash bags', 'Trail mix', 'Energy bars'
      ]
    },
    {
      id: 'beach',
      name: 'Beach day',
      icon: '🏖️',
      description: 'Sun, sand and a short drive.',
      items: [
        'Swimsuit', 'Towel', 'Sunscreen', 'Sunglasses', 'Hat', 'Flip flops',
        'Change of clothes', 'Water bottle', 'Snacks', 'Cooler', 'Speaker',
        'Phone', 'Power bank', 'Cash', 'Beach umbrella', 'Ball', 'Wet wipes',
        'Trash bags', 'Dry bag'
      ]
    },
    {
      id: 'business',
      name: 'Business trip',
      icon: '💼',
      description: 'Meetings, a laptop and a suit that survives the flight.',
      items: [
        'Passport', 'ID', 'Boarding pass', 'Credit card', 'Business cards',
        'Laptop', 'Laptop charger', 'Mouse', 'Phone charger', 'Power bank',
        'Plug adapter', 'Headphones', 'Notebook', 'Pen',
        'Suit', 'Blazer', '3 x Shirt', 'Tie', 'Belt', 'Dress shoes',
        '3 x Underwear', '3 x Socks', 'Pyjamas', 'Gym clothes', 'Sneakers',
        'Toothbrush', 'Toothpaste', 'Deodorant', 'Razor', 'Shampoo',
        'Painkillers', 'Personal medication', 'Carry on', 'Umbrella'
      ]
    },
    {
      id: 'gym',
      name: 'Gym bag',
      icon: '🏋️',
      description: 'The bag you refill twice a week.',
      items: [
        'Gym clothes', 'Sneakers', 'Socks', 'Towel', 'Water bottle',
        'Protein powder', 'Shaker', 'Headphones', 'Deodorant', 'Shampoo',
        'Soap', 'Flip flops', 'Padlock', 'Change of clothes'
      ]
    },
    {
      id: 'family',
      name: 'Family trip with kids',
      icon: '🧸',
      description: 'Everything the small humans need.',
      items: [
        'Passports', 'Travel insurance', 'Diapers', 'Wet wipes', 'Baby food',
        'Formula', 'Baby bottle', 'Pacifier', 'Bib', 'Stroller', 'Car seat',
        'Baby carrier', 'Kids clothes', 'Pyjamas', 'Sun hat', 'Kids sunscreen',
        'Toys', 'Stuffed animal', 'Coloring book', 'Crayons', 'Tablet',
        'Snacks', 'Water bottle', 'Thermometer', 'Kids medication', 'Band aids',
        'Blanket', 'Stroller rain cover', 'Trash bags'
      ]
    }
  ];

  global.PMU = global.PMU || {};
  global.PMU.templates = TEMPLATES;
})(window);
