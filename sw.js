/* hookmebysam Service Worker v7
   ------------------------------------------------------------------
   Strategy:
   - App shell (HTML/CSS/JS): NETWORK-FIRST. Always tries the network
     first so a normal reload picks up new code immediately. Falls
     back to the last cached copy only when the network is unreachable
     (offline support), instead of trusting a cache that could be stale.
   - Static assets (images/fonts/icons): CACHE-FIRST. These are rarely
     edited, so serving from cache first saves bandwidth and is safe.
   ------------------------------------------------------------------ */
const SW_VERSION = "v8";
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
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
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

// ── Native Push & Notification Handlers ─────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || data.notification?.title || "hookmebysam 💕";
  const options = {
    body: data.body || data.notification?.body || "You have a new message or match!",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    vibrate: [200, 100, 200],
    tag: data.tag || data.data?.matchId || "hmbs-notif",
    renotify: true,
    data: data.data || {},
    actions: [
      { action: "open", title: "Open 💬" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const matchId = event.notification.data?.matchId;
  const targetUrl = matchId ? `${self.location.origin}/#chat/${matchId}` : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open in a tab or PWA window, focus it and switch to the chat
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if (matchId) client.postMessage({ type: "PUSH_NOTIFICATION_CLICK", matchId });
          return client.focus();
        }
      }
      // If closed, launch a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});