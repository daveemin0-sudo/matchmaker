/* ============================================================
   hookmebysam — Firebase Messaging Service Worker
   Handles background push notifications (app closed / backgrounded)
   ============================================================ */

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Must match your firebase-config.js values exactly
firebase.initializeApp({
  apiKey: "AIzaSyCCjBefT39USp6JslywXA-ZCUOK_t9gmUk",
  authDomain: "hookmebysam.firebaseapp.com",
  projectId: "hookmebysam",
  storageBucket: "hookmebysam.firebasestorage.app",
  messagingSenderId: "512221711818",
  appId: "1:512221711818:web:d0c40fcb9f934c4e249333"
});

const messaging = firebase.messaging();

// Handle background messages — show OS-level notification
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background push received:', payload);

  const { title, body, icon, data } = payload.notification || {};
  const notifTitle = title || 'hookmebysam 💕';
  const notifOptions = {
    body: body || 'You have a new notification',
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: data?.matchId || 'hmbs-notif',   // Collapses duplicate notifs for same chat
    data: data || {},
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open App 💬' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notifTitle, notifOptions);
});

// Handle notification click — focus app or open it
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const matchId = event.notification.data?.matchId;
  const urlToOpen = matchId
    ? `${self.location.origin}/?openChat=${matchId}`
    : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'PUSH_NOTIFICATION_CLICK', matchId });
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
