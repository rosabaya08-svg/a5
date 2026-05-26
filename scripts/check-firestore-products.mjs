import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function loadLocalEnv() {
  if (!fs.existsSync(envPath)) return {};

  const values = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    values[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }

  return values;
}

const localEnv = loadLocalEnv();
const env = (key) => process.env[key] ?? localEnv[key] ?? "";
const config = {
  apiKey: env("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: env("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: env("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

const missing = Object.entries(config)
  .filter(([, value]) => !value)
  .map(([key]) => key);

console.log("[check:firestore-products] Firebase products read smoke");

if (missing.length > 0) {
  console.error(`[check:firestore-products] Missing public Firebase config fields: ${missing.join(", ")}`);
  process.exit(1);
}

const app = initializeApp(config);
const db = getFirestore(app);
const snapshot = await getDocs(query(collection(db, "products"), where("status", "==", "active")));
const products = snapshot.docs.map((doc) => ({
  id: doc.id,
  title: String(doc.data().title ?? doc.data().name ?? ""),
  status: String(doc.data().status ?? ""),
  seeded_at: doc.data().seeded_at ? "present" : "missing",
}));

console.log(`[check:firestore-products] active products: ${products.length}`);
for (const product of products) {
  console.log(`- ${product.id} | ${product.status} | seeded_at:${product.seeded_at}`);
}

if (products.length === 0) {
  console.error("[check:firestore-products] No active Firestore products found.");
  process.exitCode = 1;
}
