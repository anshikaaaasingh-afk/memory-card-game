const CACHE_NAME = 'memory-match-v1';
const ASSETS = [
  './', './index.html', './style.css', './script.js', './manifest.json',
  './data/storage.js',
  './modules/game.js', './modules/timer.js', './modules/themes.js',
  './modules/achievements.js', './modules/analytics.js', './modules/challenges.js', './modules/audio.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
