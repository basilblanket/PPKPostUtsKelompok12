const {
  onDocumentUpdated,
  onDocumentCreated,
} = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const webpush = require("web-push");
const privateKey = defineSecret("VAPID_PRIVATE_KEY");
const publicKey = defineString("VAPID_PUBLIC_KEY", { default: "" });
const subject = defineString("VAPID_SUBJECT", {
  default: "mailto:admin@example.com",
});
const region = "asia-southeast2";
async function enqueue(event, users, title, body, classId, sessionId) {
  const db = getFirestore();
  await Promise.all(
    [...new Set(users)].map(async (uid) => {
      const id = require("node:crypto")
        .createHash("sha256")
        .update(event.id + uid)
        .digest("hex");
      try {
        await db.doc(`profiles/${uid}/notifications/${id}`).create({
          title,
          body,
          classId,
          sessionId,
          created: FieldValue.serverTimestamp(),
          read: false,
          pushStatus: "menunggu",
        });
      } catch (e) {
        if (e.code !== 6) throw e;
      }
    }),
  );
}
exports.sessionNotifications = onDocumentUpdated(
  { document: "classes/{c}/sessions/{s}", region, retry: true },
  async (event) => {
    const before = event.data.before.data(),
      after = event.data.after.data();
    const opened = before.status !== "terbuka" && after.status === "terbuka";
    const changed =
      before.at.toMillis() !== after.at.toMillis() ||
      before.title !== after.title ||
      before.labId !== after.labId;
    if ((!opened && !changed) || after.status === "diarsipkan") return;
    const cls = (
      await getFirestore().doc(`classes/${event.params.c}`).get()
    ).data();
    if (!cls || cls.archived) return;
    const when = after.at
      .toDate()
      .toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    await enqueue(
      event,
      cls.members,
      opened ? "Sesi praktikum dibuka" : "Jadwal praktikum berubah",
      `${after.title} · ${cls.title} · ${when} WIB`,
      event.params.c,
      event.params.s,
    );
  },
);
exports.leaveNotifications = onDocumentUpdated(
  { document: "classes/{c}/sessions/{s}/records/{u}", region, retry: true },
  async (event) => {
    const b = event.data.before.data(),
      a = event.data.after.data();
    if (
      a.kind !== "izin" ||
      b.decision === a.decision ||
      !["diterima", "ditolak"].includes(a.decision)
    )
      return;
    const db = getFirestore(),
      cls = (await db.doc(`classes/${event.params.c}`).get()).data();
    if (!cls || cls.archived || !cls.members.includes(event.params.u)) return;
    const s = (
      await db.doc(`classes/${event.params.c}/sessions/${event.params.s}`).get()
    ).data();
    await enqueue(
      event,
      [event.params.u],
      `Izin ${a.decision}`,
      `${s?.title || "Praktikum"} · ${cls.title}. Keputusan diberikan oleh asisten.`,
      event.params.c,
      event.params.s,
    );
  },
);
function safeSubscription(raw) {
  const sub = JSON.parse(raw),
    url = new URL(sub.endpoint);
  const hosts = [
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "web.push.apple.com",
  ];
  if (
    url.protocol !== "https:" ||
    !hosts.some((h) => url.hostname === h || url.hostname.endsWith("." + h))
  )
    throw Error("Endpoint push tidak didukung");
  return sub;
}
exports.sendNotification = onDocumentCreated(
  {
    document: "profiles/{u}/notifications/{n}",
    region,
    secrets: [privateKey],
    retry: true,
  },
  async (event) => {
    const ref = event.data.ref,
      db = getFirestore(),
      n = event.data.data();
    const cls = (await db.doc(`classes/${n.classId}`).get()).data();
    if (!cls || cls.archived || !cls.members.includes(event.params.u)) {
      await ref.update({ pushStatus: "dibatalkan" });
      return;
    }
    const devices = await db
      .collection(`profiles/${event.params.u}/devices`)
      .get();
    let accepted = 0,
      failed = 0;
    for (const device of devices.docs) {
      const d = device.data();
      try {
        if (d.platform === "web") {
          await webpush.sendNotification(
            safeSubscription(d.subscription),
            JSON.stringify({ title: n.title, body: n.body }),
            {
              vapidDetails: {
                subject: subject.value(),
                publicKey: publicKey.value(),
                privateKey: privateKey.value(),
              },
              timeout: 10000,
              TTL: 3600,
            },
          );
        } else {
          if (
            !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(
              d.token,
            )
          )
            throw Error("token");
          const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: d.token,
              title: n.title,
              body: n.body,
              sound: "default",
              channelId: "praktikum",
              data: { classId: n.classId, sessionId: n.sessionId },
            }),
            signal: AbortSignal.timeout(10000),
          });
          const data = await response.json();
          if (!response.ok || data.data?.status !== "ok") {
            if (data.data?.details?.error === "DeviceNotRegistered")
              await device.ref.delete();
            throw Error("push");
          }
        }
        accepted++;
      } catch (e) {
        failed++;
        if (e.statusCode === 404 || e.statusCode === 410)
          await device.ref.delete();
      }
    }
    await ref.update({
      pushStatus: accepted
        ? "dikirim ke layanan push"
        : failed
          ? "gagal dikirim"
          : "perangkat belum terdaftar",
      pushAccepted: accepted,
      pushFailed: failed,
    });
  },
);
