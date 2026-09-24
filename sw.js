/* hookmebysam Service Worker v5
   ------------------------------------------------------------------
   Strategy:
   - App shell (HTML/CSS/JS): NETWORK-FIRST. Always tries the network
     first so a normal reload picks up new code immediately. Falls
     back to the last cached copy only when the network is unreachable
     (offline support), instead of trusting a cache that could be stale.
   - Static assets (images/fonts/icons): CACHE-FIRST. These are rarely
     edited, so serving from cache first saves bandwidth and is safe.
   ------------------------------------------------------------------ */
const SW_VERSION = "v5";
const CACHE_NAME = `hmbs-${SW_VERSION}`;

const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/premium.css",
  "/script.js",
  "/manifest.json"
];

const CACHE_FIRST_EXT = /\.(png|jpe?g|webp|gif|svg|woff2?|ttf|ico)$/i;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    // Bumping SW_VERSION above makes this actually purge old caches —
    // v1 never changed its cache name, so this cleanup step never ran.
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Let cross-origin requests (Firebase, Paystack, Google Fonts) pass through
  // untouched — caching those here risks storing broken opaque responses.
  if (!req.url.startsWith(self.location.origin)) return;

  const isStaticAsset = CACHE_FIRST_EXT.test(new URL(req.url).pathname);

  if (isStaticAsset) {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetchAndCache(req))
    );
  } else {
    e.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => caches.match(req))
    );
  }
});

function fetchAndCache(req) {
  return fetch(req).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
    }
    return response;
  });
}