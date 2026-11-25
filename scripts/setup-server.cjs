const fs = require("node:fs"),
  { createRequire } = require("node:module"),
  path = require("node:path");
const req = createRequire(path.resolve("functions/package.json"));
if (!fs.existsSync(".env.server")) {
  const keys = req("web-push").generateVAPIDKeys();
  const body = fs
    .readFileSync(".env.server.example", "utf8")
    .replace("VAPID_PUBLIC_KEY=", "VAPID_PUBLIC_KEY=" + keys.publicKey)
    .replace("VAPID_PRIVATE_KEY=", "VAPID_PRIVATE_KEY=" + keys.privateKey);
  fs.writeFileSync(".env.server", body, { mode: 0o600 });
}
const values = Object.fromEntries(
  fs
    .readFileSync(".env.server", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
let client = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
for (const [key, val] of Object.entries({
  EXPO_PUBLIC_BACKEND_URL: "http://localhost:8787",
  EXPO_PUBLIC_VAPID_PUBLIC_KEY: values.VAPID_PUBLIC_KEY,
})) {
  const re = new RegExp("^" + key + "=.*$", "m");
  client = re.test(client)
    ? client.replace(re, key + "=" + val)
    : client + "\n" + key + "=" + val + "\n";
}
fs.writeFileSync(".env", client, { mode: 0o600 });
console.log(
  "Konfigurasi backend lokal dan kunci push web tersimpan di file lokal yang diabaikan Git.",
);
