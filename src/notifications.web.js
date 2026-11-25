import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../client";
function keyBytes(s) {
  return Uint8Array.from(
    atob(
      s.replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (s.length % 4)) % 4),
    ),
    (c) => c.charCodeAt(0),
  );
}
export async function enablePush(uid) {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !window.isSecureContext
  )
    throw Error(
      "Browser ini belum mendukung push. Gunakan Chrome/HTTPS atau localhost.",
    );
  const key = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw Error("Layanan push web belum dikonfigurasi oleh pengelola.");
  if ((await Notification.requestPermission()) !== "granted")
    throw Error("Izin notifikasi ditolak. Aktifkan melalui pengaturan situs.");
  const registration = await navigator.serviceWorker.register("/push-sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(key),
    }));
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(subscription.endpoint),
  );
  const id = Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const previous = localStorage.getItem("push-owner");
  if (previous && previous !== uid)
    throw Error(
      "Notifikasi browser masih terkait akun lain. Matikan notifikasi dan keluar dari akun sebelumnya terlebih dahulu.",
    );
  await setDoc(doc(db, "profiles", uid, "devices", id), {
    platform: "web",
    subscription: JSON.stringify(subscription.toJSON()),
    updated: serverTimestamp(),
  });
  localStorage.setItem("push-device:" + uid, id);
  localStorage.setItem("push-owner", uid);
}
export async function disablePush(uid) {
  const id = localStorage.getItem("push-device:" + uid);
  if (id) await deleteDoc(doc(db, "profiles", uid, "devices", id));
  localStorage.removeItem("push-device:" + uid);
  if (localStorage.getItem("push-owner") === uid) {
    localStorage.removeItem("push-owner");
    const r = await navigator.serviceWorker?.getRegistration("/push-sw.js");
    const s = await r?.pushManager.getSubscription();
    await s?.unsubscribe();
  }
}
