import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { safeDocumentId, text } from "../access/policy";
import { maskIdentifier, type PayupRuntime } from "./runtimeV2";

export type PayupCartProviderStatus =
  | "READY"
  | "AUTH_BLOCKED"
  | "API_BLOCKED"
  | "UNAVAILABLE";

type ProviderHealthInput = {
  responseCode?: unknown;
  responseMsg?: unknown;
  subMerchantId?: unknown;
  matched?: boolean;
};

export function payupCartProviderStatus(responseCodeValue: unknown): PayupCartProviderStatus {
  const responseCode = text(responseCodeValue, 100);
  if (responseCode === "0000") return "READY";
  if (responseCode === "7001") return "AUTH_BLOCKED";
  if (!responseCode || responseCode === "TRANSPORT_ERROR" || responseCode.startsWith("HTTP_")) {
    return "UNAVAILABLE";
  }
  return "API_BLOCKED";
}

export function payupCartProviderPatch(input: ProviderHealthInput) {
  const responseCode = text(input.responseCode, 100) || "TRANSPORT_ERROR";
  const responseMsg = text(input.responseMsg, 500);
  const status = payupCartProviderStatus(responseCode);
  return {
    status,
    checkoutBlocked: status !== "READY",
    responseCode,
    responseMsg,
    subMerchantId: text(input.subMerchantId, 20),
    matched: input.matched === true,
  };
}

async function blockCurrentMerchantSubmerchants(
  config: PayupRuntime,
  status: Exclude<PayupCartProviderStatus, "READY">,
  responseCode: string,
  responseMsg: string,
  nowIso: string,
) {
  const db = getAdminDb();
  const snapshot = await db.collection("payup_submerchants")
    .where("merchant_id", "==", config.merchantId)
    .limit(500)
    .get();
  for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
    const batch = db.batch();
    snapshot.docs.slice(offset, offset + 400).forEach((document) => {
      batch.set(document.ref, {
        status: "BLOCKED",
        payup_sync_status: status,
        checkout_blocked: true,
        checkout_blocked_reason: `PAYUP_${status}`,
        last_response_code: responseCode,
        last_response_msg: responseMsg,
        last_synced_at: FieldValue.serverTimestamp(),
        last_synced_at_iso: nowIso,
      }, { merge: true });
    });
    await batch.commit();
  }
}

export async function recordPayupCartProviderHealth(
  config: PayupRuntime,
  input: ProviderHealthInput,
) {
  const db = getAdminDb();
  const nowIso = new Date().toISOString();
  const health = payupCartProviderPatch(input);
  await db.doc("system_status/payup_cart_api").set({
    provider: "payup",
    environment: config.environment,
    mode: config.mode,
    merchant_id_masked: maskIdentifier(config.merchantId),
    status: health.status,
    checkout_blocked: health.checkoutBlocked,
    last_response_code: health.responseCode,
    last_response_msg: health.responseMsg,
    last_probe_at: FieldValue.serverTimestamp(),
    last_probe_at_iso: nowIso,
    ...(health.status === "READY" ? {
      last_ready_at: FieldValue.serverTimestamp(),
      last_ready_at_iso: nowIso,
    } : {
      last_blocked_at: FieldValue.serverTimestamp(),
      last_blocked_at_iso: nowIso,
    }),
  }, { merge: true });

  if (health.status !== "READY") {
    await blockCurrentMerchantSubmerchants(
      config,
      health.status,
      health.responseCode,
      health.responseMsg,
      nowIso,
    );
    return health;
  }

  if (health.subMerchantId) {
    await db.doc(`payup_submerchants/${safeDocumentId(health.subMerchantId)}`).set({
      merchant_id: config.merchantId,
      sub_merchant_id: health.subMerchantId,
      status: health.matched ? "ACTIVE" : "BLOCKED",
      payup_sync_status: health.matched ? "MATCHED" : "NOT_FOUND",
      checkout_blocked: !health.matched,
      checkout_blocked_reason: health.matched ? "" : "PAYUP_SUBMERCHANT_NOT_FOUND",
      last_response_code: health.responseCode,
      last_response_msg: health.responseMsg,
      last_synced_at: FieldValue.serverTimestamp(),
      last_synced_at_iso: nowIso,
    }, { merge: true });
  }
  return health;
}

export async function recordPayupCartProviderHealthBestEffort(
  config: PayupRuntime,
  input: ProviderHealthInput,
) {
  try {
    return await recordPayupCartProviderHealth(config, input);
  } catch {
    return payupCartProviderPatch(input);
  }
}
