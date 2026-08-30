# PackMeUp 🧳

Packing lists for trips, reserve duty, and anything else that needs a bag.

Type what you need, and each item files itself into a category — clothing,
toiletries, documents, electronics, military gear and so on. Tick things off as
they go into the luggage, and when the next trip comes around, duplicate the
list instead of starting over.

The whole app speaks **English and Hebrew** — interface, templates and layout
direction included — and picks your device's language on first run.

It's a web app: it installs onto a phone home screen like a native app, and it
opens in any browser on a computer. No account, no server, works with no signal.

## Features

- **Many lists** — one per trip, per activity, per bag. Each with its own icon,
  name and notes.
- **Automatic categories** — items are sorted into segments as you type them.
  Change a category by hand once and PackMeUp remembers that choice for next time.
- **Tick as you pack** — a checkbox per item, a progress bar per list and per
  category, and a "to pack / packed" filter.
- **Quantities** — type `3 x socks` (or `3 socks`, or `socks x3`) and it becomes
  an item with a ×3 badge.
- **Duplicate a list** — with or without the existing ticks.
- **Templates to start from** — trip abroad, reserve duty, weekend away, camping
  and hiking, beach day, business trip, gym bag, family trip with kids.
- **Bulk add** — paste a whole list, one item per line; every line gets a category.
- **Search and filter** across lists and inside a list.
- **Works offline** — the app is cached on the device, and so is your data.
- **Phone and desktop** — one layout that fits both, plus a dark theme and a
  print-friendly view.
- **Export and import** — move lists between devices as a `.json` backup, or
  copy a list out as plain text.
- **Fully bilingual** — see below.

## Hebrew and English

The language is picked from the device on first run and can be changed any time
under **⋯ → שפה / Language**; the choice is remembered. Switching affects:

- **The whole interface** — every button, menu, dialog, empty state and toast.
- **Direction** — Hebrew sets `dir="rtl"` on the document and the layout mirrors:
  the back arrow turns around, checkboxes move to the right of each row, progress
  bars fill from the right. The stylesheet uses logical properties throughout, so
  there is one layout rather than two.
- **Templates** — the starter lists are written separately in each language, so
  the Hebrew *מילואים* list contains מדי ב, כומתה and מימייה rather than
  translated English strings.
- **Categories** — category names, the plural forms ("פריט אחד" vs "3 פריטים"),
  relative dates and the copy suffix ("עותק") all follow the language.

Categorisation works on Hebrew items regardless of the interface language, and a
single list can freely mix the two. Hebrew matching accounts for the way the
language actually gets typed:

| you type | recognised as |
| --- | --- |
| `גרביים` / `גרב` | the same item — plural and dual endings are stripped |
| `הדרכון`, `ומגבות`, `שהתרופות` | prefixes ה/ו/ב/ל/כ/מ/ש are peeled off (up to two) |
| `3 גרביים` | quantity 3, item `גרביים` |
| `לתיק גב` | the phrase *תיק גב*, prefix and all |

Prefix letters are only ever stripped from what you type, never from the
keyword list, so real words that start with those letters (מגבת, מזרן, כובע)
keep working.

## Running it

There is no build step and there are no dependencies.

**On a computer:** open `index.html` in a browser — that is enough to use the app.

To get the offline/installable behaviour, serve the folder over HTTP instead
(service workers do not run from `file://`):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

**On a phone:** publish the folder anywhere static (GitHub Pages, Netlify, your
own server), open the address in the phone browser, then use *Add to Home
Screen* (iOS Safari) or *Install app* (Android Chrome). It then launches
full-screen with its own icon.

### Publishing to GitHub Pages

`.github/workflows/pages.yml` publishes the repository as-is on every push to
`main`. Enable it once under **Settings → Pages → Build and deployment →
Source: GitHub Actions**; the site then lives at
`https://<user>.github.io/PackMeUp/`.

## Where the data lives

Everything is stored in the browser's `localStorage`, on the device, under the
key `packmeup.v1`. Nothing is uploaded and there is nothing to sign in to. Two
consequences worth knowing:

- Lists do not sync between your phone and your computer by themselves. Use
  **⋯ → Export everything** on one device and **⋯ → Import** on the other.
- Clearing the browser's site data for this app deletes the lists, so keep an
  export if a list matters.

## Project layout

```
index.html              markup and the app shell
css/styles.css          all styling, light and dark themes, both directions
js/i18n.js              English and Hebrew strings, plurals, text direction
js/categories.js        the categories and the keyword scoring that assigns them
js/templates.js         the starter lists
js/store.js             state, localStorage persistence, undo, import/export
js/app.js               views, rendering, dialogs, routing
sw.js                   service worker: offline app shell
manifest.webmanifest    installability (name, icons, colours)
assets/                 app icons
tools/test.js           headless checks for the logic layer
tools/make_icons.py     regenerates the PNG icons from code
```

## Tests

```sh
node tools/test.js
```

Covers categorisation (Hebrew prefixes, plurals and phrases; remembered manual
corrections), quantity parsing in both languages, the Hebrew interface and
templates, list duplication, undo, persistence and the import/export round trip.
