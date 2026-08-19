// Service worker "cache-first" : après la première installation, l'app se
// recharge uniquement depuis le cache. Incrémenter CACHE_VERSION pour forcer
// la mise à jour des fichiers lors d'un déploiement.
const CACHE_VERSION = "cyclamens-v3";

const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/db.js",
  "js/timer.js",
  "js/chart.js",
  "js/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
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
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
