const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
initializeApp();
const token = defineSecret("AI_TOKEN"),
  endpoint = defineString("AI_URL");
exports.classifyLeave = onDocumentCreated(
  {
    document: "classes/{c}/sessions/{s}/records/{u}",
    secrets: [token],
    retry: true,
  },
  async (event) => {
    const snap = event.data;
    if (!snap || snap.data().kind !== "izin") return;
    const current = await snap.ref.get();
    if (current.data()?.ai !== "diproses") return;
    let patch;
    try {
      const url = new URL(endpoint.value());
      if (url.protocol !== "https:") throw Error("URL");
      const key = token.value();
      const res = await fetch(url, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          ...(key && key !== "NONE" ? { Authorization: "Bearer " + key } : {}),
        },
        body: JSON.stringify({ reason: snap.data().reason }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw Error("HTTP");
      const category = (await res.json()).category;
      if (
        typeof category !== "string" ||
        !category.trim() ||
        category.length > 100
      )
        throw Error("format");
      patch = { ai: "selesai", category: category.trim() };
    } catch {
      patch = { ai: "tidak tersedia" };
    }
    await snap.ref.firestore.runTransaction(async (tx) => {
      const latest = await tx.get(snap.ref);
      if (latest.data()?.ai === "diproses") tx.update(snap.ref, patch);
    });
  },
);
