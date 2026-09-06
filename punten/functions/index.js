// Dagelijkse pushmelding voor de Kamerpunten-app.
//
// Draait elk uur (goedkoop en simpel te deployen), maar stuurt alleen echt een
// melding als het huidige uur (Europe/Amsterdam) overeenkomt met de in de app
// ingestelde herinneringstijd (puntenapp/settings/reminderHour), en alleen als
// dat vandaag nog niet is gebeurd (puntenapp/settings/lastPushDate). Zo kan de
// herinneringstijd in de app zelf aangepast worden zonder de functie opnieuw te
// hoeven deployen.
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp({
  databaseURL: 'https://mcb-paklijst-2026-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();

function localISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// Zelfde ronde-robin logica als findTodayTask() in index.html -- moet in sync
// blijven zodat de melding altijd dezelfde taak noemt als die je in de app ziet.
function findTodayTask(room) {
  const order = room.taskOrder || [];
  for (let i = 0; i < order.length; i++) {
    const idx = (room.cursor + i) % order.length;
    const task = room.tasks && room.tasks[order[idx]];
    if (task && task.active) return task;
  }
  return null;
}

exports.dailyReminder = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Europe/Amsterdam', region: 'europe-west1' },
  async () => {
    const rootRef = db.ref('puntenapp');
    const snapshot = await rootRef.once('value');
    const data = snapshot.val() || {};
    const settings = data.settings || {};
    const reminderHour = settings.reminderHour != null ? settings.reminderHour : 8;

    const nowAmsterdam = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
    const currentHour = nowAmsterdam.getHours();
    const today = localISODate(nowAmsterdam);

    if (currentHour !== reminderHour) {
      console.log(`Huidig uur (${currentHour}) is niet het ingestelde herinneringsuur (${reminderHour}), overslaan.`);
      return;
    }
    if (settings.lastPushDate === today) {
      console.log('Vandaag is er al een melding gestuurd, overslaan.');
      return;
    }

    const rooms = data.rooms || {};
    const roomIds = Object.keys(rooms)
      .filter((id) => rooms[id].active !== false)
      .sort((a, b) => (rooms[a].order || 0) - (rooms[b].order || 0));

    const lines = [];
    roomIds.forEach((roomId) => {
      const task = findTodayTask(rooms[roomId]);
      if (task) lines.push(`${rooms[roomId].name}: ${task.text} (+${task.points || 5}p)`);
    });

    if (lines.length === 0) {
      console.log('Geen actieve taken gevonden in geen enkele kamer, geen melding gestuurd.');
      await rootRef.child('settings/lastPushDate').set(today);
      return;
    }

    const tokensSnap = await rootRef.child('fcmTokens').once('value');
    const tokensData = tokensSnap.val() || {};
    const tokenKeys = Object.keys(tokensData);
    const tokens = tokenKeys.map((k) => tokensData[k].token).filter(Boolean);

    if (tokens.length === 0) {
      console.log('Geen geregistreerde apparaten voor pushmeldingen, overslaan.');
      await rootRef.child('settings/lastPushDate').set(today);
      return;
    }

    const title = 'Kamerpunten — vandaag';
    const body = lines.join(' · ');

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      data: { title, body }
    });

    // Ongeldige/verlopen tokens (bv. app van telefoon verwijderd) opruimen zodat
    // de tokenlijst niet blijft groeien met dode registraties.
    const removals = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error && res.error.code;
        if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
          removals.push(rootRef.child('fcmTokens').child(tokenKeys[idx]).remove());
        }
      }
    });
    await Promise.all(removals);

    await rootRef.child('settings/lastPushDate').set(today);
    console.log(`Melding gestuurd naar ${tokens.length} apparaat/apparaten: ${body}`);
  }
);
