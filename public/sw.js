/*
 * FitOpe service worker.
 * - Push notifications for family nudges.
 * - Offline fallback for page loads only. Nothing else is cached: health data never sits in
 *   the device cache, and every screen always shows live data.
 */
const CACHE = "fitope-shell-v2";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      // Page requests start in parallel with worker boot, so the worker never adds latency.
      .then(() => self.registration.navigationPreload?.enable())
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        return (await event.preloadResponse) || (await fetch(event.request));
      } catch {
        return caches.match(OFFLINE);
      }
    })()
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "FitOpe", {
      body: data.body || "",
      tag: data.tag,
      renotify: !!data.tag,
      icon: "/icons/192.png",
      badge: "/icons/192.png",
      data: { url: data.url || "/family" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only ever open pages on this site, whatever the payload says.
  const target = new URL(event.notification.data?.url || "/family", self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin + "/family";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
