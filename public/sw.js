// Service Worker for Push Notifications
// Note: Firebase config will be injected by the client
// For now, we'll handle standard web push notifications

let messaging = null;

// Try to initialize Firebase if available
if (typeof importScripts !== 'undefined') {
  try {
    importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
    
    // Firebase config should be set by the client before service worker registration
    if (self.firebase && self.firebase.messaging) {
      // Initialize will happen client-side
      messaging = self.firebase.messaging;
    }
  } catch (e) {
    console.log('Firebase not available in service worker, using standard web push');
  }
}

// Handle background messages from FCM
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: payload.notification?.icon || '/logo.svg',
      image: payload.notification?.image,
      badge: '/logo.svg',
      tag: payload.data?.tag || 'default',
      data: payload.data || {},
      requireInteraction: false,
      silent: false,
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const clickAction = event.notification.data?.click_action || event.notification.data?.link;
  
  if (clickAction) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window open with this URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === clickAction && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(clickAction);
        }
      })
    );
  }
});

// Handle push events (for non-Firebase push notifications)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const notificationTitle = data.title || 'New Notification';
  const notificationOptions = {
    body: data.body || '',
    icon: data.icon || '/logo.svg',
    image: data.image,
    badge: '/logo.svg',
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

