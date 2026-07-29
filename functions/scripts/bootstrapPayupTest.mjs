import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
if (!projectId) throw new Error("GCP_PROJECT_ID is required.");
if (getApps().length === 0) initializeApp({ projectId });

const db = getFirestore();
const now = new Date().toISOString();
const flags = {
  PAYUP_MASTER: false,
  NEW_ORDER: false,
  PAYMENT_WINDOW: false,
  CART_DISTRIBUTION: false,
  FINAL_APPROVAL: false,
  SUBMERCHANT_CREATE: true,
  SUBMERCHANT_UPDATE: true,
  SUBMERCHANT_SYNC: true,
  TRANSACTION_RECON: true,
  SETTLEMENT_RECON: true,
  FULL_CANCEL: false,
  PARTIAL_CANCEL: false,
  PAYOUT_HOLD: true,
  MOCK_MODE: false,
  LOCAL_PAID_FALLBACK: false,
};

const batch = db.batch();
for (const [key, enabled] of Object.entries(flags)) {
  batch.set(db.doc(`payment_feature_flags/payup_${key}`), {
    provider: "payup",
    key,
    enabled,
    reason: "Automated safe test deployment baseline",
    locked: ["PARTIAL_CANCEL", "LOCAL_PAID_FALLBACK"].includes(key),
    updated_by_uid: "github-actions",
    updated_by_email: "",
    updated_at: FieldValue.serverTimestamp(),
    updated_at_iso: now,
  }, { merge: true });
}

batch.set(db.doc("system_status/payup_test_deployment"), {
  provider: "payup",
  environment: "test",
  deployment_status: "DEPLOYED_CIRCUITS_OFF",
  critical_circuits_enabled: false,
  partial_cancel_locked: true,
  local_paid_fallback_locked: true,
  deployed_commit: process.env.GITHUB_SHA || "",
  deployed_run_id: process.env.GITHUB_RUN_ID || "",
  updated_at: FieldValue.serverTimestamp(),
  updated_at_iso: now,
}, { merge: true });

await batch.commit();
console.log(`[bootstrapPayupTest] ${Object.keys(flags).length} flags initialized with critical payment circuits OFF.`);
