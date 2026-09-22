// Service Worker for Toggi Fun World Theme Park Emergency Alerts
const CACHE_NAME = 'tfw-alerts-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Broadcast and receive background notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      data = { title: '🚨 Urgent Maintenance Issue Reported!', body: event.data.text() };
    }
  }

  const rideName = data.rideName || 'Ride Attraction';
  const problem = data.problem || data.body || 'New maintenance ticket received. Immediate attention required!';
  const title = data.title || `🚨 EMERGENCY MAINTENANCE ALERT: ${rideName}`;

  const options = {
    body: problem,
    icon: '/tbg-logo.svg',
    badge: '/tbg-logo.svg',
    tag: data.tag || 'tfw-maint-alert-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500, 200, 1000],
    data: {
      url: data.url || '/',
      rideName: rideName,
      problem: problem,
      time: Date.now()
    },
    actions: [
      { action: 'open', title: '🚨 Open Alert in App' },
      { action: 'dismiss', title: 'Acknowledge' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus or open application when user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Receive alert message directly from the web client
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SHOW_ALERT_NOTIFICATION' || event.data.type === 'EMERGENCY_ALARM')) {
    const payload = event.data;
    const ride = payload.rideName || 'Attraction';
    const desc = payload.problem || payload.body || 'Immediate attention required in maintenance dashboard!';
    const title = payload.title || `🚨 URGENT ISSUE: ${ride}`;

    self.registration.showNotification(title, {
      body: desc,
      icon: '/tbg-logo.svg',
      badge: '/tbg-logo.svg',
      tag: 'tfw-alert-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 200, 500, 200, 500, 200, 1000],
      data: {
        url: '/',
        rideName: ride,
        problem: desc,
        time: Date.now()
      },
      actions: [
        { action: 'open', title: 'Open Dashboard' },
        { action: 'dismiss', title: 'Acknowledge' }
      ]
    });
  }
});
