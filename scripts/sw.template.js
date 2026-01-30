// Service Worker for Push Notifications (FCM)
// This file is generated from sw.template.js by scripts/generate-sw.js
// Firebase config is injected at build time.

let messaging = null;

if (typeof importScripts !== 'undefined') {
  try {
    importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

    if (self.firebase && self.firebase.messaging) {
      var firebaseConfig = {
        apiKey: '__NEXT_PUBLIC_FIREBASE_API_KEY__',
        authDomain: '__NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN__',
        projectId: '__NEXT_PUBLIC_FIREBASE_PROJECT_ID__',
        storageBucket: '__NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET__',
        messagingSenderId: '__NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID__',
        appId: '__NEXT_PUBLIC_FIREBASE_APP_ID__',
      };
      var hasConfig = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId;
      if (hasConfig) {
        self.firebase.initializeApp(firebaseConfig);
        messaging = self.firebase.messaging();
      }
    }
  } catch (e) {
    console.log('Firebase not available in service worker, using standard web push');
  }
}

if (messaging) {
  messaging.onBackgroundMessage(function (payload) {
    console.log('Received background message:', payload);

    var notificationTitle = payload.notification && payload.notification.title ? payload.notification.title : 'New Notification';
    var notificationOptions = {
      body: payload.notification && payload.notification.body ? payload.notification.body : '',
      icon: payload.notification && payload.notification.icon ? payload.notification.icon : '/logo.svg',
      image: payload.notification && payload.notification.image ? payload.notification.image : undefined,
      badge: '/logo.svg',
      tag: payload.data && payload.data.tag ? payload.data.tag : 'default',
      data: payload.data || {},
      requireInteraction: false,
      silent: false,
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

self.addEventListener('notificationclick', function (event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  var data = event.notification.data || {};
  var clickAction = data.click_action || data.link;

  if (clickAction) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          var url = new URL(client.url);
          var clickUrl = new URL(clickAction);
          if (url.origin === clickUrl.origin && (url.pathname === clickUrl.pathname || client.url.indexOf(clickAction) !== -1)) {
            if ('focus' in client) {
              return client.focus();
            }
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(clickAction);
        }
      })
    );
  }
});

self.addEventListener('push', function (event) {
  console.log('Push event received:', event);

  var data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  var notificationTitle = data.title || 'New Notification';
  var notificationOptions = {
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
