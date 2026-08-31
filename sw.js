/*
 * PackMeUp service worker.
 *
 * Caches the app shell so the app opens with no connection at all. Your data
 * never goes through here - it lives in localStorage on the device.
 */
var CACHE = 'packmeup-v5';

var SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'js/i18n.js',
  'js/notes.js',
  'js/categories.js',
  'js/templates.js',
  'js/store.js',
  'js/drive.js',
  'js/app.js',
  'manifest.webmanifest',
  'assets/favicon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-180.png',
  'assets/icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return key === CACHE ? null : caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/*
 * Network first, cache as the fallback.
 *
 * The cache used to answer first, which meant a published change only showed
 * up on the second visit - once for the new files to be fetched into the
 * cache, again to be served from it. Going to the network first keeps the app
 * current whenever there is a connection, and the cache still answers in full
 * when there is none.
 */
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).then(function (response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || caches.match('index.html');
      });
    })
  );
});
