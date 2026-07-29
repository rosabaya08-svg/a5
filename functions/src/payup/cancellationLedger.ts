import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { AccessHttpError, asRecord, firestoreDocumentId, safeDocumentId, text } from "../access/policy";
import { integer, numberValue, type JsonRecord } from "./paymentShared";

export async function repairPayupCancelledTransaction(transactionIdValue: unknown, cancelResult: JsonRecord = {}) {
  const transactionId = text(transactionIdValue, 100);
  if (!transactionId) throw new AccessHttpError(400, "CANCEL_TRANSACTION_REQUIRED", "PayUp transactionId가 필요합니다.");
  const db = getAdminDb();
  const cancellationRef = db.doc(`payup_cancellation_snapshots/${safeDocumentId(transactionId)}`);
  const transactionRef = db.doc(`payup_transaction_snapshots/${safeDocumentId(transactionId)}`);
  const [cancellationSnapshot, transactionSnapshot, paymentQuery] = await Promise.all([
    cancellationRef.get(),
    transactionRef.get(),
    db.collection("payments").where("transaction_id", "==", transactionId).limit(1).get(),
  ]);
  const cancellation = cancellationSnapshot.data() ?? {};
  if (text(cancellation.status, 50) === "CANCELLED") return { repaired: false, alreadyReversed: true, transactionId };
  const transactionData = transactionSnapshot.data() ?? {};
  const responseCode = text(cancelResult.responseCode ?? cancellation.response_code, 100);
  const payupStatus = text(transactionData.status_code, 20);
  if (responseCode !== "0000" && payupStatus !== "9001") throw new AccessHttpError(409, "CANCEL_EVIDENCE_REQUIRED", "PayUp 전체취소 성공 또는 거래조회 취소성공 근거가 필요합니다.");

  const paymentSnapshot = paymentQuery.docs[0];
  const payment = paymentSnapshot?.data() ?? {};
  const orderNumber = text(payment.order_no ?? transactionData.order_number ?? cancellation.order_number, 40);
  if (!orderNumber) throw new AccessHttpError(409, "CANCEL_ORDER_NOT_FOUND", "취소 거래의 내부 주문번호를 찾지 못했습니다.");
  const orderRef = db.doc(`orders/${firestoreDocumentId(orderNumber, "orderNumber")}`);
  const orderItems = await db.collection("order_items").where("order_no", "==", orderNumber).limit(300).get();
  const distribution = await db.collection("payment_distribution_lines").where("transaction_id", "==", transactionId).limit(300).get();
  const activities = await db.collection("payup_partner_activity").where("transaction_id", "==", transactionId).limit(300).get();
  const productIds = [...new Set(orderItems.docs.map((document) => text(document.data().product_id, 160)).filter(Boolean))];
  const productRefs = productIds.map((productId) => db.doc(`products/${firestoreDocumentId(productId, "productId")}`));

  await db.runTransaction(async (transaction) => {
    const freshCancellation = await transaction.get(cancellationRef);
    const orderSnapshot = await transaction.get(orderRef);
    const paymentDocument = paymentSnapshot ? await transaction.get(paymentSnapshot.ref) : null;
    const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    const currentCancellation = freshCancellation.data() ?? {};
    if (text(currentCancellation.status, 50) === "CANCELLED") return;
    const quantities = new Map<string, number>();
    orderItems.docs.forEach((document) => {
      const data = document.data();
      const productId = text(data.product_id, 160);
      quantities.set(productId, (quantities.get(productId) ?? 0) + integer(data.quantity, "orderItem.quantity", 1));
      transaction.set(document.ref, { payment_status: "cancelled", delivery_status: "cancelled", cancelled_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() }, { merge: true });
    });
    productSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) return;
      const quantity = quantities.get(productRefs[index].id) ?? 0;
      if (!quantity) return;
      const data = snapshot.data() ?? {};
      const inventory = integer(data.inventory ?? data.stock, "product.inventory", 0);
      transaction.set(productRefs[index], { inventory: inventory + quantity, stock: inventory + quantity, updated_at: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(db.collection("inventory_movements").doc(), { provider: "payup", type: "restore", product_id: productRefs[index].id, quantity, order_number: orderNumber, transaction_id: transactionId, reason: "payup_full_cancel", created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() });
    });

    const cancelledAt = text(cancelResult.cancelDateTime ?? cancellation.cancel_datetime, 50) || new Date().toISOString();
    if (orderSnapshot.exists) transaction.set(orderRef, { status: "cancelled", payment_status: "cancelled", cancel_transaction_id: transactionId, cancelled_at: cancelledAt, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    if (paymentDocument?.exists && paymentSnapshot) transaction.set(paymentSnapshot.ref, { status: "cancelled", reconciliation_status: "PENDING", cancelled_at: cancelledAt, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(transactionRef, { status_code: "9001", cancel_datetime: cancelledAt, reconciliation_status: "PENDING", updated_at: FieldValue.serverTimestamp() }, { merge: true });
    distribution.docs.forEach((document, index) => {
      const line = document.data();
      const amount = numberValue(line.amount);
      transaction.set(document.ref, { status: "REVERSED", reversal_amount: -amount, cancel_status: "CANCELLED", reversed_at: FieldValue.serverTimestamp(), reversed_at_iso: new Date().toISOString(), updated_at: FieldValue.serverTimestamp() }, { merge: true });
      const organizationId = text(line.organization_id ?? line.organizationId, 160);
      const businessNumber = text(line.business_number ?? line.businessNumber, 20);
      if (organizationId || businessNumber) {
        const reversalId = safeDocumentId(`${transactionId}-reversal-${index + 1}`);
        transaction.set(db.doc(`payup_partner_activity/${reversalId}`), { provider: "payup", event_type: "PARTNER.SALE.REVERSED", organization_id: organizationId || null, business_number: businessNumber || null, sub_merchant_id: text(line.sub_merchant_id ?? line.subMerchantId, 20), order_number: orderNumber, transaction_id: transactionId, product_id: text(line.product_id ?? line.productId, 160), product_name: text(line.product_name ?? line.productName, 200), quantity: -Math.abs(numberValue(line.quantity)), line_type: text(line.line_type ?? line.lineType, 80), recipient_amount: -Math.abs(amount), transaction_status: "CANCELLED", settlement_status: "REVERSED", cancel_status: "CANCELLED", occurred_at: FieldValue.serverTimestamp(), occurred_at_iso: new Date().toISOString() }, { merge: true });
        transaction.set(db.doc(`business_events/${safeDocumentId(`partner-reversal-${reversalId}`)}`), { provider: "payup", event_type: "PARTNER.SALE.REVERSED", organization_id: organizationId || null, business_number: businessNumber || null, order_number: orderNumber, transaction_id: transactionId, recipient_amount: -Math.abs(amount), status: "RECORDED", occurred_at: FieldValue.serverTimestamp(), occurred_at_iso: new Date().toISOString() }, { merge: true });
      }
    });
    activities.docs.forEach((document) => transaction.set(document.ref, { cancel_status: "CANCELLED", settlement_status: "REVERSED", updated_at: FieldValue.serverTimestamp() }, { merge: true }));
    transaction.set(cancellationRef, { provider: "payup", transaction_id: transactionId, order_number: orderNumber, status: "CANCELLED", response_code: responseCode || "0000", response_msg: text(cancelResult.responseMsg ?? cancellation.response_msg, 500), cancel_datetime: cancelledAt, reversal_completed: true, reversal_completed_at: FieldValue.serverTimestamp(), reversal_completed_at_iso: new Date().toISOString(), updated_at: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(db.doc(`business_events/${safeDocumentId(`payment-cancelled-${transactionId}`)}`), { provider: "payup", event_type: "PAYMENT.CANCELLED", order_number: orderNumber, transaction_id: transactionId, amount: -Math.abs(numberValue(payment.amount ?? transactionData.total_amount)), status: "RECORDED", occurred_at: FieldValue.serverTimestamp(), occurred_at_iso: new Date().toISOString() }, { merge: true });
  });
  return { repaired: true, alreadyReversed: false, transactionId, orderNumber };
}
