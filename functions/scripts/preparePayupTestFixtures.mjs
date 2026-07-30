import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  assertPayupTestFixtureContracts,
  payupTestProductFixtures,
  payupTestScenarios,
} from "../lib/payup/testFixtures.js";

if (process.env.PAYUP_ENVIRONMENT !== "test") {
  throw new Error("PAYUP_ENVIRONMENT=test is required.");
}
if (String(process.env.CONFIRM_PAYUP_TEST_FIXTURES ?? "").toLowerCase() !== "true") {
  throw new Error("CONFIRM_PAYUP_TEST_FIXTURES=true is required.");
}
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
if (!projectId) throw new Error("GCP_PROJECT_ID is required.");
if (getApps().length === 0) initializeApp({ projectId });

const result = assertPayupTestFixtureContracts();
const db = getFirestore();
const nowIso = new Date().toISOString();
const batch = db.batch();
for (const fixture of payupTestProductFixtures) {
  batch.set(db.doc(`products/${fixture.id}`), {
    id: fixture.id,
    title: fixture.title,
    name: fixture.title,
    closed_mall_price: fixture.price,
    price: fixture.price,
    currency: "KRW",
    status: "active",
    stock: 100,
    inventory: 100,
    reserved_inventory: 0,
    test_only: true,
    hidden_from_catalog: true,
    visibility: "internal_test",
    payment_provider: "payup",
    payup_distribution_lines: fixture.lines,
    payup_distribution_policy_version: 1,
    payup_distribution_updated_at_iso: nowIso,
    updated_at: FieldValue.serverTimestamp(),
    updated_at_iso: nowIso,
  }, { merge: true });
}
for (const scenario of payupTestScenarios) {
  batch.set(db.doc(`payup_test_cases/${scenario.id}`), {
    ...scenario,
    provider: "payup",
    environment: "test",
    status: "READY_AFTER_SUBMERCHANT_VERIFICATION",
    test_only: true,
    updated_at: FieldValue.serverTimestamp(),
    updated_at_iso: nowIso,
  }, { merge: true });
}
await batch.commit();
console.log(`[preparePayupTestFixtures] ${result.productCount} products and ${result.scenarioCount} scenarios prepared.`);
