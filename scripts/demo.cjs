require("./prepare-emulator.cjs");
const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const cli = require.resolve("firebase-tools/lib/bin/firebase");
const args = [
  "emulators:exec",
  "--project",
  "demo-praktikum",
  "--only",
  "auth,firestore,functions",
  "--export-on-exit",
  ".demo-data",
];
if (existsSync(".demo-data/firebase-export-metadata.json"))
  args.push("--import", ".demo-data");
const result = spawnSync(
  process.execPath,
  [cli, ...args, "node functions/demo.cjs"],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
