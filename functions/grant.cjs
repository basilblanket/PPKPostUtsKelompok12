const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
(async () => {
  const [projectId, uid] = process.argv.slice(2);
  if (!projectId || !uid) throw Error("Gunakan: node grant.cjs PROJECT_ID UID");
  initializeApp({ projectId, credential: applicationDefault() });
  const auth = getAuth();
  const user = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, { ...user.customClaims, asisten: true });
  console.log("Peran diperbarui. Keluar dan masuk kembali.");
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
