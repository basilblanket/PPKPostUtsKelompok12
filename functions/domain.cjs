const { HttpsError } = require("firebase-functions/v2/https");
function fail(code, message) {
  throw new HttpsError(code, message);
}
function distance(a, b) {
  const r = Math.PI / 180,
    dlat = (b.latitude - a.latitude) * r,
    dlon = (b.longitude - a.longitude) * r;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(dlon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function validateLocation(p, lab, now = Date.now()) {
  if (
    !p ||
    !Number.isFinite(p.latitude) ||
    Math.abs(p.latitude) > 90 ||
    !Number.isFinite(p.longitude) ||
    Math.abs(p.longitude) > 180 ||
    !Number.isFinite(p.accuracy) ||
    p.accuracy < 0 ||
    !Number.isFinite(p.timestamp)
  )
    fail("invalid-argument", "Koordinat perangkat tidak valid.");
  if (p.mocked === true)
    fail(
      "failed-precondition",
      "Lokasi simulasi tidak dapat digunakan untuk presensi.",
    );
  if (now - p.timestamp > 60000 || p.timestamp > now + 10000)
    fail("failed-precondition", "Lokasi kedaluwarsa. Periksa lokasi kembali.");
  if (
    !lab ||
    lab.archived ||
    !Number.isFinite(lab.latitude) ||
    !Number.isFinite(lab.longitude) ||
    !Number.isFinite(lab.radius)
  )
    fail("failed-precondition", "Lokasi laboratorium belum tersedia.");
  if (p.accuracy > Math.min(lab.radius, 100))
    fail(
      "failed-precondition",
      "Akurasi lokasi belum cukup. Aktifkan lokasi presisi dan coba di area terbuka.",
    );
  const meters = distance(p, lab);
  if (meters > lab.radius)
    fail(
      "failed-precondition",
      `Anda berada di luar radius laboratorium (${Math.round(meters)} m; radius ${lab.radius} m).`,
    );
  return Math.round(meters);
}
function checkAttendance(user, cls, session, profile, existing) {
  if (!user) fail("unauthenticated", "Silakan masuk kembali.");
  if (
    user.token.asisten ||
    !cls ||
    cls.archived ||
    !cls.members.includes(user.uid)
  )
    fail("permission-denied", "Anda bukan praktikan kelas ini.");
  if (!session || session.status !== "terbuka")
    fail(
      "failed-precondition",
      "Sesi presensi belum dibuka atau sudah ditutup.",
    );
  if (!profile?.name)
    fail("failed-precondition", "Lengkapi profil terlebih dahulu.");
  if (existing)
    fail(
      "already-exists",
      "Presensi atau pengajuan izin sudah tercatat untuk sesi ini.",
    );
}
function validId(id) {
  if (typeof id !== "string" || !id || id.length > 150 || id.includes("/"))
    fail("invalid-argument", "ID data tidak valid.");
  return id;
}
module.exports = { distance, validateLocation, checkAttendance, validId };
