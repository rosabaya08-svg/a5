import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  asRecord,
  consumeApprovedChange,
  requireAccess,
  safeDocumentId,
  sendAccessError,
  text,
  writeAccessAudit,
} from "../access/policy";
import { assertRuntimeReady, featureFlagEnabled, getPayupRuntime } from "./runtimeV2";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 10 };

const allowedFeatureFlags = new Set([
  "PAYUP_MASTER",
  "NEW_ORDER",
  "PAYMENT_WINDOW",
  "FINAL_APPROVAL",
  "CART_DISTRIBUTION",
  "SUBMERCHANT_CREATE",
  "SUBMERCHANT_UPDATE",
  "SUBMERCHANT_SYNC",
  "TRANSACTION_RECON",
  "SETTLEMENT_RECON",
  "FULL_CANCEL",
  "PARTIAL_CANCEL",
  "PAYOUT_HOLD",
  "MOCK_MODE",
  "LOCAL_PAID_FALLBACK",
]);

const permanentlyDisabledFlags = new Set(["PARTIAL_CANCEL", "LOCAL_PAID_FALLBACK"]);
const criticalEnableFlags = new Set(["PAYUP_MASTER", "FINAL_APPROVAL", "FULL_CANCEL"]);
const runtimeRequiredFlags = new Set([
  "PAYUP_MASTER",
  "NEW_ORDER",
  "PAYMENT_WINDOW",
  "FINAL_APPROVAL",
  "CART_DISTRIBUTION",
  "SUBMERCHANT_CREATE",
  "SUBMERCHANT_UPDATE",
  "FULL_CANCEL",
]);
const dependencies: Record<string, string[]> = {
  NEW_ORDER: ["PAYUP_MASTER"],
  PAYMENT_WINDOW: ["PAYUP_MASTER", "NEW_ORDER"],
  CART_DISTRIBUTION: ["PAYUP_MASTER"],
  FINAL_APPROVAL: ["PAYUP_MASTER", "NEW_ORDER", "PAYMENT_WINDOW", "CART_DISTRIBUTION"],
  FULL_CANCEL: ["PAYUP_MASTER"],
};

async function assertDependencies(key: string) {
  const required = dependencies[key] ?? [];
  const states = await Promise.all(required.map(async (dependency) => ({ dependency, enabled: await featureFlagEnabled(dependency) })));
  const disabled = states.filter((state) => !state.enabled).map((state) => state.dependency);
  if (disabled.length) throw new AccessHttpError(409, "FEATURE_FLAG_DEPENDENCY_OFF", `${key} 회로를 켜기 전에 ${disabled.join(", ")} 회로를 먼저 켜야 합니다.`);
}

export const payupAdminFeatureFlagsV2 = onRequest(options, async (request, response) => {
  try {
    const body = asRecord(request.body);
    const action = text(body.action, 30) || (text(body.key, 100) ? "update" : "list");
    const db = getAdminDb();

    if (action === "list") {
      const actor = await requireAccess(request, "PAYUP_VIEW");
      const [flagSnapshot, approvalSnapshot] = await Promise.all([
        db.collection("payment_feature_flags").where("provider", "==", "payup").limit(100).get(),
        db.collection("payup_change_requests").where("action_type", "==", "FEATURE_FLAG_ENABLE").limit(200).get(),
      ]);
      const list = flagSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      const approvals = approvalSnapshot.docs
        .map((document) => ({ id: document.id, ...document.data() }))
        .sort((left, right) => text((right as Record<string, unknown>).requested_at_iso, 50).localeCompare(text((left as Record<string, unknown>).requested_at_iso, 50)));
      response.status(200).json({ ok: true, list, approvals, listCount: list.length, actorRoles: actor.roles, generatedAt: new Date().toISOString() });
      return;
    }

    if (action !== "update") throw new AccessHttpError(400, "FEATURE_FLAG_ACTION_INVALID", "action은 list 또는 update여야 합니다.");
    const actor = await requireAccess(request, "PAYUP_FEATURE_FLAG_WRITE");
    const key = text(body.key, 100).toUpperCase();
    const enabled = body.enabled === true;
    const reason = text(body.reason, 500) || "A5S 기업관리자 PayUp 배전판 변경";
    if (!allowedFeatureFlags.has(key)) throw new AccessHttpError(400, "FEATURE_FLAG_UNKNOWN", "정의되지 않은 PayUp 회로입니다.");
    if (enabled && permanentlyDisabledFlags.has(key)) throw new AccessHttpError(409, "FEATURE_FLAG_PERMANENTLY_LOCKED", `${key} 회로는 정책상 영구 OFF입니다.`);

    if (enabled) {
      await assertDependencies(key);
      if (criticalEnableFlags.has(key)) {
        await consumeApprovedChange({
          approvalRequestId: text(body.approvalRequestId, 200),
          actionType: "FEATURE_FLAG_ENABLE",
          payload: { key, enabled: true },
          actor,
        });
      }
      if (runtimeRequiredFlags.has(key)) {
        assertRuntimeReady(getPayupRuntime(), {
          requireApiCertKey: ["NEW_ORDER", "PAYMENT_WINDOW", "FINAL_APPROVAL", "FULL_CANCEL"].includes(key),
          requireAuthReturn: ["NEW_ORDER", "PAYMENT_WINDOW", "FINAL_APPROVAL"].includes(key),
          requirePiiKey: ["NEW_ORDER", "PAYMENT_WINDOW", "FINAL_APPROVAL"].includes(key),
        });
      }
    }

    const ref = db.doc(`payment_feature_flags/payup_${safeDocumentId(key)}`);
    const beforeSnapshot = await ref.get();
    const before = beforeSnapshot.data() ?? null;
    const after = {
      provider: "payup",
      key,
      enabled,
      locked: permanentlyDisabledFlags.has(key),
      reason,
      updated_by_uid: actor.uid,
      updated_by_email: actor.email,
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    };
    await ref.set(after, { merge: true });
    const correlationId = await writeAccessAudit({
      actor,
      action: "PAYUP.FEATURE_FLAG.CHANGED",
      targetType: "payment_feature_flag",
      targetId: key,
      before,
      after: { ...after, updated_at: "serverTimestamp" },
      reason,
    });
    response.status(200).json({ ok: true, flag: key, enabled, correlationId });
  } catch (error) {
    sendAccessError(response, error);
  }
});
