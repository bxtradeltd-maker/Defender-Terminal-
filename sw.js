// sw.js
// The Defender - PWA service worker.
//
// IMPORTANT, read before changing this file: this dashboard shows live
// balance, open positions, and trade history. This service worker caches
// ONLY the static app shell below (so the app installs and opens fast/
// offline) - it deliberately does NOT intercept or cache anything else,
// which means every /api/* call to your Railway backend always goes
// straight to the network, uncached, every time. Do not add API routes to
// SHELL_FILES or widen the fetch handler below - doing so risks the
// dashboard silently showing stale balance/trade data as if it were live.

const CACHE_VERSION = "defender-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only ever handle same-origin GET requests for the shell files above.
  // Everything else - most importantly every call to your apiBase backend,
  // which is a different origin entirely - is left completely untouched
  // and goes straight to the network as normal.
  const isShellRequest =
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    SHELL_FILES.some((f) => url.pathname.endsWith(f.replace("./", "")));

  if (!isShellRequest) {
    return; // do not call respondWith - browser handles this request normally
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
