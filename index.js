const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Срабатывает при каждом изменении списка пользователей в базе склада
 * (/sklad_db/users). Сравнивает состояние "до" и "после" (это даёт сам
 * триггер Realtime Database — ничего дополнительно запрашивать не нужно),
 * находит новых пользователей со статусом "ожидает доступа" и отправляет
 * push-уведомление на все устройства администраторов и менеджеров, у
 * которых сохранён FCM-токен (см. клиентский код в sklad.html).
 */
exports.notifyNewRegistration = functions.database
  .ref('/sklad_db/users')
  .onWrite(async (change) => {
    const before = change.before.val() || [];
    const after = change.after.val() || [];

    const beforeLogins = new Set(before.map(u => u.login));
    const newPending = after.filter(u =>
      !beforeLogins.has(u.login) && u.role === 'user' && u.access === 'none'
    );

    if (newPending.length === 0) return null;

    const recipients = after.filter(u =>
      (u.role === 'admin' || u.role === 'manager') &&
      Array.isArray(u.fcmTokens) && u.fcmTokens.length > 0
    );
    if (recipients.length === 0) return null;

    const tokens = [...new Set(recipients.flatMap(u => u.fcmTokens))];
    if (tokens.length === 0) return null;

    const names = newPending.map(u => u.fio || u.login).join(', ');
    const message = {
      notification: {
        title: 'Склад — новый пользователь',
        body: newPending.length === 1
          ? `${names} ожидает доступа`
          : `${newPending.length} новых пользователей ожидают доступа: ${names}`
      },
      webpush: {
        fcmOptions: { link: '/' }
      },
      tokens
    };

    const resp = await admin.messaging().sendEachForMulticast(message);

    // Чистим токены, которые Firebase считает недействительными
    // (например, пользователь снёс приложение/очистил браузер).
    const invalid = [];
    resp.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered') {
          invalid.push(tokens[i]);
        }
      }
    });

    if (invalid.length) {
      const ref = admin.database().ref('/sklad_db/users');
      const snap = await ref.get();
      const users = snap.val() || [];
      let changed = false;
      users.forEach(u => {
        if (Array.isArray(u.fcmTokens)) {
          const filtered = u.fcmTokens.filter(t => !invalid.includes(t));
          if (filtered.length !== u.fcmTokens.length) { u.fcmTokens = filtered; changed = true; }
        }
      });
      if (changed) await ref.set(users);
    }

    return null;
  });

/**
 * Бонус: срабатывает при изменении товаров и уведомляет админов/менеджеров,
 * если остаток артикула опустился до минимального порога (minQty) или ниже,
 * и раньше был выше него (чтобы не спамить уведомлением на каждое изменение).
 */
exports.notifyLowStock = functions.database
  .ref('/sklad_db/lines')
  .onWrite(async (change) => {
    const before = change.before.val() || [];
    const after = change.after.val() || [];

    function flatten(lines) {
      const res = {};
      (lines || []).forEach(line => (line.rows || []).forEach(row => (row.items || []).forEach(it => {
        res[it.id] = { sku: it.sku, qty: it.qty, minQty: it.minQty || 0, lineName: line.name, rowName: row.name };
      })));
      return res;
    }

    const beforeMap = flatten(before);
    const afterMap = flatten(after);

    const crossed = [];
    Object.keys(afterMap).forEach(id => {
      const a = afterMap[id];
      const b = beforeMap[id];
      if (a.minQty > 0 && a.qty <= a.minQty && (!b || b.qty > a.minQty)) {
        crossed.push(a);
      }
    });
    if (crossed.length === 0) return null;

    const usersSnap = await admin.database().ref('/sklad_db/users').get();
    const users = usersSnap.val() || [];
    const recipients = users.filter(u =>
      (u.role === 'admin' || u.role === 'manager') &&
      Array.isArray(u.fcmTokens) && u.fcmTokens.length > 0
    );
    if (recipients.length === 0) return null;
    const tokens = [...new Set(recipients.flatMap(u => u.fcmTokens))];
    if (tokens.length === 0) return null;

    const body = crossed.length === 1
      ? `${crossed[0].sku}: осталось ${crossed[0].qty} шт. (мин. ${crossed[0].minQty})`
      : `${crossed.length} артикулов достигли минимального остатка`;

    await admin.messaging().sendEachForMulticast({
      notification: { title: 'Склад — низкий остаток', body },
      webpush: { fcmOptions: { link: '/' } },
      tokens
    });

    return null;
  });
