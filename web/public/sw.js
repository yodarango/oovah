// Service Worker for oovah PWA
const CACHE_NAME = "oovah-v2";
const urlsToCache = [
  "/",
  "/auth",
  "/auth/verify",
  "/logo.png",
  "/splash.png",
  "/manifest.json",
  "https://cdn.danielrangel.net/fullds.min.css",
  "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js",
  "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js",
];

// Install event - cache resources and activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Failed to cache resources:", error);
      }),
  );
});

// Activate event - take control of clients and clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - network-first for HTML pages, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  const isApiRequest = requestUrl.pathname.startsWith("/api/");
  const isNavigation =
    request.mode === "navigate" || request.destination === "document";

  // API responses contain user-specific, frequently changing data and must
  // always come from the network rather than the Cache API.
  if (isApiRequest) {
    event.respondWith(fetch(request));
    return;
  }

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache));
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match("/");
          });
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache));
          return networkResponse;
        })
        .catch(() => cachedResponse);
    }),
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle background sync for offline actions
  console.log("Background sync triggered");
  return Promise.resolve();
}

// Push notification handling
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New content available!",
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Open oovah",
        icon: "/logo.png",
      },
      {
        action: "close",
        title: "Close notification",
        icon: "/logo.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("oovah", options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(self.clients.openWindow("/"));
  }
});
