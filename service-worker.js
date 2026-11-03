/* Pipwatch service worker — lets the app install to a phone's home screen
 * and keep working with no internet.
 *
 * Strategy: for Pipwatch's own files, try the network first (so you always
 * get the newest version when online) and fall back to the saved copy when
 * offline. For anything from other sites (the Google Fonts), use the saved
 * copy first. Your trades are NOT stored here — they live in the browser's
 * localStorage, which this file never touches.
 *
 * If you ever add a new file to the app, add it to APP_FILES below so it's
 * available offline on first install.
 */
const CACHE = 'pipwatch-v1';
const APP_FILES = [
  './', 'index.html', 'manifest.json',
  'css/styles.css', 'vendor/chart.umd.min.js',
  'js/storage.js', 'js/pnl.js',
  'js/01-helpers.js', 'js/02-state.js', 'js/03-backup.js', 'js/04-accounts.js',
  'js/05-trades.js', 'js/06-layout.js', 'js/07-dashboard.js', 'js/08-calendar.js',
  'js/09-performance.js', 'js/10-log.js', 'js/11-trade-modal.js', 'js/12-main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (sameOrigin) {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
    );
  } else {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }).catch(() => hit))
    );
  }
});
