const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateLocation,
  distance,
  checkAttendance,
} = require("../functions/domain.cjs");
const now = Date.now(),
  lab = { latitude: -7, longitude: 110, radius: 100, archived: false },
  p = { latitude: -7, longitude: 110, accuracy: 5, timestamp: now };
test("radius and valid coordinates", () => {
  assert.equal(validateLocation(p, lab, now), 0);
  assert.ok(distance(p, { latitude: -7.01, longitude: 110 }) > 1000);
  assert.throws(
    () => validateLocation({ ...p, latitude: -7.01 }, lab, now),
    /luar radius/,
  );
});
test("stale, inaccurate, mocked and invalid location rejected", () => {
  for (const patch of [
    { timestamp: now - 61000 },
    { accuracy: 101 },
    { mocked: true },
    { latitude: NaN },
    { latitude: 91 },
    { timestamp: now + 11000 },
  ])
    assert.throws(() => validateLocation({ ...p, ...patch }, lab, now));
  assert.throws(() => validateLocation(p, { ...lab, archived: true }, now));
});
test("identity, membership, session and duplicates checked", () => {
  const u = { uid: "p", token: {} },
    c = { members: ["p"], archived: false },
    s = { status: "terbuka" },
    profile = { name: "Putri" };
  assert.doesNotThrow(() => checkAttendance(u, c, s, profile, false));
  for (const args of [
    [null, c, s, profile, false],
    [{ uid: "x", token: {} }, c, s, profile, false],
    [u, c, { status: "ditutup" }, profile, false],
    [u, c, s, profile, true],
    [{ uid: "p", token: { asisten: true } }, c, s, profile, false],
  ])
    assert.throws(() => checkAttendance(...args));
});
