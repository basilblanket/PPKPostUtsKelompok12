import {
  initializeTestEnvironment,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const env = await initializeTestEnvironment({
  projectId: "demo-audit",
  firestore: { rules: readFileSync("firestore.rules", "utf8") },
});
try {
  await env.clearFirestore();
  const client = (id, claims = {}) =>
    env.authenticatedContext(id, claims).firestore();
  const a = client("a", { asisten: true }),
    p = client("p"),
    q = client("q"),
    outsider = client("x"),
    b = client("b", { asisten: true });
  const c = "classes/lab",
    s = c + "/sessions/01",
    r = s + "/records/";
  await setDoc(doc(p, "profiles/p"), { name: "Putri" });
  await setDoc(doc(q, "profiles/q"), { name: "Raka" });
  const cls = { title: "Algoritma", owner: "a", members: [], archived: false };
  await assertFails(setDoc(doc(p, c), { ...cls, owner: "p" }));
  await setDoc(doc(a, c), cls);
  await assertFails(updateDoc(doc(a, c), { members: ["uid-salah"] }));
  await updateDoc(doc(a, c), { members: ["p"] });
  await updateDoc(doc(a, c), { members: ["p", "q"] });
  await assertFails(updateDoc(doc(a, c), { members: ["p", "q", "p"] }));
  await assertFails(updateDoc(doc(a, c), { owner: "b" }));
  await setDoc(doc(a, "labs/test"), {
    title: "Lab Test",
    owner: "a",
    latitude: -7,
    longitude: 110,
    radius: 100,
    archived: false,
  });
  await assertFails(
    setDoc(doc(p, "labs/illegal"), {
      title: "Bad",
      owner: "p",
      latitude: 0,
      longitude: 0,
      radius: 100,
      archived: false,
    }),
  );
  await setDoc(doc(a, s), {
    title: "Sorting",
    labId: "test",
    at: Timestamp.now(),
    status: "terjadwal",
  });
  const hadir = { name: "Putri", kind: "hadir", created: serverTimestamp() };
  await assertFails(setDoc(doc(p, r + "p"), hadir));
  await assertFails(
    setDoc(doc(q, r + "q"), {
      ...hadir,
      name: "Raka",
      location: { latitude: -7, longitude: 110 },
    }),
  );
  await assertFails(getDoc(doc(outsider, s)));
  await assertFails(updateDoc(doc(b, s), { status: "terbuka" }));
  await updateDoc(doc(a, s), { status: "terbuka" });
  function watch(ref, predicate, trigger) {
    let started = false;
    return new Promise((yes, no) => {
      const timer = setTimeout(() => {
        off();
        no(Error("Listener timeout"));
      }, 45000);
      const off = onSnapshot(
        ref,
        { includeMetadataChanges: true },
        (x) => {
          if (predicate(x)) {
            clearTimeout(timer);
            off();
            yes();
          } else if (!started && !x.metadata.fromCache) {
            started = true;
            trigger().catch(no);
          }
        },
        no,
      );
    });
  }
  await watch(
    doc(a, r + "p"),
    (x) => x.data()?.kind === "hadir",
    () =>
      env.withSecurityRulesDisabled((ctx) =>
        setDoc(doc(ctx.firestore(), r + "p"), hadir),
      ),
  );
  await assertFails(setDoc(doc(p, r + "p"), hadir));
  await assertFails(getDoc(doc(q, r + "p")));
  const izin = {
    name: "Raka",
    kind: "izin",
    reason: "Sedang sakit",
    decision: "menunggu",
    ai: "diproses",
    created: serverTimestamp(),
  };
  await setDoc(doc(q, r + "q"), izin);
  await assertFails(updateDoc(doc(q, r + "q"), { decision: "diterima" }));
  await env.withSecurityRulesDisabled((ctx) =>
    updateDoc(doc(ctx.firestore(), r + "q"), {
      ai: "selesai",
      category: "Kesehatan",
    }),
  );
  assert.equal((await getDoc(doc(a, r + "q"))).data().decision, "menunggu");
  await watch(
    doc(q, r + "q"),
    (x) => x.data()?.decision === "diterima",
    () =>
      updateDoc(doc(a, r + "q"), {
        decision: "diterima",
        reviewed: serverTimestamp(),
        reviewer: "a",
      }),
  );
  await updateDoc(doc(a, s), { status: "ditutup" });
  const concurrent = c + "/sessions/concurrent";
  await setDoc(doc(a, concurrent), {
    title: "Concurrent",
    labId: "test",
    at: Timestamp.now(),
    status: "terjadwal",
  });
  await updateDoc(doc(a, concurrent), { status: "terbuka" });
  const attempts = await Promise.allSettled([
    setDoc(doc(p, concurrent + "/records/p"), hadir),
    setDoc(doc(p, concurrent + "/records/p"), hadir),
  ]);
  assert.equal(attempts.filter((x) => x.status === "fulfilled").length, 0);
  await updateDoc(doc(a, c), { members: ["p"] });
  await assertFails(getDoc(doc(q, r + "q")));
  await updateDoc(doc(a, c), { archived: true });
  await assertFails(setDoc(doc(p, concurrent + "/records/p"), hadir));
  console.log(
    "Lulus: otorisasi, buka/tutup, presensi tunggal, isolasi peserta, izin, keputusan, listener dua akun.",
  );
} finally {
  await env.cleanup();
}
