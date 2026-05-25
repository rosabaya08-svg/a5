import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const envFiles = [".env.local", ".env.development.local", ".env.production.local"];
const requiredPublicFirebaseKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const values = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    values[key] = value.length > 0;
  }

  return values;
}

const filePresence = {};
for (const envFile of envFiles) {
  Object.assign(filePresence, parseEnvFile(path.join(root, envFile)));
}

const results = requiredPublicFirebaseKeys.map((key) => ({
  key,
  present: Boolean(process.env[key]) || Boolean(filePresence[key]),
}));

const missing = results.filter((item) => !item.present).map((item) => item.key);

console.log("[check:env] NEXT_PUBLIC_FIREBASE_* key presence");
for (const item of results) {
  console.log(`- ${item.key}: ${item.present ? "present" : "missing"}`);
}

if (missing.length > 0) {
  console.error(`[check:env] Missing required public Firebase keys: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("[check:env] OK. No secret values were printed.");
}
