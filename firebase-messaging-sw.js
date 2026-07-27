/* Этот файл должен лежать в КОРНЕ сайта (там же, где sklad.html),
   по адресу /firebase-messaging-sw.js — иначе браузер не даст
   зарегистрировать его как service worker для push-уведомлений. */

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDOk3iasxpYMq-9guYuYUMeuNAk9gXGGYE",
  authDomain: "skladhorizon.firebaseapp.com",
  databaseURL: "https://skladhorizon-default-rtdb.firebaseio.com",
  projectId: "skladhorizon",
  storageBucket: "skladhorizon.firebasestorage.app",
  messagingSenderId: "679666592230",
  appId: "1:679666592230:web:2079d7faf34840d757ce27"
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
