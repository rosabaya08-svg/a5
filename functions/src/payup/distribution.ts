import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  asRecord,
  consumeApprovedChange,
  firestoreDocumentId,
  requireAccess,
  safeDocumentId,
  sendAccessError,
  text,
  writeAccessAudit,
} from "../access/policy";
import { assertStoredSubmerchantReady } from "./cartApiV12";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 10 };

type PolicyLine = {
  lineType: "PRODUCT_AMOUNT" | "A5S_SYSTEM_FEE" | "PARTNER_MARGIN" | "SHIPPING_FEE" | "DISCOUNT_ADJUSTMENT" | "ROUNDING_ADJUSTMENT";
  subMerchantId: string;
  organizationId: string;
  businessNumber: string;
  amountPerUnit: number;
};

const lineTypes = new Set<PolicyLine["lineType"]>([
  "PRODUCT_AMOUNT",
  "A5S_SYSTEM_FEE",
  "PARTNER_MARGIN",
  "SHIPPING_FEE",
  "DISCOUNT_ADJUSTMENT",
  "ROUNDING_ADJUSTMENT",
]);

function integer(value: unknown, name: string, min = 0, max = 1_000_000_000) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new AccessHttpError(400, "DISTRIBUTION_AMOUNT_INVALID", `${name} 값이 올바르지 않습니다.`);
  }
  return result;
}

function normalizeLines(value: unknown): PolicyLine[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AccessHttpError(400, "DISTRIBUTION_LINES_REQUIRED", "하나 이상의 분배행이 필요합니다.");
  }
  return value.map((raw, index) => {
    const line = asRecord(raw);
    const lineType = text(line.lineType ?? line.line_type, 80).toUpperCase() as PolicyLine["lineType"];
    if (!lineTypes.has(lineType)) throw new AccessHttpError(400, "DISTRIBUTION_LINE_TYPE_INVALID", `${index + 1}행 분배유형이 올바르지 않습니다.`);
    const subMerchantId = text(line.subMerchantId ?? line.sub_merchant_id, 20);
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(subMerchantId)) throw new AccessHttpError(400, "DISTRIBUTION_SUBMERCHANT_INVALID", `${index + 1}행 subMerchantId가 올바르지 않습니다.`);
    return {
      lineType,
      subMerchantId,
      organizationId: text(line.organizationId ?? line.organization_id, 160),
      businessNumber: text(line.businessNumber ?? line.business_number, 20).replace(/[^0-9]/g, ""),
      amountPerUnit: integer(line.amountPerUnit ?? line.amount_per_unit, `${index + 1}행 금액`, 1),
    };
  });
}

async function validatePolicy(productId: string, lines: PolicyLine[]) {
  const db = getAdminDb();
  const productRef = db.doc(`products/${productId}`);
  const productSnapshot = await productRef.get();
  if (!productSnapshot.exists) throw new AccessHttpError(404, "DISTRIBUTION_PRODUCT_NOT_FOUND", "상품을 찾을 수 없습니다.");
  const product = productSnapshot.data() ?? {};
  const salePrice = integer(product.closed_mall_price ?? product.price, "상품 판매가", 1);
  const total = lines.reduce((sum, line) => sum + line.amountPerUnit, 0);
  if (total !== salePrice) {
    throw new AccessHttpError(409, "DISTRIBUTION_SUM_MISMATCH", `분배합계 ${total}원이 상품 판매가 ${salePrice}원과 일치하지 않습니다.`);
  }
  const uniqueSubMerchantIds = [...new Set(lines.map((line) => line.subMerchantId))];
  const subSnapshots = await db.getAll(...uniqueSubMerchantIds.map((id) => db.doc(`payup_submerchants/${safeDocumentId(id)}`)));
  subSnapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) throw new AccessHttpError(409, "DISTRIBUTION_SUBMERCHANT_NOT_READY", `${uniqueSubMerchantIds[index]} 하위가맹점이 등록되지 않았습니다.`);
    assertStoredSubmerchantReady(snapshot.data(), uniqueSubMerchantIds[index], text(process.env.PAYUP_MERCHANT_ID, 100));
  });
  return { productRef, product, salePrice, total, uniqueSubMerchantIds };
}

export const payupAdminDistributionPolicies = onRequest(options, async (request, response) => {
  try {
    const body = asRecord(request.body);
    const action = text(body.action, 30) || "list";
    const actor = await requireAccess(request, action === "list" || action === "validate" ? "PAYUP_TRANSACTION_READ" : "PAYUP_FEATURE_FLAG_WRITE");
    const db = getAdminDb();

    if (action === "list") {
      const requestedLimit = Number(body.limit ?? 300);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 300;
      const snapshot = await db.collection("products").limit(limit).get();
      const list = snapshot.docs.map((document) => {
        const product = document.data();
        const lines = Array.isArray(product.payup_distribution_lines) ? product.payup_distribution_lines.map(asRecord) : [];
        return {
          productId: document.id,
          productName: text(product.title ?? product.name, 200),
          companyId: text(product.company_id, 160),
          salePrice: Number(product.closed_mall_price ?? product.price ?? 0),
          policyVersion: Number(product.payup_distribution_policy_version ?? 0),
          readiness: lines.length ? "CONFIGURED" : "MISSING",
          lines,
          updatedAt: text(product.payup_distribution_updated_at_iso, 50),
        };
      });
      response.status(200).json({ ok: true, listCount: list.length, list, generatedAt: new Date().toISOString() });
      return;
    }

    const productId = firestoreDocumentId(body.productId, "productId");
    const lines = normalizeLines(body.lines);
    const validation = await validatePolicy(productId, lines);
    if (action === "validate") {
      response.status(200).json({ ok: true, productId, salePrice: validation.salePrice, distributionTotal: validation.total, subMerchantCount: validation.uniqueSubMerchantIds.length, lines });
      return;
    }
    if (action !== "upsert") throw new AccessHttpError(400, "DISTRIBUTION_ACTION_INVALID", "action은 list, validate 또는 upsert여야 합니다.");

    const payload = { productId, salePrice: validation.salePrice, lines };
    await consumeApprovedChange({
      approvalRequestId: text(body.approvalRequestId, 200),
      actionType: "DISTRIBUTION_POLICY_CHANGE",
      payload,
      actor,
    });
    const before = validation.product.payup_distribution_lines ?? null;
    const nextVersion = integer(validation.product.payup_distribution_policy_version ?? 0, "기존 정책버전", 0) + 1;
    const storedLines = lines.map((line) => ({
      line_type: line.lineType,
      sub_merchant_id: line.subMerchantId,
      organization_id: line.organizationId || null,
      business_number: line.businessNumber || null,
      amount_per_unit: line.amountPerUnit,
    }));
    await validation.productRef.set({
      payup_distribution_lines: storedLines,
      payup_distribution_policy_version: nextVersion,
      payup_distribution_status: "READY",
      payup_distribution_updated_by_uid: actor.uid,
      payup_distribution_updated_by_email: actor.email,
      payup_distribution_updated_at: FieldValue.serverTimestamp(),
      payup_distribution_updated_at_iso: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    const correlationId = await writeAccessAudit({
      actor,
      action: "PAYUP.DISTRIBUTION_POLICY.CHANGED",
      targetType: "product",
      targetId: productId,
      before,
      after: { version: nextVersion, salePrice: validation.salePrice, lines: storedLines },
      reason: text(body.reason, 500),
    });
    response.status(200).json({ ok: true, productId, policyVersion: nextVersion, salePrice: validation.salePrice, distributionTotal: validation.total, correlationId });
  } catch (error) {
    sendAccessError(response, error);
  }
});
