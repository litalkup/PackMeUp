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
- **Your own categories** — add one from the item dialog or from **⋯ →
  Categories**, with a name and an icon of your choosing. They sit alongside
  the built-in ones, just before *Other*, and travel with a sync. Deleting one
  leaves its items behind under *Other*, and is undoable.
- **Order inside a category** — **list menu → Reorder items** puts arrows on
  every row. An item moves within its own category only, so it never jumps out
  of its group, and the order is stored per item, so it reaches your other
  device too.
- **Tick as you pack** — a checkbox per item, a progress bar per list and per
  category, and a "to pack / packed" filter.
- **Quantities you can count off one at a time** — type `3 x socks` (or
  `3 socks`, or `socks x3`) and the checkbox becomes a counter: see below.
- **Duplicate a list** — with or without the existing ticks.
- **A warning before you add the same thing twice** — see below.
- **Templates to start from** — trip abroad, reserve duty, weekend away, camping
  and hiking, beach day, business trip, gym bag, family trip with kids.
- **Bulk add** — paste a whole list, one item per line; every line gets a category.
- **Bring a list in from Google Keep** — see below.
- **Search and filter** across lists and inside a list.
- **Works offline** — the app is cached on the device, and so is your data.
- **Phone and desktop** — one layout that fits both, plus a dark theme and a
  print-friendly view.
- **Export and import** — move lists between devices as a `.json` backup, or
  copy a list out as plain text.
- **Fully bilingual** — see below.

## Bringing a list in from Google Keep

Google Keep has no API for personal accounts — the official one is restricted
to Google Workspace and needs a domain administrator — so a note travels as
text. Two ways in, both under **⋯ → Import from a note**:

- **Paste it.** Open the note in Keep, select everything, copy, paste. The
  checkbox characters Keep uses (`☐`, `☑`) are recognised, along with markdown
  checkboxes (`- [x]`) and plain bullets, and **anything already ticked in the
  note arrives packed**. A heading line above the checklist becomes the name of
  the new list.
- **Share it, on Android.** The app declares a `share_target`, so once it is
  installed from the home screen it appears in the share sheet: in Keep, ⋮ →
  Send → PackMeUp. The note arrives in the import dialog with nothing to copy.
  (iOS Safari has no share-target support; pasting works everywhere.)

Either way the items land in a new list or an existing one, and they go through
the usual categorisation, quantity parsing (`3 גרביים`) and duplicate prompt on
the way in. A real note is messy, so the parser also drops bullets with nothing
after them, and treats a line crossed out with `~~tildes~~` as done — it comes
in packed, like a ticked box.

When a whole note lands on a list that already has some of it, the duplicate
prompt offers **do the same for the rest of this import**, so one answer settles
every remaining clash instead of asking a dozen times.

Pasting a note into the backup importer by mistake does not fail with a JSON
error: the text is recognised as a note and handed to the note importer.

## Items that come in a quantity

An item with a quantity gets a counter in place of its checkbox, and one tap
puts one more of it in the bag:

```
[ ✓ ]  Toothbrush                 quantity 1: an ordinary checkbox
[2/3]  Undershirts       1 left   one tap = one more packed
[3/3]  Socks                      full: solid, reads as "done"
```

The control fills up as it goes, so a glance down the list shows where you
stopped. Tapping a full counter starts it over, the way unticking a box does,
and every tap leaves an **undo** in the toast for a mistaken one. For an exact
number — or to take one back out — the item dialog has an *already packed*
field next to the quantity.

Two consequences worth knowing:

- A part-packed item still counts as **to pack**: it stays in that filter and
  in the "still to pack" count, because you are not done with it.
- The **progress bar counts fractions**: an item at 2 of 3 moves the bar two
  thirds of a row's worth, while the item counts themselves stay per item.
  Lowering an item's quantity below what is packed pulls the count down with
  it, and lists saved before this existed open with their ticked items full.

## When an item is already on the list

Adding something the list already has opens a prompt instead of quietly
creating a second row. It shows the item already on the list — with its
quantity, category and whether it is ticked off — next to the one you just
typed, and offers three answers:

- **Add it anyway** — both stay on the list, for when you really do want two.
- **Replace the existing item** — the new one takes the old one's place and
  keeps its position in the list, unticked. Undoable from the toast.
- **Do not add it** — the list is left alone. Dismissing the prompt does the
  same thing, so an accidental Escape never changes anything.

Matching is about the item, not the exact string: quantities are ignored
(`3 socks` clashes with `socks`), so are plurals in both languages
(`socks`/`sock`, `גרביים`/`גרב`, `מגבת`/`מגבות`), Hebrew prefixes
(`הגרביים`), and a single typo (`sunscreen` / `sunscren`). An extra word makes
it a different item, so `wool socks` and `socks`, or `מטען` and `מטען נייד`,
are left to stand side by side.

Pasting a batch checks every line, including lines that duplicate each other,
and asks about them one at a time — the prompt is numbered ("2 of 3") — then
reports what happened once at the end.

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

## Having the same list on two devices

Two ways, both under the **⋯** menu.

**Sync through your own Google Drive.** The lists are kept in one file in the
app's private folder in your Drive — the *appdata* space, which no other app
and none of your other files can see. Nothing passes through a server of mine;
each device signs in to your Google account and reads that one file.

It needs a one-time setup, because Google only lets an app reach a Drive
account through a client ID **you** create:

1. In the [Google Cloud console](https://console.cloud.google.com), create a
   project and enable the **Google Drive API**.
2. Under **Clients**, create an **OAuth client ID** of type *Web application*,
   with your site (e.g. `https://litalkup.github.io`) as an authorised
   JavaScript origin.
3. On the consent screen, add yourself as a **test user**.
4. Paste the client ID into **⋯ → Sync with Google Drive**.

The first sign-in shows an "unverified app" warning — publishing an app with
Drive access needs a Google review, which is not worth it for one person's
packing lists. Choose *Advanced* and continue; it is your own app reaching your
own Drive. Turn on *sync by itself when something changes* and each device
syncs on open and a few seconds after any edit.

**Or move a file by hand.** **⋯ → Export everything** on one device, then
**⋯ → Restore from a backup file** on the other.

Either way the two sides are **merged**, not stacked: a list keeps its identity
across devices, every item carries its own timestamp, and every deletion leaves
a tombstone. So

- the same list coming back is recognised rather than copied,
- for an item edited on both, the newer edit wins,
- an item added on either device arrives,
- an item deleted on one device stays deleted, and
- an item typed independently on both under the same name stays one item.

Syncing the same file twice changes nothing.

## Where the data lives

Everything is stored in the browser's `localStorage`, on the device, under the
key `packmeup.v1`. Nothing is uploaded and there is nothing to sign in to. Two
consequences worth knowing:

- Lists do not travel between devices by themselves until you set up Drive
  sync, or move a backup file across, as described above.
- Clearing the browser's site data for this app deletes the lists, so keep an
  export if a list matters.

## Project layout

```
index.html              markup and the app shell
css/styles.css          all styling, light and dark themes, both directions
js/i18n.js              English and Hebrew strings, plurals, text direction
js/notes.js             reading a note pasted or shared from another app
js/categories.js        the categories and the keyword scoring that assigns them
js/templates.js         the starter lists
js/store.js             state, localStorage persistence, undo, merging, import/export
js/drive.js             sync through the app's private folder in your Drive
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
