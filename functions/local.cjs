// Trusted laptop backend for Spark. Firebase Auth and Firestore remain online.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env.server");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const { getAuth } = require("firebase-admin/auth");
const { db, projectId, emulator } = require("./admin.cjs");
const { attendSession } = require("./attendance.cjs");
const { classifyLeave, retryClassification } = require("./ai.cjs");
const {
  sessionNotifications,
  leaveNotifications,
  sendNotification,
} = require("./push.cjs");
const allowed = new Set(
  (
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:8082,http://127.0.0.1:8082,http://localhost:8083"
  ).split(","),
);
const handlers = { attendSession, retryClassification };
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !allowed.has(origin)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === "/health" && req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        projectId,
        mode: emulator ? "emulator" : "firebase-online",
      }),
    );
    return;
  }
  const handler = handlers[req.url?.slice(1)];
  if (!handler || req.method !== "POST") {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader("Content-Type", "application/json");
  try {
    const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!bearer) {
      res.writeHead(401);
      res.end(
        JSON.stringify({
          error: { message: "Silakan masuk kembali.", code: "unauthenticated" },
        }),
      );
      return;
    }
    let token;
    try {
      token = await getAuth().verifyIdToken(bearer, true);
    } catch {
      res.writeHead(401);
      res.end(
        JSON.stringify({
          error: {
            message: "Sesi login tidak valid. Masuk kembali.",
            code: "unauthenticated",
          },
        }),
      );
      return;
    }
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 16384)
        throw Error("Permintaan terlalu besar.");
    }
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw Error("Format permintaan tidak valid.");
    }
    const result = await handler.run({ data, auth: { uid: token.uid, token } });
    res.end(JSON.stringify({ result }));
  } catch (e) {
    res.statusCode = e.code === "permission-denied" ? 403 : 400;
    res.end(
      JSON.stringify({
        error: {
          code: e.code || "invalid-argument",
          message: e.code ? e.message : "Permintaan tidak valid.",
        },
      }),
    );
  }
});
const pending = new Map();
function queue(key, task) {
  const prev = pending.get(key) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(task)
    .catch((e) =>
      console.error("Pekerjaan backend gagal:", e.code || e.message),
    );
  pending.set(key, next);
  next.finally(() => {
    if (pending.get(key) === next) pending.delete(key);
  });
}
function stateRef(kind, snapshot) {
  const id = require("node:crypto")
    .createHash("sha256")
    .update(snapshot.ref.path)
    .digest("hex");
  return db.doc(`_backendState/${kind}-${id}`);
}
async function changed(snapshot, kind, handler, params) {
  const ref = stateRef(kind, snapshot),
    previous = (await ref.get()).data();
  const version = snapshot.updateTime.toMillis();
  if (previous?.version >= version) return;
  const after = snapshot.data();
  if (previous)
    await handler.run({
      id: `${snapshot.ref.path}:${version}`,
      params,
      data: {
        before: { data: () => previous.value },
        after: { data: () => after },
      },
    });
  await ref.set({ version, value: after });
}
const stops = [];
function listen(group, action) {
  stops.push(
    db.collectionGroup(group).onSnapshot(
      (snap) => {
        for (const change of snap.docChanges())
          if (change.type !== "removed")
            queue(change.doc.ref.path, () => action(change.doc));
      },
      (error) =>
        console.error(`Listener ${group} gagal:`, error.code || error.message),
    ),
  );
}
listen("sessions", (s) => {
  const parts = s.ref.path.split("/");
  if (parts.length !== 4 || parts[0] !== "classes") return;
  return changed(s, "session", sessionNotifications, {
    c: parts[1],
    s: parts[3],
  });
});
listen("records", async (s) => {
  const parts = s.ref.path.split("/");
  if (parts.length !== 6 || parts[0] !== "classes") return;
  const d = s.data();
  if (d.kind === "izin" && d.ai === "diproses")
    await classifyLeave.run({ data: s });
  await changed(s, "leave", leaveNotifications, {
    c: parts[1],
    s: parts[3],
    u: parts[5],
  });
});
listen("notifications", (s) => {
  if (s.ref.path.split("/").length === 4 && s.data().pushStatus === "menunggu")
    return sendNotification.run({
      data: s,
      params: { u: s.ref.parent.parent.id, n: s.id },
    });
});
server.listen(
  Number(process.env.BACKEND_PORT || 8787),
  process.env.BACKEND_HOST || "127.0.0.1",
  () =>
    console.log(
      `Backend siap: ${projectId} (${emulator ? "emulator" : "Firebase online"}) port ${process.env.BACKEND_PORT || 8787}`,
    ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stops.forEach((stop) => stop());
    server.close(() => process.exit(0));
  });
