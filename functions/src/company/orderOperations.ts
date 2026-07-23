import { FieldValue, type DocumentData, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { companyCarriers } from "./carrierCatalog";
import { readSellerContactSnapshot, sellerContactDocument } from "./sellerContact";
import { updateCompanyShipment, updateCompanyShipmentsBulk } from "./shipmentOperations";

type CompanyActor = { uid: string; companyId: string; role: string };
type ClaimType = "cancel" | "return" | "exchange" | "defect" | "wrong_delivery";

const claimTypes = new Set<ClaimType>(["cancel", "return", "exchange", "defect", "wrong_delivery"]);
const terminalClaimStatuses = new Set(["completed", "rejected", "cancelled"]);
const allowedClaimTransitions: Record<string, string[]> = {
  requested: ["accepted", "rejected"],
  accepted: ["return_in_transit", "refund_processing", "replacement_shipping", "completed"],
  return_in_transit: ["received"],
  received: ["refund_processing", "replacement_shipping", "completed"],
  replacement_shipping: ["completed"],
  refund_processing: ["refund_completed"],
  refund_completed: ["completed"],
};

export async function companyOrderOperationsHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!['GET', 'POST'].includes(String(request.method ?? ''))) {
    sendJson(response, 405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST.", httpStatus: 405 } });
    return;
  }

  const actor = await requireCompanyActor(request);
  if (!actor.ok) {
    sendJson(response, actor.httpStatus, { ok: false, error: { code: actor.code, message: actor.message, httpStatus: actor.httpStatus } });
    return;
  }

  const body = readObjectBody<Record<string, unknown>>(request);
  const action = text(request.query?.action ?? body.action) || (request.method === 'GET' ? 'list' : '');

  try {
    if (action === "list") {
      const result = await readCompanyOperations(getAdminDb(), actor.actor.companyId);
      sendJson(response, 200, { ok: true, ...result, source: "company_order_operations" });
      return;
    }
    if (action === "delivery_update") {
      const result = await updateCompanyShipment(getAdminDb(), actor.actor, body);
      sendJson(response, 200, { ok: true, ...result });
      return;
    }
    if (action === "delivery_bulk_update") {
      const result = await updateCompanyShipmentsBulk(getAdminDb(), actor.actor, body);
      sendJson(response, 200, { ok: true, ...result });
      return;
    }
    if (action === "claim_create") {
      const result = await createCompanyClaim(getAdminDb(), actor.actor, body);
      sendJson(response, 200, { ok: true, ...result });
      return;
    }
    if (action === "claim_transition") {
      const result = await transitionCompanyClaim(getAdminDb(), actor.actor, body);
      sendJson(response, 200, { ok: true, ...result });
      return;
    }

    sendJson(response, 400, { ok: false, error: { code: "ACTION_INVALID", message: "Unsupported company order action.", httpStatus: 400 } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Company order operation failed.";
    const [code, detail] = message.split(":", 2);
    sendJson(response, operationErrorStatus(code), {
      ok: false,
      error: { code, message: detail || message, httpStatus: operationErrorStatus(code) },
    });
  }
}

async function readCompanyOperations(db: Firestore, companyId: string) {
  const itemLimit = 1000;
  const snapshots = await Promise.all([
    db.collection("order_items")
      .where("company_id", "==", companyId)
      .orderBy("created_at", "desc")
      .limit(itemLimit + 1)
      .get(),
    db.collection("order_items").where("seller_company_id", "==", companyId).limit(itemLimit + 1).get(),
  ]);
  const allItemDocs = [...new Map(snapshots.flatMap((snapshot) => snapshot.docs).map((doc) => [doc.id, doc])).values()]
    .sort((left, right) => iso(right.data().created_at).localeCompare(iso(left.data().created_at)));
  const truncated = allItemDocs.length > itemLimit;
  const itemDocs = allItemDocs.slice(0, itemLimit);
  const orderNos = [...new Set(itemDocs.map((doc) => text(doc.get("order_no") ?? doc.get("orderNo"))).filter(Boolean))];
  const orderSnapshots = orderNos.length ? await db.getAll(...orderNos.map((orderNo) => db.collection("orders").doc(orderNo))) : [];
  const claimSnapshot = await db.collection("claims").where("company_id", "==", companyId).limit(300).get();

  return {
    companyId,
    resultMeta: { itemLimit, truncated },
    carriers: companyCarriers,
    orders: orderSnapshots.filter((snapshot) => snapshot.exists).map(mapOrder),
    items: itemDocs.map((doc) => mapOrderItem(doc.id, doc.data())),
    claims: claimSnapshot.docs
      .map<Record<string, unknown>>((doc) => ({ id: doc.id, ...(serialize(doc.data()) as Record<string, unknown>) }))
      .sort((left, right) => text(right.updated_at ?? right.created_at).localeCompare(text(left.updated_at ?? left.created_at))),
  };
}

async function createCompanyClaim(db: Firestore, actor: CompanyActor, body: Record<string, unknown>) {
  const itemId = text(body.itemId);
  const claimType = text(body.claimType) as ClaimType;
  const reason = text(body.reason);
  const requestedQuantity = positiveInteger(body.quantity, 1);
  if (!itemId || !claimTypes.has(claimType) || !reason || requestedQuantity <= 0) {
    throw new Error("CLAIM_INPUT_INVALID:itemId, claimType, positive quantity, and reason are required.");
  }

  const itemSnapshot = await db.collection("order_items").doc(itemId).get();
  if (!itemSnapshot.exists) throw new Error("ORDER_ITEM_NOT_FOUND:Order item was not found.");
  const itemData = itemSnapshot.data() ?? {};
  const itemCompanyId = text(itemData.company_id ?? itemData.companyId ?? itemData.seller_company_id);
  if (itemCompanyId !== actor.companyId) throw new Error("COMPANY_SCOPE_FORBIDDEN:This company cannot create a claim for that item.");
  const orderedQuantity = positiveInteger(itemData.quantity, 0);
  if (requestedQuantity > orderedQuantity) throw new Error("CLAIM_QUANTITY_INVALID:Claim quantity exceeds ordered quantity.");

  await assertClaimQuantityAvailable(db, itemId, requestedQuantity, orderedQuantity);
  const orderNo = text(itemData.order_no ?? itemData.orderNo ?? itemData.order_id);
  const contact = await readSellerContactSnapshot(db, actor.companyId);
  const claimRef = db.collection("claims").doc();
  const now = new Date().toISOString();
  const unitPrice = money(itemData.unit_price ?? itemData.unitPrice);
  const requestedAmount = unitPrice * requestedQuantity;

  await db.runTransaction(async (transaction) => {
    transaction.set(claimRef, {
      claim_id: claimRef.id,
      order_no: orderNo,
      order_item_id: itemId,
      company_id: actor.companyId,
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
      requested_amount: requestedAmount,
      seller_contact_snapshot: sellerContactDocument(contact),
      requested_by: "COMPANY_ADMIN",
      requested_by_uid: actor.uid,
      created_at: now,
      updated_at: now,
    });
    writeClaimEvent(transaction, db, claimRef.id, actor, "", "requested", reason, now);
    writeAudit(transaction, db, actor, "company_claim_created", claimRef.id, { order_no: orderNo, order_item_id: itemId, claim_type: claimType }, now);
  });

  return { claimId: claimRef.id, status: "requested", requestedAmount, message: "Claim was created." };
}

async function transitionCompanyClaim(db: Firestore, actor: CompanyActor, body: Record<string, unknown>) {
  const claimId = text(body.claimId);
  const nextStatus = text(body.status);
  const memo = text(body.memo);
  if (!claimId || !nextStatus) throw new Error("CLAIM_TRANSITION_INPUT_INVALID:claimId and status are required.");

  const claimRef = db.collection("claims").doc(claimId);
  const snapshot = await claimRef.get();
  if (!snapshot.exists) throw new Error("CLAIM_NOT_FOUND:Claim was not found.");
  const data = snapshot.data() ?? {};
  if (text(data.company_id) !== actor.companyId) throw new Error("COMPANY_SCOPE_FORBIDDEN:This company cannot update that claim.");
  const currentStatus = text(data.status);
  if (!(allowedClaimTransitions[currentStatus] ?? []).includes(nextStatus)) {
    throw new Error("CLAIM_TRANSITION_INVALID:Claim status transition is not allowed.");
  }
  if (nextStatus === "rejected" && !memo) throw new Error("CLAIM_MEMO_REQUIRED:Rejection reason is required.");
  if (nextStatus === "return_in_transit" && !text(body.returnInvoiceNumber)) {
    throw new Error("RETURN_INVOICE_REQUIRED:Return invoice number is required.");
  }
  if (nextStatus === "replacement_shipping" && !text(body.replacementInvoiceNumber)) {
    throw new Error("REPLACEMENT_INVOICE_REQUIRED:Replacement invoice number is required.");
  }
  if (nextStatus === "refund_completed" && !text(body.providerReference)) {
    throw new Error("PROVIDER_REFERENCE_REQUIRED:PayUp cancellation or refund reference is required.");
  }

  const now = new Date().toISOString();
  await db.runTransaction(async (transaction) => {
    transaction.set(claimRef, {
      status: nextStatus,
      company_memo: memo || null,
      return_carrier_code: text(body.returnCarrierCode) || null,
      return_invoice_no: text(body.returnInvoiceNumber) || null,
      replacement_carrier_code: text(body.replacementCarrierCode) || null,
      replacement_invoice_no: text(body.replacementInvoiceNumber) || null,
      provider_reference: text(body.providerReference) || null,
      provider_handled_externally: nextStatus === "refund_completed" ? true : data.provider_handled_externally ?? false,
      updated_by_uid: actor.uid,
      updated_at: now,
    }, { merge: true });
    writeClaimEvent(transaction, db, claimId, actor, currentStatus, nextStatus, memo, now);
    writeAudit(transaction, db, actor, "company_claim_transition", claimId, { before_status: currentStatus, after_status: nextStatus }, now);
  });

  return { claimId, status: nextStatus, message: "Claim status was updated." };
}

async function assertClaimQuantityAvailable(db: Firestore, itemId: string, requested: number, ordered: number) {
  const snapshot = await db.collection("claims").where("order_item_id", "==", itemId).get();
  const claimed = snapshot.docs
    .filter((doc) => !terminalClaimStatuses.has(text(doc.get("status"))))
    .reduce((sum, doc) => sum + positiveInteger(doc.get("requested_quantity"), 0), 0);
  if (claimed + requested > ordered) throw new Error("CLAIM_QUANTITY_EXCEEDED:Active claim quantity exceeds ordered quantity.");
}

async function requireCompanyActor(request: HttpRequestLike): Promise<
  | { ok: true; actor: CompanyActor }
  | { ok: false; httpStatus: number; code: string; message: string }
> {
  const token = authorizationToken(request);
  if (!token) return { ok: false, httpStatus: 401, code: "AUTH_REQUIRED", message: "Firebase company authentication is required." };
  const claims = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!claims) return { ok: false, httpStatus: 403, code: "AUTH_INVALID", message: "Firebase token is invalid." };
  const role = text(claims.role);
  const companyId = text(claims.company_id ?? claims.companyId);
  if (role !== "COMPANY_ADMIN" || !companyId) {
    return { ok: false, httpStatus: 403, code: "COMPANY_ADMIN_REQUIRED", message: "Company administrator permission is required." };
  }
  return { ok: true, actor: { uid: text(claims.uid), role, companyId } };
}

function writeClaimEvent(transaction: FirebaseFirestore.Transaction, db: Firestore, claimId: string, actor: CompanyActor, before: string, after: string, memo: string, now: string) {
  transaction.set(db.collection("claim_events").doc(), {
    claim_id: claimId,
    company_id: actor.companyId,
    actor_uid: actor.uid,
    actor_role: actor.role,
    before_status: before || null,
    after_status: after,
    memo: memo || null,
    created_at: now,
  });
}

function writeAudit(transaction: FirebaseFirestore.Transaction, db: Firestore, actor: CompanyActor, action: string, target: string, details: Record<string, unknown>, now: string) {
  transaction.set(db.collection("audit_logs").doc(), {
    action,
    target,
    company_id: actor.companyId,
    actor_uid: actor.uid,
    actor_role: actor.role,
    details,
    created_at: now,
    updated_at: FieldValue.serverTimestamp(),
  });
}

function mapOrder(snapshot: DocumentSnapshot<DocumentData>) {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    orderNo: text(data.order_no ?? data.orderNo ?? snapshot.id),
    status: text(data.status) || "paid",
    customerName: text(data.customer_name ?? data.customerName),
    customerPhoneMasked: text(data.customer_phone_masked ?? data.customerPhoneMasked),
    receiverName: text(data.receiver_name ?? data.customer_name ?? data.customerName),
    receiverPhone: text(data.receiver_phone ?? data.customer_phone ?? data.customerPhone),
    deliveryMethod: text(data.delivery_method ?? data.deliveryMethod) || "pickup",
    receiverPostalCode: text(data.receiver_postal_code ?? data.receiverPostalCode),
    receiverAddress: text(data.receiver_address),
    receiverAddressDetail: text(data.receiver_address_detail),
    deliveryMemo: text(data.delivery_memo ?? data.deliveryMemo),
    totalAmount: money(data.total_amount ?? data.totalAmount),
    paidAt: iso(data.paid_at ?? data.paidAt),
    providerTransactionId: text(data.provider_transaction_id),
    pgProvider: text(data.pg_provider),
    sellerContacts: serialize(data.seller_contacts_snapshot),
  };
}

function mapOrderItem(id: string, data: DocumentData) {
  return {
    id,
    orderNo: text(data.order_no ?? data.orderNo ?? data.order_id),
    companyId: text(data.company_id ?? data.companyId ?? data.seller_company_id),
    productId: text(data.product_id ?? data.productId),
    optionId: text(data.option_id ?? data.optionId),
    productName: text(data.product_name ?? data.productName),
    optionName: text(data.option_name ?? data.optionName),
    quantity: positiveInteger(data.quantity, 1),
    unitPrice: money(data.unit_price ?? data.unitPrice),
    deliveryStatus: text(data.delivery_status ?? data.deliveryStatus) || "invoice_pending",
    carrierCode: text(data.carrier_code ?? data.carrierCode),
    carrierName: text(data.carrier_name ?? data.carrierName),
    invoiceNumber: text(data.invoice_no ?? data.invoiceNo),
    shipmentId: text(data.shipment_id ?? data.shipmentId),
    sellerCompanyName: text(data.seller_company_name ?? data.sellerCompanyName),
    sellerBusinessNo: text(data.seller_business_no ?? data.sellerBusinessNo),
    sellerRepresentativeName: text(data.seller_representative_name),
    sellerCustomerServicePhone: text(data.seller_customer_service_phone),
    sellerPublicEmail: text(data.seller_public_email),
    sellerReturnAddress: text(data.seller_return_address),
    sellerContactVerified: data.seller_contact_verified === true,
    createdAt: iso(data.created_at ?? data.createdAt),
  };
}

function serialize(value: unknown): unknown {
  if (value === undefined || value === null) return value ?? null;
  if (Array.isArray(value)) return value.map(serialize);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const timestamp = value as { toDate?: () => Date; seconds?: number };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, serialize(child)]));
  }
  return value;
}

function authorizationToken(request: HttpRequestLike) {
  const header = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function positiveInteger(value: unknown, fallback: number) {
  const number = Math.trunc(Number(value ?? fallback));
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function money(value: unknown) {
  const number = Math.round(Number(value ?? 0));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function iso(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const timestamp = value as { toDate?: () => Date; seconds?: number };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  }
  return "";
}

function operationErrorStatus(code: string) {
  if (code.endsWith("NOT_FOUND")) return 404;
  if (code.includes("FORBIDDEN")) return 403;
  if (code.startsWith("AUTH_")) return 401;
  if (code.includes("TRANSITION") || code.includes("QUANTITY") || code.includes("INVOICE")) return 409;
  return 400;
}
