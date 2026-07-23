import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { readSellerContactSnapshot, sellerContactDocument } from "./sellerContact";

const claimTypes = new Set(["cancel", "return", "exchange", "defect", "wrong_delivery"]);
const terminalStatuses = new Set(["completed", "rejected", "cancelled"]);

export async function guestClaimSubmitHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  const body = readObjectBody<Record<string, unknown>>(request);
  const orderNo = text(body.orderNo);
  const itemId = text(body.itemId);
  const lookupToken = text(body.lookupToken ?? body.token);
  const phoneLast4 = digits(body.phoneLast4 ?? body.phone).slice(-4);
  const claimType = text(body.claimType) || "cancel";
  const reason = text(body.reason);
  const requestedQuantity = Math.trunc(Number(body.quantity ?? 1));

  if (!orderNo || !itemId || !claimTypes.has(claimType) || !reason || requestedQuantity <= 0) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "GUEST_CLAIM_INPUT_INVALID", message: "orderNo, itemId, claimType, quantity, and reason are required.", httpStatus: 400 },
    });
    return;
  }

  const db = getAdminDb();
  const [orderSnapshot, itemSnapshot] = await Promise.all([
    db.collection("orders").doc(orderNo).get(),
    db.collection("order_items").doc(itemId).get(),
  ]);
  if (!orderSnapshot.exists || orderSnapshot.get("guest_lookup_enabled") !== true) {
    sendJson(response, 404, { ok: false, error: { code: "ORDER_NOT_FOUND", message: "Order was not found.", httpStatus: 404 } });
    return;
  }
  if (!itemSnapshot.exists || text(itemSnapshot.get("order_no") ?? itemSnapshot.get("orderNo")) !== orderNo) {
    sendJson(response, 404, { ok: false, error: { code: "ORDER_ITEM_NOT_FOUND", message: "Order item was not found.", httpStatus: 404 } });
    return;
  }

  const expectedTokenHash = text(orderSnapshot.get("guest_lookup_token_hash"));
  const expectedPhoneLast4 = text(orderSnapshot.get("customer_phone_last4"));
  const tokenOk = Boolean(lookupToken && expectedTokenHash && safeEqual(hashLookupToken(lookupToken), expectedTokenHash));
  const phoneOk = Boolean(phoneLast4.length === 4 && expectedPhoneLast4 && phoneLast4 === expectedPhoneLast4);
  if (!tokenOk && !phoneOk) {
    sendJson(response, 403, { ok: false, error: { code: "GUEST_ORDER_LOOKUP_DENIED", message: "Order verification failed.", httpStatus: 403 } });
    return;
  }

  const itemData = itemSnapshot.data() ?? {};
  const orderedQuantity = Math.max(0, Math.trunc(Number(itemData.quantity ?? 0)));
  if (!orderedQuantity || requestedQuantity > orderedQuantity) {
    sendJson(response, 409, { ok: false, error: { code: "CLAIM_QUANTITY_INVALID", message: "Claim quantity exceeds ordered quantity.", httpStatus: 409 } });
    return;
  }

  const activeClaims = await db.collection("claims").where("order_item_id", "==", itemId).get();
  const activeQuantity = activeClaims.docs
    .filter((doc) => !terminalStatuses.has(text(doc.get("status"))))
    .reduce((sum, doc) => sum + Math.max(0, Math.trunc(Number(doc.get("requested_quantity") ?? 0))), 0);
  if (activeQuantity + requestedQuantity > orderedQuantity) {
    sendJson(response, 409, { ok: false, error: { code: "CLAIM_QUANTITY_EXCEEDED", message: "An active claim already covers that quantity.", httpStatus: 409 } });
    return;
  }

  const companyId = text(itemData.company_id ?? itemData.companyId ?? itemData.seller_company_id);
  const sellerContact = await readSellerContactSnapshot(db, companyId);
  const unitPrice = Math.max(0, Math.round(Number(itemData.unit_price ?? itemData.unitPrice ?? 0)));
  const claimRef = db.collection("claims").doc();
  const now = new Date().toISOString();
  const claimDocument = {
    claim_id: claimRef.id,
    order_no: orderNo,
    order_item_id: itemId,
    company_id: companyId,
    product_id: text(itemData.product_id ?? itemData.productId),
    option_id: text(itemData.option_id ?? itemData.optionId) || null,
    product_name: text(itemData.product_name ?? itemData.productName),
    option_name: text(itemData.option_name ?? itemData.optionName),
    claim_type: claimType,
    status: "requested",
    reason,
    requested_quantity: requestedQuantity,
    ordered_quantity: orderedQuantity,
    unit_price: unitPrice,
    requested_amount: unitPrice * requestedQuantity,
    seller_contact_snapshot: sellerContactDocument(sellerContact),
    requested_by: "CUSTOMER_GUEST",
    guest_verification: tokenOk ? "lookup_token" : "phone_last4",
    created_at: now,
    updated_at: now,
  };

  await db.runTransaction(async (transaction) => {
    transaction.set(claimRef, claimDocument);
    transaction.set(db.collection("claim_events").doc(), {
      claim_id: claimRef.id,
      company_id: companyId,
      actor_role: "CUSTOMER_GUEST",
      before_status: null,
      after_status: "requested",
      memo: reason,
      created_at: now,
    });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "guest_claim_created",
      target: claimRef.id,
      order_no: orderNo,
      order_item_id: itemId,
      company_id: companyId,
      claim_type: claimType,
      created_at: now,
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    claimId: claimRef.id,
    status: "requested",
    requestedAmount: unitPrice * requestedQuantity,
    message: "Claim request was recorded.",
  });
}

function hashLookupToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}
