// Cooachly service worker: Web Push notifications + an offline fallback page.
// Deliberately does NOT cache app pages or data — everything is rendered on
// the server per user, so serving stale copies would show wrong bookings.

const OFFLINE_CACHE = "cooachly-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== OFFLINE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Only full-page navigations are intercepted, and only to show the offline
// page when the network is unreachable.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE }))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const isArts = typeof data.url === "string" && data.url.startsWith("/arts");
  event.waitUntil(
    self.registration.showNotification(data.title || "Cooachly", {
      body: data.body || "",
      icon: isArts ? "/icons/arts-192.png" : "/icons/cooachly-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin);

  event.waitUntil(
    (async () => {
      // External links (e.g. a video-call room) open in a new window.
      if (target.origin !== self.location.origin) {
        return self.clients.openWindow(target.href);
      }
      // Otherwise reuse an open app window if there is one.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        return existing.navigate(target.href);
      }
      return self.clients.openWindow(target.href);
    })()
  );
});
