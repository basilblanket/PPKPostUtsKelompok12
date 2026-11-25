const fs = require("node:fs");
for (const [path, body] of Object.entries({
  "functions/.env.local":
    "AI_PROTOCOL=category\nAI_URL=https://example.invalid\nAI_MODEL=unconfigured\nVAPID_PUBLIC_KEY=unconfigured\nVAPID_SUBJECT=mailto:admin@example.com\n",
  "functions/.secret.local":
    "AI_TOKEN=NONE\nVAPID_PRIVATE_KEY=local-emulator-not-configured\n",
}))
  if (!fs.existsSync(path)) fs.writeFileSync(path, body, { mode: 0o600 });
