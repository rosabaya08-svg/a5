import { FieldValue, type DocumentData, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { readSellerContactSnapshot, sellerContactDocument } from "./sellerContact";

type CompanyActor = { uid: string; companyId: string; role: string };
type ClaimType = "cancel" | "return" | "exchange" | "defect" | "wrong_delivery";

const claimTypes = new Set<ClaimType>(["cancel", "return", "exchange", "defect", "wrong_delivery"]);
const terminalClaimStatuses = new Set(["completed", "rejected", "cancelled"]);
const allowedDeliveryTransitions: Record<string, string[]> = {
  invoice_pending: ["invoice_entered"],
  invoice_entered: ["in_transit"],
  in_transit: ["delivered"],
  pickup_ready: ["picked_up"],
};
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
      const result = await updateDelivery(getAdminDb(), actor.actor, body);
      sendJson(response, 200, { ok: true, ...result });
      return;
    }
    if (action === "delivery_bulk_update") {
      const result = await updateDeliveriesBulk(getAdminDb(), actor.actor, body);
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
  const snapshots = await Promise.all([
    db.collection("order_items").where("company_id", "==", companyId).limit(500).get(),
    db.collection("order_items").where("seller_company_id", "==", companyId).limit(500).get(),
  ]);
  const itemDocs = [...new Map(snapshots.flatMap((snapshot) => snapshot.docs).map((doc) => [doc.id, doc])).values()]
    .sort((left, right) => iso(right.data().created_at).localeCompare(iso(left.data().created_at)));
  const orderNos = [...new Set(itemDocs.map((doc) => text(doc.get("order_no") ?? doc.get("orderNo"))).filter(Boolean))];
  const orderSnapshots = orderNos.length ? await db.getAll(...orderNos.map((orderNo) => db.collection("orders").doc(orderNo))) : [];
  const claimSnapshot = await db.collection("claims").where("company_id", "==", companyId).limit(300).get();

  return {
    companyId,
    orders: orderSnapshots.filter((snapshot) => snapshot.exists).map(mapOrder),
    items: itemDocs.map((doc) => mapOrderItem(doc.id, doc.data())),
    claims: claimSnapshot.docs
      .map<Record<string, unknown>>((doc) => ({ id: doc.id, ...(serialize(doc.data()) as Record<string, unknown>) }))
      .sort((left, right) => text(right.updated_at ?? right.created_at).localeCompare(text(left.updated_at ?? left.created_at))),
  };
}

async function updateDelivery(db: Firestore, actor: CompanyActor, body: Record<string, unknown>) {
  const itemId = text(body.itemId);
  const requestedStatus = text(body.deliveryStatus);
  const carrierCode = text(body.carrierCode);
  const invoiceNumber = text(body.invoiceNumber);
  if (!itemId || !requestedStatus) throw new Error("DELIVERY_INPUT_INVALID:itemId and deliveryStatus are required.");

  const itemRef = db.collection("order_items").doc(itemId);
  const itemSnapshot = await itemRef.get();
  if (!itemSnapshot.exists) throw new Error("ORDER_ITEM_NOT_FOUND:Order item was not found.");
  const itemData = itemSnapshot.data() ?? {};
  const itemCompanyId = text(itemData.company_id ?? itemData.companyId ?? itemData.seller_company_id);
  if (itemCompanyId !== actor.companyId) throw new Error("COMPANY_SCOPE_FORBIDDEN:This company cannot update that order item.");

  const currentStatus = text(itemData.delivery_status ?? itemData.deliveryStatus) || "invoice_pending";
  if (!(allowedDeliveryTransitions[currentStatus] ?? []).includes(requestedStatus)) {
    throw new Error("DELIVERY_TRANSITION_INVALID:Delivery status transition is not allowed.");
  }
  if (["invoice_entered", "in_transit", "delivered"].includes(requestedStatus) && !invoiceNumber) {
    throw new Error("INVOICE_REQUIRED:Invoice number is required for delivery orders.");
  }

  const orderNo = text(itemData.order_no ?? itemData.orderNo ?? itemData.order_id);
  if (!orderNo) throw new Error("ORDER_SCOPE_MISSING:Order number is missing from the order item.");
  const now = new Date().toISOString();
  await db.runTransaction(async (transaction) => {
    transaction.set(itemRef, {
      delivery_status: requestedStatus,
      carrier_code: carrierCode || null,
      invoice_no: invoiceNumber || null,
      shipment_updated_by: actor.uid,
      shipment_updated_at: now,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(db.collection("order_fulfillments").doc(`${orderNo}-${actor.companyId}`), {
      order_no: orderNo,
      company_id: actor.companyId,
      delivery_status: requestedStatus,
      carrier_code: carrierCode || null,
      invoice_no: invoiceNumber || null,
      updated_by: actor.uid,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(db.collection("audit_logs").doc(), {
      action: "company_order_delivery_update",
      target: itemId,
      order_no: orderNo,
      company_id: actor.companyId,
      actor_uid: actor.uid,
      before_status: currentStatus,
      after_status: requestedStatus,
      created_at: now,
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  await updateOrderAggregateStatus(db, orderNo);
  return { itemId, orderNo, deliveryStatus: requestedStatus, message: "Delivery status was updated." };
}

async function updateDeliveriesBulk(db: Firestore, actor: CompanyActor, body: Record<string, unknown>) {
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length || rows.length > 100) {
    throw new Error("BULK_DELIVERY_INPUT_INVALID:One to 100 invoice rows are required.");
  }

  const normalizedRows = rows.map((value, index) => {
    const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
      rowNumber: index + 2,
      itemId: text(row.itemId ?? row.orderItemId ?? row["주문상품ID"]),
      carrierCode: text(row.carrierCode ?? row["택배사코드"]),
      invoiceNumber: text(row.invoiceNumber ?? row.invoiceNo ?? row["송장번호"]),
      requestedStatus: text(row.deliveryStatus ?? row["배송상태"]) || "invoice_entered",
    };
  });
  const duplicateIds = normalizedRows
    .map((row) => row.itemId)
    .filter((itemId, index, values) => itemId && values.indexOf(itemId) !== index);
  if (duplicateIds.length) throw new Error("BULK_DELIVERY_DUPLICATE:Duplicate order item IDs are not allowed.");
  if (normalizedRows.some((row) => !row.itemId || !row.invoiceNumber)) {
    throw new Error("BULK_DELIVERY_ROW_INVALID:Every row requires order item ID and invoice number.");
  }

  const refs = normalizedRows.map((row) => db.collection("order_items").doc(row.itemId));
  const snapshots = await db.getAll(...refs);
  const prepared = normalizedRows.map((row, index) => {
    const snapshot = snapshots[index];
    if (!snapshot?.exists) throw new Error(`ORDER_ITEM_NOT_FOUND:Row ${row.rowNumber} order item was not found.`);
    const data = snapshot.data() ?? {};
    const itemCompanyId = text(data.company_id ?? data.companyId ?? data.seller_company_id);
    if (itemCompanyId !== actor.companyId) {
      throw new Error(`COMPANY_SCOPE_FORBIDDEN:Row ${row.rowNumber} does not belong to this company.`);
    }
    const currentStatus = text(data.delivery_status ?? data.deliveryStatus) || "invoice_pending";
    if (!(allowedDeliveryTransitions[currentStatus] ?? []).includes(row.requestedStatus)) {
      throw new Error(`DELIVERY_TRANSITION_INVALID:Row ${row.rowNumber} status transition is not allowed.`);
    }
    const orderNo = text(data.order_no ?? data.orderNo ?? data.order_id);
    if (!orderNo) throw new Error(`ORDER_SCOPE_MISSING:Row ${row.rowNumber} order number is missing.`);
    return { ...row, ref: refs[index], orderNo, currentStatus };
  });

  const now = new Date().toISOString();
  const batch = db.batch();
  for (const row of prepared) {
    batch.set(row.ref, {
      delivery_status: row.requestedStatus,
      carrier_code: row.carrierCode || null,
      invoice_no: row.invoiceNumber,
      shipment_updated_by: actor.uid,
      shipment_updated_at: now,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(db.collection("order_fulfillments").doc(`${row.orderNo}-${actor.companyId}`), {
      order_no: row.orderNo,
      company_id: actor.companyId,
      delivery_status: row.requestedStatus,
      carrier_code: row.carrierCode || null,
      invoice_no: row.invoiceNumber,
      updated_by: actor.uid,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(db.collection("audit_logs").doc(), {
      action: "company_order_delivery_bulk_update",
      target: row.itemId,
      order_no: row.orderNo,
      company_id: actor.companyId,
      actor_uid: actor.uid,
      before_status: row.currentStatus,
      after_status: row.requestedStatus,
      created_at: now,
      updated_at: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  for (const orderNo of [...new Set(prepared.map((row) => row.orderNo))]) {
    await updateOrderAggregateStatus(db, orderNo);
  }
  return { updatedCount: prepared.length, message: "Bulk delivery rows were updated." };
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

async function updateOrderAggregateStatus(db: Firestore, orderNo: string) {
  const snapshot = await db.collection("order_items").where("order_no", "==", orderNo).get();
  const statuses = snapshot.docs.map((doc) => text(doc.get("delivery_status")) || "invoice_pending");
  if (!statuses.length) return;
  const terminal = new Set(["delivered", "picked_up"]);
  const allTerminal = statuses.every((status) => terminal.has(status));
  const anyMoving = statuses.some((status) => ["invoice_entered", "in_transit", "delivered", "picked_up"].includes(status));
  const status = allTerminal ? "fulfilled" : anyMoving ? "partially_shipping" : "preparing";
  await db.collection("orders").doc(orderNo).set({ status, updated_at: FieldValue.serverTimestamp() }, { merge: true });
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
    deliveryMethod: text(data.delivery_method ?? data.deliveryMethod) || "pickup",
    receiverAddress: text(data.receiver_address),
    receiverAddressDetail: text(data.receiver_address_detail),
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
    invoiceNumber: text(data.invoice_no ?? data.invoiceNo),
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
