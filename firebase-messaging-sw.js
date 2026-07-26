/* Этот файл должен лежать в КОРНЕ сайта (там же, где sklad.html),
   по адресу /firebase-messaging-sw.js — иначе браузер не даст
   зарегистрировать его как service worker для push-уведомлений. */

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD9EQvSzWKTD43QZuMDAcwOzwmFAyj85Ks",
  authDomain: "sklad-19c1d.firebaseapp.com",
  databaseURL: "https://sklad-19c1d-default-rtdb.firebaseio.com",
  projectId: "sklad-19c1d",
  storageBucket: "sklad-19c1d.firebasestorage.app",
  messagingSenderId: "1036005110988",
  appId: "1:1036005110988:web:be70638124e87380fdbe69"
});

const messaging = firebase.messaging();

// Показываем уведомление, когда приложение свёрнуто/закрыто
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Склад';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
