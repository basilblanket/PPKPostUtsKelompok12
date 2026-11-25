import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  collection,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
const require = createRequire(
  new URL("../functions/index.js", import.meta.url),
);
const { initializeApp: adminInit } = require("firebase-admin/app"),
  { getAuth: adminAuth } = require("firebase-admin/auth");
adminInit({ projectId: "demo-sprint3" });
const apps = [];
let localServer;
if (process.env.TEST_LOCAL_BACKEND === "1") {
  const { spawn } = await import("node:child_process");
  localServer = spawn(process.execPath, ["functions/local.cjs"], {
    env: {
      ...process.env,
      FIREBASE_PROJECT_ID: "demo-sprint3",
      BACKEND_PORT: "18492",
      AI_URL: "https://example.invalid",
      AI_TOKEN: "NONE",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(Error("Backend startup timeout")),
      20000,
    );
    localServer.stdout.on("data", (b) => {
      if (b.toString().includes("Backend siap")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    localServer.on("exit", (code) => {
      clearTimeout(timeout);
      reject(Error("Backend exited " + code));
    });
    localServer.stderr.on("data", (b) => process.stderr.write(b));
  });
}
async function client(name, staff = false) {
  const app = initializeApp(
    { projectId: "demo-sprint3", apiKey: "fake", appId: "demo" },
    name,
  );
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:18490", {
    disableWarnings: true,
  });
  const u = (
    await createUserWithEmailAndPassword(
      auth,
      name + "@demo.test",
      "Praktikum123",
    )
  ).user;
  if (staff) {
    await adminAuth().setCustomUserClaims(u.uid, { asisten: true });
    await u.getIdToken(true);
  }
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 18480);
  const f = getFunctions(app, "asia-southeast2");
  connectFunctionsEmulator(f, "127.0.0.1", 18491);
  await setDoc(doc(db, "profiles", u.uid), { name });
  return {
    u,
    db,
    attend:
      process.env.TEST_LOCAL_BACKEND === "1"
        ? async (data) => {
            const r = await fetch("http://127.0.0.1:18492/attendSession", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + (await u.getIdToken()),
              },
              body: JSON.stringify(data),
            });
            const result = await r.json();
            if (result.error) throw Error(result.error.message);
            return result.result;
          }
        : httpsCallable(f, "attendSession"),
  };
}
async function waitFor(ref, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      off();
      reject(Error("Listener timeout"));
    }, 40000);
    const off = onSnapshot(
      ref,
      (s) => {
        if (predicate(s)) {
          clearTimeout(timer);
          off();
          resolve(s);
        }
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
try {
  const a = await client("assistant", true),
    p = await client("student"),
    q = await client("outsider");
  const lab = {
    title: "Lab test",
    owner: a.u.uid,
    latitude: -7,
    longitude: 110,
    radius: 100,
    archived: false,
  };
  await setDoc(doc(a.db, "labs/lab"), lab);
  await setDoc(doc(a.db, "classes/c"), {
    title: "Kelas test",
    owner: a.u.uid,
    members: [],
    archived: false,
  });
  await updateDoc(doc(a.db, "classes/c"), { members: [p.u.uid] });
  const s = "classes/c/sessions/s";
  await setDoc(doc(a.db, s), {
    title: "Praktikum test",
    at: Timestamp.now(),
    status: "terjadwal",
    labId: "lab",
  });
  const payload = () => ({
    classId: "c",
    sessionId: "s",
    location: {
      latitude: -7,
      longitude: 110,
      accuracy: 5,
      timestamp: Date.now(),
    },
  });
  await assert.rejects(p.attend(payload()), /ditutup|dibuka/);
  await updateDoc(doc(a.db, s), { status: "terbuka" });
  await assert.rejects(q.attend(payload()), /bukan praktikan/);
  await assert.rejects(
    p.attend({
      ...payload(),
      location: { ...payload().location, latitude: -7.1 },
    }),
    /luar radius/,
  );
  await assert.rejects(
    p.attend({
      ...payload(),
      location: { ...payload().location, timestamp: Date.now() - 120000 },
    }),
    /kedaluwarsa/,
  );
  await assert.rejects(
    setDoc(doc(p.db, s + "/records/" + p.u.uid), {
      kind: "hadir",
      name: "student",
      created: serverTimestamp(),
    }),
  );
  const results = await Promise.allSettled([
    p.attend(payload()),
    p.attend(payload()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const record = (await getDoc(doc(a.db, s + "/records/" + p.u.uid))).data();
  assert.equal(record.distance, 0);
  assert.equal(record.kind, "hadir");
  await waitFor(
    collection(p.db, "profiles", p.u.uid, "notifications"),
    (snap) => snap.docs.some((d) => d.data().title === "Sesi praktikum dibuka"),
  );
  await updateDoc(doc(a.db, s), { title: "Jadwal diperbarui" });
  await waitFor(
    collection(p.db, "profiles", p.u.uid, "notifications"),
    (snap) =>
      snap.docs.some((d) => d.data().title === "Jadwal praktikum berubah"),
  );
  const s2 = "classes/c/sessions/leave";
  await setDoc(doc(a.db, s2), {
    title: "Izin test",
    at: Timestamp.now(),
    status: "terjadwal",
    labId: "lab",
  });
  await setDoc(doc(p.db, s2 + "/records/" + p.u.uid), {
    name: "student",
    kind: "izin",
    reason: "Sakit",
    decision: "menunggu",
    ai: "diproses",
    created: serverTimestamp(),
  });
  await waitFor(
    doc(p.db, s2 + "/records/" + p.u.uid),
    (snap) => snap.data()?.ai === "tidak tersedia",
  );
  assert.equal(
    (await getDoc(doc(p.db, s2 + "/records/" + p.u.uid))).data().decision,
    "menunggu",
  );
  await updateDoc(doc(a.db, s2 + "/records/" + p.u.uid), {
    decision: "diterima",
    reviewer: a.u.uid,
    reviewed: serverTimestamp(),
  });
  await waitFor(
    collection(p.db, "profiles", p.u.uid, "notifications"),
    (snap) => snap.docs.some((d) => d.data().title === "Izin diterima"),
  );
  await assert.rejects(getDoc(doc(q.db, s + "/records/" + p.u.uid)));
  await updateDoc(doc(a.db, s), { status: "ditutup" });
  await assert.rejects(p.attend(payload()), /ditutup/);
  console.log(
    "LULUS: callable geofence, login emulator, lokasi ditolak, presensi konkuren tunggal, AI gagal tanpa keputusan otomatis, event notifikasi buka/jadwal/izin.",
  );
} finally {
  localServer?.kill("SIGTERM");
  await Promise.all(apps.map(deleteApp));
}
