# Backend для push-уведомлений «Склад»

Это Cloud Function на Firebase, которая шлёт push-уведомление админам и
менеджерам, когда:
- регистрируется новый пользователь и ждёт доступа (`notifyNewRegistration`);
- остаток артикула опускается до минимального порога (`notifyLowStock`).

Работает даже когда приложение закрыто — в отличие от старого варианта
(браузерное уведомление только при открытой вкладке).

## Что нужно один раз сделать

### 1. Требуется план Blaze
Cloud Functions нельзя развернуть на бесплатном плане Spark. Зайдите в
Firebase Console → ⚙️ Project settings → Usage and billing → перейдите на
**Blaze** (pay as you go). Для такого маленького приложения расходы почти
всегда останутся в пределах бесплатной квоты (2 млн вызовов функций/мес.).

### 2. Установите Firebase CLI и войдите
```bash
npm install -g firebase-tools
firebase login
```

### 3. Разверните функции
Из этой папки (`backend/`, где лежат `firebase.json` и `.firebaserc`):
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```
Через 1–2 минуты в терминале появятся имена задеплоенных функций —
`notifyNewRegistration` и `notifyLowStock`. Готово, backend работает.

### 4. Получите VAPID-ключ для веб-push
Firebase Console → ⚙️ Project settings → Cloud Messaging → вкладка
**Web configuration** → «Web Push certificates» → «Generate key pair».
Скопируйте получившийся ключ (длинная строка).

### 5. Впишите ключ в приложение
Откройте `sklad.html`, найдите строку:
```js
const VAPID_KEY = '';
```
и вставьте туда скопированный ключ:
```js
const VAPID_KEY = 'BN...ваш_ключ...';
```

### 6. Разместите service worker
Файл `firebase-messaging-sw.js` из этой папки нужно положить в **корень**
вашего сайта — туда же, где лежит `sklad.html` (например, если приложение
открывается по адресу `https://мойсайт.ru/sklad.html`, файл должен быть
доступен по адресу `https://мойсайт.ru/firebase-messaging-sw.js`).

> Push-уведомления в браузере требуют HTTPS (или `localhost` для теста).
> Если сайт открыт просто как локальный файл (`file://`), push работать не будет —
> нужен любой бесплатный хостинг (Firebase Hosting, GitHub Pages, Netlify и т.п.).

### 7. Включите уведомления в приложении
Зайдите в приложение под админом или менеджером → «Профиль» → кнопка
«🔔 Включить push-уведомления» → разрешите уведомления в браузере.
Теперь при регистрации нового пользователя или падении остатка ниже
минимума на это устройство придёт push, даже если вкладка закрыта.

## Структура папки
```
backend/
  firebase.json         — какие функции разворачивать
  .firebaserc            — привязка к проекту sklad-19c1d
  functions/
    index.js             — код самих Cloud Functions
    package.json         — зависимости (firebase-admin, firebase-functions)
  firebase-messaging-sw.js  — service worker (переложить в корень сайта!)
  README.md               — этот файл
```

## Если что-то не работает
- Проверьте в Firebase Console → Functions, что обе функции задеплоены и
  не падают с ошибками (там же есть логи).
- Проверьте, что `firebase-messaging-sw.js` реально открывается в браузере
  по адресу `/firebase-messaging-sw.js` (без 404).
- Проверьте, что `VAPID_KEY` в `sklad.html` не пустой.
- В консоли браузера (F12) при нажатии «Включить push-уведомления» не
  должно быть красных ошибок — если есть, пришлите текст ошибки.
