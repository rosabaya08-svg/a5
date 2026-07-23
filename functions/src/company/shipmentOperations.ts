import { createHash } from "node:crypto";
import { FieldValue, type DocumentData, type Firestore } from "firebase-admin/firestore";
import { requireShippingCarrier } from "./carrierCatalog";

export type CompanyShipmentActor = {
  uid: string;
  companyId: string;
  role: string;
};

const allowedDeliveryTransitions: Record<string, string[]> = {
  invoice_pending: ["invoice_entered"],
  invoice_entered: ["in_transit"],
  in_transit: ["delivered"],
  pickup_ready: ["picked_up"],
};

type PreparedShipment = {
  carrier: { code: string; name: string };
  invoiceNumber: string;
  invoiceNumberNormalized: string;
  documentId: string;
};

export async function updateCompanyShipment(
  db: Firestore,
  actor: CompanyShipmentActor,
  body: Record<string, unknown>,
) {
  const itemId = text(body.itemId);
  const requestedStatus = text(body.deliveryStatus);
  if (!itemId || !requestedStatus) {
    throw new Error("DELIVERY_INPUT_INVALID:itemId and deliveryStatus are required.");
  }

  const itemRef = db.collection("order_items").doc(itemId);
  const now = new Date().toISOString();
  let result: { itemId: string; orderNo: string; deliveryStatus: string } | undefined;

  await db.runTransaction(async (transaction) => {
    const itemSnapshot = await transaction.get(itemRef);
    if (!itemSnapshot.exists) {
      throw new Error("ORDER_ITEM_NOT_FOUND:Order item was not found.");
    }
    const itemData = itemSnapshot.data() ?? {};
    assertItemOwnership(itemData, actor.companyId);

    const currentStatus = deliveryStatus(itemData);
    assertDeliveryTransition(currentStatus, requestedStatus);
    const orderNo = orderNumber(itemData);
    if (requestedStatus === "picked_up") {
      writePickupDocuments({
        db,
        transaction,
        actor,
        itemRef,
        itemId,
        orderNo,
        currentStatus,
        requestedStatus,
        now,
      });
      result = { itemId, orderNo, deliveryStatus: requestedStatus };
      return;
    }

    const shipment = resolveShipmentInput(itemData, body, requestedStatus);
    const shipmentRef = db.collection("shipments").doc(shipment.documentId);
    const shipmentSnapshot = await transaction.get(shipmentRef);
    assertShipmentOwnership(shipmentSnapshot.data(), actor.companyId, itemId);

    writeShipmentDocuments({
      db,
      transaction,
      actor,
      itemRef,
      itemId,
      itemData,
      orderNo,
      currentStatus,
      requestedStatus,
      shipment,
      shipmentAlreadyExists: shipmentSnapshot.exists,
      shipmentCreatedAt: shipmentSnapshot.get("created_at"),
      auditAction: "company_order_delivery_update",
      now,
    });
    result = { itemId, orderNo, deliveryStatus: requestedStatus };
  });

  if (!result) {
    throw new Error("DELIVERY_UPDATE_FAILED:Delivery transaction did not return a result.");
  }
  await updateOrderAggregateStatus(db, result.orderNo);
  return { ...result, message: "Delivery status was updated." };
}

export async function updateCompanyShipmentsBulk(
  db: Firestore,
  actor: CompanyShipmentActor,
  body: Record<string, unknown>,
) {
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length || rows.length > 100) {
    throw new Error("BULK_DELIVERY_INPUT_INVALID:One to 100 invoice rows are required.");
  }

  const normalizedRows = rows.map((value, index) => {
    const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
      rowNumber: index + 2,
      itemId: text(row.itemId ?? row.orderItemId ?? row["주문고유번호"] ?? row["주문상품ID"]),
      suppliedOrderNo: text(row.orderNo ?? row["주문번호"]),
      carrierCode: text(row.carrierCode ?? row["택배사코드"]),
      invoiceNumber: text(row.invoiceNumber ?? row.invoiceNo ?? row["송장번호"]),
      requestedStatus: text(row.deliveryStatus ?? row["배송상태"]) || "invoice_entered",
    };
  });

  const duplicateIds = normalizedRows
    .map((row) => row.itemId)
    .filter((itemId, index, values) => itemId && values.indexOf(itemId) !== index);
  if (duplicateIds.length) {
    throw new Error("BULK_DELIVERY_DUPLICATE:Duplicate unique order numbers are not allowed.");
  }
  if (normalizedRows.some((row) => !row.itemId || !row.suppliedOrderNo || !row.carrierCode || !row.invoiceNumber)) {
    throw new Error(
      "BULK_DELIVERY_ROW_INVALID:Every row requires order number, unique order number, carrier code, and invoice number.",
    );
  }

  const itemRefs = normalizedRows.map((row) => db.collection("order_items").doc(row.itemId));
  const now = new Date().toISOString();
  let preparedRows: Array<{ orderNo: string }> = [];

  await db.runTransaction(async (transaction) => {
    const itemSnapshots = await transaction.getAll(...itemRefs);
    const prepared = normalizedRows.map((row, index) => {
      const itemSnapshot = itemSnapshots[index];
      if (!itemSnapshot?.exists) {
        throw new Error(`ORDER_ITEM_NOT_FOUND:Row ${row.rowNumber} order item was not found.`);
      }
      const itemData = itemSnapshot.data() ?? {};
      try {
        assertItemOwnership(itemData, actor.companyId);
      } catch {
        throw new Error(`COMPANY_SCOPE_FORBIDDEN:Row ${row.rowNumber} does not belong to this company.`);
      }

      const currentStatus = deliveryStatus(itemData);
      const sameStatus = currentStatus === row.requestedStatus;
      if (!sameStatus) {
        try {
          assertDeliveryTransition(currentStatus, row.requestedStatus);
        } catch {
          throw new Error(`DELIVERY_TRANSITION_INVALID:Row ${row.rowNumber} status transition is not allowed.`);
        }
      }

      const orderNo = orderNumber(itemData);
      if (row.suppliedOrderNo !== orderNo) {
        throw new Error(
          `ORDER_NUMBER_MISMATCH:Row ${row.rowNumber} order number does not match the unique order number.`,
        );
      }
      const shipment = resolveShipmentInput(itemData, row, row.requestedStatus);
      if (sameStatus) {
        const existingCarrier = text(itemData.carrier_code ?? itemData.carrierCode);
        const existingInvoice = normalizeInvoiceNumber(itemData.invoice_no ?? itemData.invoiceNo);
        if (existingCarrier !== shipment.carrier.code || existingInvoice !== shipment.invoiceNumberNormalized) {
          throw new Error(
            `DELIVERY_IDEMPOTENCY_CONFLICT:Row ${row.rowNumber} already has different shipment data.`,
          );
        }
      }

      return {
        ...row,
        itemData,
        itemRef: itemRefs[index],
        orderNo,
        currentStatus,
        shipment,
      };
    });

    const shipmentRefs = prepared.map((row) => db.collection("shipments").doc(row.shipment.documentId));
    const shipmentSnapshots = await transaction.getAll(...shipmentRefs);
    shipmentSnapshots.forEach((snapshot, index) => {
      assertShipmentOwnership(snapshot.data(), actor.companyId, prepared[index].itemId);
    });

    prepared.forEach((row, index) => {
      const shipmentSnapshot = shipmentSnapshots[index];
      writeShipmentDocuments({
        db,
        transaction,
        actor,
        itemRef: row.itemRef,
        itemId: row.itemId,
        itemData: row.itemData,
        orderNo: row.orderNo,
        currentStatus: row.currentStatus,
        requestedStatus: row.requestedStatus,
        shipment: row.shipment,
        shipmentAlreadyExists: shipmentSnapshot.exists,
        shipmentCreatedAt: shipmentSnapshot.get("created_at"),
        auditAction: "company_order_delivery_bulk_update",
        now,
      });
    });

    preparedRows = prepared.map((row) => ({ orderNo: row.orderNo }));
  });

  for (const orderNo of [...new Set(preparedRows.map((row) => row.orderNo))]) {
    await updateOrderAggregateStatus(db, orderNo);
  }
  return { updatedCount: normalizedRows.length, message: "Bulk delivery rows were updated." };
}

function writeShipmentDocuments(input: {
  db: Firestore;
  transaction: FirebaseFirestore.Transaction;
  actor: CompanyShipmentActor;
  itemRef: FirebaseFirestore.DocumentReference;
  itemId: string;
  itemData: DocumentData;
  orderNo: string;
  currentStatus: string;
  requestedStatus: string;
  shipment: PreparedShipment;
  shipmentAlreadyExists: boolean;
  shipmentCreatedAt: unknown;
  auditAction: string;
  now: string;
}) {
  const {
    db,
    transaction,
    actor,
    itemRef,
    itemId,
    orderNo,
    currentStatus,
    requestedStatus,
    shipment,
    shipmentAlreadyExists,
    shipmentCreatedAt,
    auditAction,
    now,
  } = input;
  const shipmentRef = db.collection("shipments").doc(shipment.documentId);

  transaction.set(
    itemRef,
    {
      delivery_status: requestedStatus,
      carrier_code: shipment.carrier.code,
      carrier_name: shipment.carrier.name,
      invoice_no: shipment.invoiceNumber,
      shipment_id: shipment.documentId,
      shipment_updated_by: actor.uid,
      shipment_updated_at: now,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  transaction.set(
    shipmentRef,
    {
      shipment_id: shipment.documentId,
      order_no: orderNo,
      order_item_id: itemId,
      company_id: actor.companyId,
      delivery_status: requestedStatus,
      carrier_code: shipment.carrier.code,
      carrier_name: shipment.carrier.name,
      invoice_no: shipment.invoiceNumber,
      invoice_no_normalized: shipment.invoiceNumberNormalized,
      updated_by: actor.uid,
      created_at: shipmentAlreadyExists ? shipmentCreatedAt ?? now : now,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const fulfillmentRef = db.collection("order_fulfillments").doc(`${orderNo}-${actor.companyId}`);
  transaction.set(
    fulfillmentRef,
    {
      order_no: orderNo,
      company_id: actor.companyId,
      updated_by: actor.uid,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  transaction.set(
    fulfillmentRef.collection("items").doc(itemId),
    {
      order_no: orderNo,
      order_item_id: itemId,
      company_id: actor.companyId,
      shipment_id: shipment.documentId,
      delivery_status: requestedStatus,
      carrier_code: shipment.carrier.code,
      carrier_name: shipment.carrier.name,
      invoice_no: shipment.invoiceNumber,
      updated_by: actor.uid,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  transaction.set(db.collection("audit_logs").doc(), {
    action: auditAction,
    target: itemId,
    order_no: orderNo,
    company_id: actor.companyId,
    actor_uid: actor.uid,
    before_status: currentStatus,
    after_status: requestedStatus,
    carrier_code: shipment.carrier.code,
    shipment_id: shipment.documentId,
    created_at: now,
    updated_at: FieldValue.serverTimestamp(),
  });
}

function writePickupDocuments(input: {
  db: Firestore;
  transaction: FirebaseFirestore.Transaction;
  actor: CompanyShipmentActor;
  itemRef: FirebaseFirestore.DocumentReference;
  itemId: string;
  orderNo: string;
  currentStatus: string;
  requestedStatus: string;
  now: string;
}) {
  const { db, transaction, actor, itemRef, itemId, orderNo, currentStatus, requestedStatus, now } = input;
  transaction.set(
    itemRef,
    {
      delivery_status: requestedStatus,
      shipment_updated_by: actor.uid,
      shipment_updated_at: now,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const fulfillmentRef = db.collection("order_fulfillments").doc(`${orderNo}-${actor.companyId}`);
  transaction.set(
    fulfillmentRef,
    {
      order_no: orderNo,
      company_id: actor.companyId,
      updated_by: actor.uid,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  transaction.set(
    fulfillmentRef.collection("items").doc(itemId),
    {
      order_no: orderNo,
      order_item_id: itemId,
      company_id: actor.companyId,
      delivery_status: requestedStatus,
      fulfillment_method: "pickup",
      updated_by: actor.uid,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  transaction.set(db.collection("audit_logs").doc(), {
    action: "company_order_pickup_update",
    target: itemId,
    order_no: orderNo,
    company_id: actor.companyId,
    actor_uid: actor.uid,
    before_status: currentStatus,
    after_status: requestedStatus,
    created_at: now,
    updated_at: FieldValue.serverTimestamp(),
  });
}

function resolveShipmentInput(
  itemData: DocumentData,
  input: Record<string, unknown>,
  requestedStatus: string,
): PreparedShipment {
  if (!["invoice_entered", "in_transit", "delivered"].includes(requestedStatus)) {
    throw new Error("SHIPMENT_STATUS_INVALID:That delivery status does not use a parcel invoice.");
  }
  const carrier = requireShippingCarrier(input.carrierCode ?? itemData.carrier_code ?? itemData.carrierCode);
  const invoiceNumber = text(input.invoiceNumber ?? input.invoiceNo ?? itemData.invoice_no ?? itemData.invoiceNo);
  const invoiceNumberNormalized = normalizeInvoiceNumber(invoiceNumber);
  if (!invoiceNumberNormalized) {
    throw new Error("INVOICE_REQUIRED:Invoice number is required for delivery orders.");
  }
  return {
    carrier,
    invoiceNumber,
    invoiceNumberNormalized,
    documentId: shipmentDocumentId(carrier.code, invoiceNumberNormalized),
  };
}

function assertItemOwnership(itemData: DocumentData, companyId: string) {
  const itemCompanyId = text(itemData.company_id ?? itemData.companyId ?? itemData.seller_company_id);
  if (itemCompanyId !== companyId) {
    throw new Error("COMPANY_SCOPE_FORBIDDEN:This company cannot update that order item.");
  }
}

function assertShipmentOwnership(data: DocumentData | undefined, companyId: string, itemId: string) {
  if (!data) return;
  const existingCompanyId = text(data.company_id ?? data.companyId);
  const existingItemId = text(data.order_item_id ?? data.orderItemId);
  if (existingCompanyId !== companyId || existingItemId !== itemId) {
    throw new Error(
      "SHIPMENT_DUPLICATE:That carrier and invoice number are already assigned to another order item.",
    );
  }
}

function assertDeliveryTransition(currentStatus: string, requestedStatus: string) {
  if (!(allowedDeliveryTransitions[currentStatus] ?? []).includes(requestedStatus)) {
    throw new Error("DELIVERY_TRANSITION_INVALID:Delivery status transition is not allowed.");
  }
}

function orderNumber(itemData: DocumentData) {
  const value = text(itemData.order_no ?? itemData.orderNo ?? itemData.order_id);
  if (!value) {
    throw new Error("ORDER_SCOPE_MISSING:Order number is missing from the order item.");
  }
  return value;
}

function deliveryStatus(itemData: DocumentData) {
  return text(itemData.delivery_status ?? itemData.deliveryStatus) || "invoice_pending";
}

function normalizeInvoiceNumber(value: unknown) {
  return text(value).replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function shipmentDocumentId(carrierCode: string, invoiceNumberNormalized: string) {
  return createHash("sha256").update(`${carrierCode}|${invoiceNumberNormalized}`).digest("hex");
}

async function updateOrderAggregateStatus(db: Firestore, orderNo: string) {
  const snapshot = await db.collection("order_items").where("order_no", "==", orderNo).get();
  const statuses = snapshot.docs.map((doc) => text(doc.get("delivery_status")) || "invoice_pending");
  if (!statuses.length) return;
  const terminal = new Set(["delivered", "picked_up"]);
  const allTerminal = statuses.every((status) => terminal.has(status));
  const anyMoving = statuses.some((status) =>
    ["invoice_entered", "in_transit", "delivered", "picked_up"].includes(status),
  );
  const status = allTerminal ? "fulfilled" : anyMoving ? "partially_shipping" : "preparing";
  await db.collection("orders").doc(orderNo).set(
    { status, updated_at: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
