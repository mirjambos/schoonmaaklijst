// Service worker voor Kamerpunten: app-shell cache (network-first, zodat updates
// altijd doorkomen zodra er internet is) + achtergrond-pushmeldingen via Firebase
// Cloud Messaging wanneer de app niet open staat.

const CACHE_NAME = 'kamerpunten-v1';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Firebase Cloud Messaging: zelfde project als de rest van de app (mcb-paklijst-2026).
// Deze config bevat bewust geen geheimen -- het is een publieke client-config, net als
// in index.html.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAvYgPHDIrUUkIPsMfNEWojgzCBO9pfXr8",
  authDomain: "mcb-paklijst-2026.firebaseapp.com",
  databaseURL: "https://mcb-paklijst-2026-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mcb-paklijst-2026",
  storageBucket: "mcb-paklijst-2026.firebasestorage.app",
  messagingSenderId: "373547248244",
  appId: "1:373547248244:web:0f6c930429328f5d98ff21"
});

try {
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || 'Kamerpunten';
    const body = data.body || 'Vandaag staat er weer een klein taakje klaar.';
    self.registration.showNotification(title, {
      body,
      icon: 'icons/icon-192.png',
      badge: 'icons/badge-96.png',
      tag: 'kamerpunten-daily',
      renotify: true,
      data: { url: './index.html' }
    });
  });
} catch (e) {
  // Messaging kan falen als de service worker buiten een echte browsercontext draait
  // (bv. sommige preview-tools) -- de rest van de service worker blijft dan gewoon werken.
  console.error('FCM in service worker kon niet initialiseren', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes('punten') && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
