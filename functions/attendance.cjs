const { onCall } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { checkAttendance, validateLocation, validId } = require("./domain.cjs");
exports.attendSession = onCall({ region: "asia-southeast2" }, async (req) => {
  const c = validId(req.data?.classId),
    s = validId(req.data?.sessionId);
  checkAuth(req);
  const db = getFirestore(),
    cr = db.doc(`classes/${c}`),
    sr = cr.collection("sessions").doc(s),
    rr = sr.collection("records").doc(req.auth.uid);
  return db.runTransaction(async (tx) => {
    const [cls, session, profile, record] = await tx.getAll(
      cr,
      sr,
      db.doc(`profiles/${req.auth.uid}`),
      rr,
    );
    checkAttendance(
      req.auth,
      cls.data(),
      session.data(),
      profile.data(),
      record.exists,
    );
    const labId = validId(session.data().labId),
      lab = await tx.get(db.doc(`labs/${labId}`));
    const meters = validateLocation(req.data.location, {
      ...lab.data(),
      radius: session.data().radius ?? lab.data()?.radius,
    });
    tx.create(rr, {
      kind: "hadir",
      name: profile.data().name,
      created: FieldValue.serverTimestamp(),
      location: {
        latitude: req.data.location.latitude,
        longitude: req.data.location.longitude,
        accuracy: req.data.location.accuracy,
      },
      distance: meters,
      labId,
    });
    return { distance: meters };
  });
});
function checkAuth(req) {
  if (!req.auth) {
    const { HttpsError } = require("firebase-functions/v2/https");
    throw new HttpsError("unauthenticated", "Silakan masuk.");
  }
}
