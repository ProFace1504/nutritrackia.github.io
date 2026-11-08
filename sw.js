importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: 'AIzaSyBWWsxAlMgI-v9n6euOEigi789-8hO3Tz4',
  authDomain: 'plato-82317.firebaseapp.com',
  projectId: 'plato-82317',
  storageBucket: 'plato-82317.firebasestorage.app',
  messagingSenderId: '22566822804',
  appId: '1:22566822804:web:3c449ac92dcc0e3a256581'
});
firebase.messaging();

const CACHE = 'plato-v1';
const SHELL = ['./', './index.html', './firebase.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Firebase y el Worker de la IA van directo a la red, sin caché
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Primero la red (para recibir cambios); si no hay conexión, la copia guardada
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
