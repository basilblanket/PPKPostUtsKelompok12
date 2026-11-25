const { db } = require("../functions/admin.cjs");
const { getAuth } = require("node:module").createRequire(
  require("node:path").resolve(__dirname, "../functions/package.json"),
)("firebase-admin/auth");
(async () => {
  const user = await getAuth().getUserByEmail(
    process.env.ASSISTANT_EMAIL || "asisten@demo.test",
  );
  if (!user.customClaims?.asisten) throw Error("Akun bukan asisten.");
  const ref = db.doc("labs/informatika");
  if (!(await ref.get()).exists)
    await ref.create({
      ...require("../config/laboratorium.json"),
      owner: user.uid,
      archived: false,
    });
  const classes = await db
    .collection("classes")
    .where("owner", "==", user.uid)
    .get();
  let count = 0;
  for (const cls of classes.docs) {
    if (cls.data().archived) continue;
    const sessions = await cls.ref.collection("sessions").get();
    for (const session of sessions.docs) {
      if (!session.data().labId && session.data().status !== "diarsipkan") {
        await session.ref.update({ labId: "informatika" });
        count++;
      }
    }
  }
  console.log(
    `Laboratorium tersedia; ${count} sesi tanpa lokasi dihubungkan ke laboratorium.`,
  );
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
