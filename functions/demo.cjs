const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { spawn } = require("node:child_process");

async function main() {
  if (
    !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    !process.env.FIRESTORE_EMULATOR_HOST
  )
    throw Error("Jalankan dari akar proyek dengan npm run demo.");
  initializeApp({ projectId: "demo-praktikum" });
  const db = getFirestore();
  const auth = getAuth();
  for (const uid of ["asisten", "praktikan"]) {
    const name = uid === "asisten" ? "Asisten Demo" : "Praktikan Demo";
    try {
      await auth.getUser(uid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
      await auth.createUser({
        uid,
        email: uid + "@demo.test",
        password: "Praktikum123",
      });
    }
    if (uid === "asisten")
      await auth.setCustomUserClaims(uid, { asisten: true });
    const profile = db.doc("profiles/" + uid);
    if (!(await profile.get()).exists) await profile.create({ name });
  }
  const cls = db.doc("classes/kelas-a");
  if (!(await cls.get()).exists)
    await cls.create({
      title: "Pemrograman Mobile · Kelas A",
      owner: "asisten",
      members: ["praktikan"],
      archived: false,
    });
  const lab = db.doc("labs/informatika");
  if (!(await lab.get()).exists)
    await lab.create({
      ...require("../config/laboratorium.json"),
      owner: "asisten",
      archived: false,
    });
  for (const [i, title] of ["Presensi praktikum", "Pengajuan izin"].entries()) {
    const ref = cls.collection("sessions").doc("s" + i);
    if (!(await ref.get()).exists)
      await ref.create({
        title,
        labId: "informatika",
        status: "terjadwal",
        at: Timestamp.fromMillis(Date.now() + 86400000 * i),
      });
  }
  for (const id of ["s0", "s1"]) {
    const ref = cls.collection("sessions").doc(id);
    if (!(await ref.get()).data()?.labId)
      await ref.update({ labId: "informatika" });
  }
  const expo = spawn(
    process.execPath,
    [
      require.resolve("expo/bin/cli"),
      "start",
      "--web",
      "--localhost",
      "--port",
      process.env.DEMO_PORT || "8083",
    ],
    {
      stdio: "inherit",
      env: {
        EXPO_PUBLIC_FUNCTIONS_PORT: "15001",
        ...process.env,
        EXPO_PUBLIC_DEMO: "1",
        EXPO_PUBLIC_AUTH_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
        EXPO_PUBLIC_STORE_PORT:
          process.env.FIRESTORE_EMULATOR_HOST.split(":").pop(),
      },
    },
  );
  expo.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
