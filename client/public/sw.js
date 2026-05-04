// PriVode Service Worker for Push Notifications
const CACHE_NAME = 'privode-v1';
const urlsToCache = [
  '/'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = { title: 'PriVode', body: event.data.text() };
    }
  }
  
  // Default notification options
  const options = {
    body: notificationData.body || 'Nová notifikácia z PriVode',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: notificationData.tag || 'privode-notification',
    data: {
      url: notificationData.url || '/',
      competitionId: notificationData.competitionId,
      teamId: notificationData.teamId,
      type: notificationData.type
    },
    actions: [
      {
        action: 'view',
        title: 'Zobraziť',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Zavrieť'
      }
    ],
    requireInteraction: false,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'PriVode',
      options
    )
  );
});

// Notification click event - handle user interactions
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  const notification = event.notification;
  const action = event.action;
  
  if (action === 'dismiss') {
    notification.close();
    return;
  }
  
  // Default action (click on notification body or 'view' action)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const url = notification.data.url || '/';
        
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            notification.close();
            return client.focus();
          }
        }
        
        // Open new window/tab if not already open
        if (clients.openWindow) {
          notification.close();
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline functionality (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});