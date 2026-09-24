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

function handleCallOrPush(payloadData, notif) {
  const isIncomingCall = payloadData?.type === 'incoming_call';
  const isCallEnded = payloadData?.type === 'call_ended';

  if (isCallEnded && payloadData?.callId) {
    return self.registration.getNotifications({ tag: `call_${payloadData.callId}` }).then(notifications => {
      notifications.forEach(n => n.close());
    });
  }

  const title = notif?.title || (isIncomingCall ? "📞 Incoming Call" : "hookmebysam 💕");
  const options = {
    body: notif?.body || (isIncomingCall ? `${payloadData?.callerName || 'Someone'} is calling you... Tap to answer!` : "You have a new message!"),
    icon: notif?.icon || "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    vibrate: isIncomingCall ? [600, 300, 600, 300, 600, 300, 600] : [200, 100, 200],
    tag: isIncomingCall ? `call_${payloadData?.callId || Date.now()}` : (payloadData?.matchId || "hmbs-notif"),
    renotify: true,
    requireInteraction: isIncomingCall,
    data: payloadData || {},
    actions: isIncomingCall ? [
      { action: "answer", title: "Answer 📞" },
      { action: "decline", title: "Decline ✕" }
    ] : [
      { action: "open", title: "Open App 💬" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  return self.registration.showNotification(title, options);
}

// Handle background messages — show OS-level notification
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background push received:', payload);
  const data = payload.data || {};
  const notif = payload.notification || {};
  return handleCallOrPush(data, notif);
});

// Native push fallback
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const raw = event.data.json();
    const data = raw.data || raw;
    const notif = raw.notification || {};
    event.waitUntil(handleCallOrPush(data, notif));
  } catch (_) {
    // If not json, let FCM SDK handle it
  }
});

// Handle notification click — focus app or open it
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss' || event.action === 'decline') return;

  const notifData = event.notification.data || {};
  const partnerId = notifData.callerId || notifData.matchId;
  const isAnswer = event.action === 'answer';
  const queryParams = isAnswer
    ? `?autoAnswer=1&callId=${encodeURIComponent(notifData.callId || '')}&callType=${encodeURIComponent(notifData.callType || 'audio')}`
    : '';
  const urlToOpen = partnerId
    ? `${self.location.origin}/#chat/${partnerId}${queryParams}`
    : `${self.location.origin}/`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if (partnerId) {
            client.postMessage({
              type: notifData.type === 'incoming_call' ? 'INCOMING_CALL_CLICK' : 'PUSH_NOTIFICATION_CLICK',
              matchId: partnerId,
              callId: notifData.callId,
              callType: notifData.callType,
              autoAnswer: isAnswer
            });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
