const path = require("node:path"),
  fs = require("node:fs");
const root = path.resolve(__dirname, ".."),
  envFile = path.join(root, ".env.server");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const {
  initializeApp,
  getApps,
  applicationDefault,
} = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const projectId =
    process.env.FIREBASE_PROJECT_ID || "ppkpostutskelompok12-5862a",
  emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
let credential;
if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const cli = require(path.join(root, "node_modules/firebase-tools/lib/auth")),
    account = cli.getGlobalDefaultAccount();
  if (!account)
    throw Error(
      "Jalankan npx firebase login atau set GOOGLE_APPLICATION_CREDENTIALS di server.",
    );
  const api = require(path.join(root, "node_modules/firebase-tools/lib/api"));
  const dir = path.join(root, ".firebase");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const adc = path.join(dir, "local-adc.json");
  fs.writeFileSync(
    adc,
    JSON.stringify({
      type: "authorized_user",
      client_id: api.clientId(),
      client_secret: api.clientSecret(),
      refresh_token: account.tokens.refresh_token,
    }),
    { mode: 0o600 },
  );
  process.env.GOOGLE_APPLICATION_CREDENTIALS = adc;
  credential = applicationDefault();
}
if (!getApps().length)
  initializeApp({ projectId, ...(credential ? { credential } : {}) });
module.exports = { db: getFirestore(), projectId, emulator };
