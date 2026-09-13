// Minimal service worker. Its presence is what makes the app installable;
// it deliberately does not cache, so the app is never stale.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function () {
  // pass through to the network
});
