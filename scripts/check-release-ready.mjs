import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredFiles = [
  "firebase.json",
  ".firebaserc",
  "firestore.rules",
  "storage.rules",
  "functions/src/payments/ready.ts",
  "functions/src/payments/confirm.ts",
  "functions/src/payments/status.ts",
  "functions/src/payments/providerAdapter.ts",
  "functions/src/auth/verifyClaims.ts",
  "types/authClaims.ts",
  "types/compliance.ts",
  "data/legalCompliance.ts",
  "components/company/CompanyFirebaseOperations.tsx",
  "components/nursery/NurseryFirebaseOperations.tsx",
  "scripts/check-env.mjs",
  "scripts/check-no-secrets.mjs",
  "scripts/check-routes.mjs",
  "scripts/check-firestore-products.mjs",
  "scripts/check-release-ready.mjs",
  "QA_RELEASE_GATE.md",
  "CLOUD_DEPLOY_CHECKLIST.md",
  "FIREBASE_RELEASE_CHECKLIST.md",
];

const blockedFiles = [".env.local", ".env.production", "serviceAccountKey.json", "firebase-service-account.json"];

console.log("[check:release-ready] A5 Firebase/PG-ready file gate");

const missing = requiredFiles.filter((relativePath) => !fs.existsSync(path.join(root, relativePath)));
for (const relativePath of requiredFiles) {
  console.log(`- ${relativePath}: ${missing.includes(relativePath) ? "missing" : "present"}`);
}

const riskyExisting = blockedFiles.filter((relativePath) => relativePath !== ".env.local" && fs.existsSync(path.join(root, relativePath)));

if (missing.length > 0) {
  console.error(`[check:release-ready] Missing required files: ${missing.join(", ")}`);
}

if (riskyExisting.length > 0) {
  console.error(`[check:release-ready] Risky files exist: ${riskyExisting.join(", ")}`);
}

if (missing.length > 0 || riskyExisting.length > 0) {
  process.exitCode = 1;
} else {
  console.log("[check:release-ready] OK. Secrets were not printed.");
}
