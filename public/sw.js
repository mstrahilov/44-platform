self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = typeof payload.title === 'string' ? payload.title : '44OS';
  const body = typeof payload.body === 'string' ? payload.body : 'You have a new notification.';
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/notifications';
  const badge = Number.isFinite(payload.badge) ? payload.badge : 1;
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png?v=20260721',
      badge: '/icon-192.png?v=20260721',
      tag: typeof payload.tag === 'string' ? payload.tag : undefined,
      data: { url },
    }),
    typeof self.registration.setAppBadge === 'function'
      ? self.registration.setAppBadge(badge).catch(() => undefined)
      : Promise.resolve(),
  ]));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data && typeof event.notification.data.url === 'string'
    ? event.notification.data.url
    : '/notifications';
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('navigate' in client) await client.navigate(target);
      if ('focus' in client) return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});
