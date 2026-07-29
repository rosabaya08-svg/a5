import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { AccessHttpError, asRecord, firestoreDocumentId, safeDocumentId, text } from "../access/policy";
import {
  integer,
  maskCardNumber,
  normalizePayupDateTime,
  numberValue,
  type JsonRecord,
} from "./paymentShared";

export async function commitPayupApproval(input: {
  paymentSessionId: string;
  result: JsonRecord;
  transactionId: string;
  orderNumber: string;
  approvedAt: string;
}) {
  const db = getAdminDb();
  const sessionRef = db.doc(`payup_payment_sessions/${input.paymentSessionId}`);
  const sessionSnapshot = await sessionRef.get();
  if (!sessionSnapshot.exists) throw new AccessHttpError(404, "PAYUP_PAYMENT_SESSION_NOT_FOUND", "PayUp 결제세션을 찾을 수 없습니다.");
  const session = sessionSnapshot.data() ?? {};
  const planId = firestoreDocumentId(session.distribution_plan_id, "distributionPlanId");
  const qrSessionId = firestoreDocumentId(session.qr_session_id, "qrSessionId");
  const planRef = db.doc(`payment_distribution_plans/${planId}`);
  const reservationRef = db.doc(`inventory_reservations/${input.paymentSessionId}`);
  const planSnapshot = await planRef.get();
  if (!planSnapshot.exists) throw new AccessHttpError(404, "PAYUP_DISTRIBUTION_PLAN_NOT_FOUND", "차액분배 원장이 없습니다.");
  const plan = planSnapshot.data() ?? {};
  const items = Array.isArray(plan.items) ? plan.items.map(asRecord) : [];
  const lines = Array.isArray(plan.lines) ? plan.lines.map(asRecord) : [];
  const productRefs = items.map((item) => db.doc(`products/${firestoreDocumentId(item.productId ?? item.product_id, "plan.productId")}`));
  const orderRef = db.doc(`orders/${firestoreDocumentId(input.orderNumber, "orderNumber")}`);

  try {
    await db.runTransaction(async (transaction) => {
      const freshSession = await transaction.get(sessionRef);
      const freshPlan = await transaction.get(planRef);
      const reservation = await transaction.get(reservationRef);
      const existingOrder = await transaction.get(orderRef);
      const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
      const currentSession = freshSession.data() ?? {};
      const currentStatus = text(currentSession.status, 30);
      if (currentStatus === "APPROVED") {
        if (text(currentSession.transaction_id, 100) !== input.transactionId) throw new AccessHttpError(409, "PAYUP_PAYMENT_TRANSACTION_CONFLICT", "이미 다른 PayUp 거래번호로 승인된 결제입니다.");
        return;
      }
      if (existingOrder.exists && text(existingOrder.data()?.transaction_id, 100) !== input.transactionId) throw new AccessHttpError(409, "PAYUP_ORDER_NUMBER_CONFLICT", "같은 주문번호로 다른 거래가 이미 존재합니다.");
      if (!freshPlan.exists || text(freshPlan.data()?.status, 30) !== "LOCKED") throw new AccessHttpError(409, "PAYUP_DISTRIBUTION_PLAN_NOT_LOCKED", "차액분배 원장이 잠금 상태가 아닙니다.");
      if (!reservation.exists || text(reservation.data()?.status, 30) !== "RESERVED") throw new AccessHttpError(409, "PAYUP_INVENTORY_RESERVATION_MISSING", "결제 재고예약이 없습니다.");

      productSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) throw new AccessHttpError(409, "PAYUP_PRODUCT_NOT_FOUND", "승인 후 재고 반영 대상 상품이 없습니다.");
        const product = snapshot.data() ?? {};
        const quantity = integer(items[index].quantity, "plan.quantity", 1);
        const inventory = integer(product.inventory ?? product.stock, "product.inventory", 0);
        const reserved = integer(product.reserved_inventory ?? 0, "product.reservedInventory", 0);
        if (reserved < quantity || inventory < quantity) throw new AccessHttpError(409, "PAYUP_RESERVED_INVENTORY_INVALID", "예약재고 또는 실재고가 승인 수량보다 부족합니다.");
        transaction.set(productRefs[index], { inventory: inventory - quantity, stock: inventory - quantity, reserved_inventory: reserved - quantity, updated_at: FieldValue.serverTimestamp() }, { merge: true });
        transaction.set(db.collection("inventory_movements").doc(), {
          provider: "payup",
          type: "deduct",
          product_id: productRefs[index].id,
          quantity,
          order_number: input.orderNumber,
          transaction_id: input.transactionId,
          reason: "payup_payment_approved",
          created_at: FieldValue.serverTimestamp(),
          created_at_iso: new Date().toISOString(),
        });
      });

      const amount = integer(session.amount, "paymentSession.amount", 1);
      const receiver = asRecord(session.receiver_summary);
      const nowIso = new Date().toISOString();
      transaction.set(sessionRef, { status: "APPROVED", transaction_id: input.transactionId, approved_at: input.approvedAt, last_response_code: "0000", last_response_msg: text(input.result.responseMsg, 500), updated_at: FieldValue.serverTimestamp(), updated_at_iso: nowIso }, { merge: true });
      transaction.set(db.doc(`payments/${input.paymentSessionId}`), {
        id: input.paymentSessionId,
        provider: "payup",
        status: "approved",
        reconciliation_status: "PENDING",
        order_no: input.orderNumber,
        qr_session_id: qrSessionId,
        distribution_plan_id: planId,
        transaction_id: input.transactionId,
        amount,
        currency: "KRW",
        auth_number: text(input.result.authNumber, 100),
        card_name: text(input.result.cardName, 100),
        card_no_masked: maskCardNumber(input.result.cardNo),
        quota: text(input.result.quota, 20),
        approved_at: input.approvedAt,
        created_at: FieldValue.serverTimestamp(),
        created_at_iso: nowIso,
      }, { merge: true });
      transaction.set(orderRef, {
        id: input.orderNumber,
        orderNo: input.orderNumber,
        order_no: input.orderNumber,
        status: "paid",
        payment_status: "approved",
        payment_provider: "payup",
        payment_id: input.paymentSessionId,
        transaction_id: input.transactionId,
        qr_session_id: qrSessionId,
        short_code: text(session.short_code, 80),
        nursery_id: text(session.nursery_id, 160),
        room_id: text(session.room_id, 160),
        tablet_id: text(session.tablet_id, 160),
        cart_id: text(session.cart_id, 200),
        totalAmount: amount,
        total_amount: amount,
        items_snapshot: items,
        item_count: items.reduce((sum, item) => sum + numberValue(item.quantity), 0),
        customer_name: text(session.buyer_name_masked, 100) || "비회원 고객",
        customer_phone_masked: text(session.buyer_phone_masked, 30),
        delivery_method: text(receiver.deliveryMethod, 20) || "pickup",
        receiver_address_masked: text(receiver.address, 300),
        receiver_address_detail_masked: text(receiver.addressDetail, 300),
        pickup_location: session.pickup_location ?? null,
        paidAt: input.approvedAt,
        paid_at: input.approvedAt,
        guest_lookup_enabled: true,
        guest_read_enabled: true,
        order_completed: true,
        completed_at: input.approvedAt,
        completed_date: input.approvedAt.slice(0, 10),
        source: "payup_payment_approved",
        updated_at: FieldValue.serverTimestamp(),
        created_at: existingOrder.exists ? existingOrder.data()?.created_at ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(db.doc(`order_private/${firestoreDocumentId(input.orderNumber, "orderNumber")}`), { order_number: input.orderNumber, provider: "payup", encrypted_snapshot: session.private_snapshot_encrypted ?? null, access_policy: "SERVER_AUTHORIZED_ONLY", created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(db.doc(`qr_payment_sessions/${qrSessionId}`), { status: "paid", payment_state: "APPROVED", active_payment_session_id: FieldValue.delete(), payment_id: input.paymentSessionId, transaction_id: input.transactionId, order_no: input.orderNumber, paid_at: input.approvedAt, updated_at: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(planRef, { status: "CONFIRMED", payment_id: input.paymentSessionId, transaction_id: input.transactionId, confirmed_at: input.approvedAt, updated_at: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(reservationRef, { status: "CONSUMED", consumed_at: FieldValue.serverTimestamp(), consumed_at_iso: nowIso }, { merge: true });
      transaction.set(db.doc(`payup_transaction_snapshots/${safeDocumentId(input.transactionId)}`), {
        provider: "payup",
        transaction_id: input.transactionId,
        order_number: input.orderNumber,
        payment_id: input.paymentSessionId,
        total_amount: amount,
        status_code: "2001",
        reconciliation_status: "PENDING",
        auth_number: text(input.result.authNumber, 100),
        auth_datetime: input.approvedAt,
        cart_pay_list: plan.cart_pay_list,
        response_snapshot: { responseCode: text(input.result.responseCode, 100), responseMsg: text(input.result.responseMsg, 500), cardName: text(input.result.cardName, 100), cardNoMasked: maskCardNumber(input.result.cardNo), quota: text(input.result.quota, 20), binType02: text(input.result.binType02, 20) },
        created_at: FieldValue.serverTimestamp(),
        created_at_iso: nowIso,
      }, { merge: true });
      transaction.set(db.doc(`business_events/${safeDocumentId(`payment-approved-${input.transactionId}`)}`), { provider: "payup", event_type: "PAYMENT.APPROVED", order_number: input.orderNumber, transaction_id: input.transactionId, payment_id: input.paymentSessionId, amount, status: "RECORDED", occurred_at: FieldValue.serverTimestamp(), occurred_at_iso: nowIso }, { merge: true });

      items.forEach((item, index) => {
        transaction.set(db.doc(`order_items/${safeDocumentId(`${input.orderNumber}-${index + 1}`)}`), {
          id: `${input.orderNumber}-${index + 1}`,
          order_id: input.orderNumber,
          order_no: input.orderNumber,
          qr_session_id: qrSessionId,
          company_id: text(item.companyId ?? item.company_id, 160),
          product_id: text(item.productId ?? item.product_id, 160),
          product_name: text(item.productName ?? item.product_name, 200),
          option_id: text(item.optionId ?? item.option_id, 160) || null,
          option_name: text(item.optionName ?? item.option_name, 200),
          quantity: integer(item.quantity, "orderItem.quantity", 1),
          unit_price: integer(item.unitPrice ?? item.unit_price, "orderItem.unitPrice", 1),
          line_amount: integer(item.unitPrice ?? item.unit_price, "orderItem.unitPrice", 1) * integer(item.quantity, "orderItem.quantity", 1),
          delivery_status: text(receiver.deliveryMethod, 20) === "delivery" ? "invoice_pending" : "pickup_ready",
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        }, { merge: true });
      });

      lines.forEach((line, index) => {
        const lineId = safeDocumentId(text(line.id, 180) || `${input.paymentSessionId}-${index + 1}`);
        const organizationId = text(line.organizationId ?? line.organization_id, 160);
        const businessNumber = text(line.businessNumber ?? line.business_number, 20);
        const subMerchantId = text(line.subMerchantId ?? line.sub_merchant_id, 20);
        const lineType = text(line.lineType ?? line.line_type, 80);
        const recipientAmount = numberValue(line.amount);
        transaction.set(db.doc(`payment_distribution_lines/${lineId}`), { ...line, provider: "payup", sub_merchant_id: subMerchantId, organization_id: organizationId || null, business_number: businessNumber || null, line_type: lineType, payment_id: input.paymentSessionId, transaction_id: input.transactionId, order_number: input.orderNumber, status: "CONFIRMED", confirmed_at: input.approvedAt, updated_at: FieldValue.serverTimestamp() }, { merge: true });
        if (organizationId || businessNumber) {
          const activityId = safeDocumentId(`${input.transactionId}-${index + 1}`);
          transaction.set(db.doc(`payup_partner_activity/${activityId}`), { provider: "payup", event_type: "PARTNER.SALE.RECORDED", organization_id: organizationId || null, business_number: businessNumber || null, sub_merchant_id: subMerchantId, order_number: input.orderNumber, transaction_id: input.transactionId, product_id: text(line.productId ?? line.product_id, 160), product_name: text(line.productName ?? line.product_name, 200), quantity: numberValue(line.quantity), line_type: lineType, recipient_amount: recipientAmount, payment_amount: amount, transaction_status: "APPROVED", settlement_status: "PENDING", cancel_status: "NONE", occurred_at: FieldValue.serverTimestamp(), occurred_at_iso: nowIso }, { merge: true });
          transaction.set(db.doc(`business_events/${safeDocumentId(`partner-sale-${activityId}`)}`), { provider: "payup", event_type: "PARTNER.SALE.RECORDED", organization_id: organizationId || null, business_number: businessNumber || null, order_number: input.orderNumber, transaction_id: input.transactionId, line_type: lineType, recipient_amount: recipientAmount, status: "RECORDED", occurred_at: FieldValue.serverTimestamp(), occurred_at_iso: nowIso }, { merge: true });
        }
      });
    });
  } catch (error) {
    const safeResponse = { responseCode: text(input.result.responseCode, 100), responseMsg: text(input.result.responseMsg, 500), transactionId: input.transactionId, orderNumber: input.orderNumber, amount: numberValue(input.result.amount), authDateTime: input.approvedAt, authNumber: text(input.result.authNumber, 100), cardName: text(input.result.cardName, 100), cardNoMasked: maskCardNumber(input.result.cardNo), quota: text(input.result.quota, 20) };
    await Promise.all([
      sessionRef.set({ status: "LEDGER_COMMIT_PENDING", transaction_id: input.transactionId, approved_at: input.approvedAt, approval_response_snapshot: safeResponse, last_error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown ledger commit error", updated_at: FieldValue.serverTimestamp(), updated_at_iso: new Date().toISOString() }, { merge: true }),
      db.collection("payup_recovery_queue").add({ provider: "payup", type: "APPROVAL_LEDGER_COMMIT_FAILED", payment_session_id: input.paymentSessionId, transaction_id: input.transactionId, order_number: input.orderNumber, error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown ledger commit error", status: "OPEN", created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() }),
      db.collection("payup_reconciliation_queue").add({ provider: "payup", type: "LEDGER_REPAIR", payment_session_id: input.paymentSessionId, transaction_id: input.transactionId, order_number: input.orderNumber, status: "PENDING", attempt_count: 0, created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() }),
    ]);
    throw error;
  }

  await db.collection("payup_reconciliation_queue").add({ provider: "payup", type: "TRANSACTION_RECONCILIATION", payment_session_id: input.paymentSessionId, transaction_id: input.transactionId, order_number: input.orderNumber, status: "PENDING", attempt_count: 0, created_at: FieldValue.serverTimestamp(), created_at_iso: new Date().toISOString() });
}

export async function repairPayupApprovalLedger(paymentSessionIdValue: unknown, transactionRow: JsonRecord) {
  const paymentSessionId = firestoreDocumentId(paymentSessionIdValue, "paymentSessionId");
  const sessionSnapshot = await getAdminDb().doc(`payup_payment_sessions/${paymentSessionId}`).get();
  if (!sessionSnapshot.exists) throw new AccessHttpError(404, "PAYUP_PAYMENT_SESSION_NOT_FOUND", "복구 대상 PayUp 결제세션을 찾을 수 없습니다.");
  const session = sessionSnapshot.data() ?? {};
  if (text(session.status, 30) === "APPROVED") return { repaired: false, alreadyApproved: true };
  const expectedAmount = integer(session.amount, "paymentSession.amount", 1);
  const expectedOrderNumber = text(session.order_number, 30);
  const transactionId = text(transactionRow.transactionId ?? transactionRow.transaction_id, 100);
  const orderNumber = text(transactionRow.orderNumber ?? transactionRow.order_number, 30);
  const amount = integer(transactionRow.totalAmount ?? transactionRow.amount, "PayUp transaction amount", 1);
  const statusCode = text(transactionRow.statusCode ?? transactionRow.status_code, 20);
  if (statusCode !== "2001" || !transactionId || orderNumber !== expectedOrderNumber || amount !== expectedAmount) throw new AccessHttpError(409, "PAYUP_LEDGER_REPAIR_MISMATCH", "PayUp 거래조회 결과가 내부 승인 원장과 일치하지 않아 자동 복구할 수 없습니다.");
  const result: JsonRecord = { responseCode: "0000", responseMsg: "PayUp 거래조회 기반 내부 원장 복구", transactionId, orderNumber, amount, authDateTime: transactionRow.authDatetime ?? transactionRow.authDateTime, authNumber: transactionRow.authNumber, cardName: transactionRow.cardName, cardNo: transactionRow.cardNo, quota: transactionRow.allotmentMonth };
  const approvedAt = normalizePayupDateTime(result.authDateTime);
  await commitPayupApproval({ paymentSessionId, result, transactionId, orderNumber, approvedAt });
  return { repaired: true, alreadyApproved: false, transactionId, orderNumber, amount };
}
