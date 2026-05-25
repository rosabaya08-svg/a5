import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { CreatePaymentReadyInput, PaymentEvent, PaymentRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { Payment } from "@/types/commerce";

const paymentsCollection = "payments";
const paymentEventsCollection = "payment_events";

function mapPayment(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    orderId: typeof data.order_id === "string" ? data.order_id : typeof data.orderId === "string" ? data.orderId : "",
    orderNo: typeof data.order_no === "string" ? data.order_no : typeof data.orderNo === "string" ? data.orderNo : "",
    status: data.status === "failed_mock" || data.status === "cancel_requested" || data.status === "cancelled_mock" || data.status === "approved_mock" ? data.status : "ready",
    amount: typeof data.amount === "number" ? data.amount : 0,
    mockTid: typeof data.mock_tid === "string" ? data.mock_tid : typeof data.mockTid === "string" ? data.mockTid : "",
    approvedAt: typeof data.approved_at === "string" ? data.approved_at : typeof data.approvedAt === "string" ? data.approvedAt : undefined,
  };
}

export const firebasePaymentRepository: PaymentRepository = {
  async createPaymentReady(input: CreatePaymentReadyInput) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", input.orderNo);
    }

    const payment: Payment = {
      id: `payment-${input.orderNo}`,
      orderId: input.orderId,
      orderNo: input.orderNo,
      status: "ready",
      amount: input.amount,
      mockTid: "",
    };

    try {
      await setDoc(doc(db, paymentsCollection, payment.id), {
        ...payment,
        order_id: payment.orderId,
        order_no: payment.orderNo,
        mock_tid: payment.mockTid,
        guest_write_enabled: true,
        source: "firebase_storefront",
        created_at: input.createdAt,
        updated_at: serverTimestamp(),
      });

      return repositoryOk(payment);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore payment write error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore payment ready failed. ${message}`, input.orderNo);
    }
  },

  async recordPaymentApproved(paymentId, tid, amount) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", paymentId);
    }

    try {
      const approvedAt = new Date().toISOString();
      await updateDoc(doc(db, paymentsCollection, paymentId), {
        status: "approved_mock",
        mock_tid: tid,
        amount,
        approved_at: approvedAt,
        updated_at: serverTimestamp(),
      });
      const snapshot = await getDoc(doc(db, paymentsCollection, paymentId));

      return snapshot.exists()
        ? repositoryOk(mapPayment(snapshot.id, snapshot.data()))
        : repositoryError("NOT_FOUND", "Firebase payment not found after approval.", paymentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore payment approval error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore payment approve failed. ${message}`, paymentId);
    }
  },

  async recordPaymentFailed(paymentId, reason) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", paymentId);
    }

    try {
      await updateDoc(doc(db, paymentsCollection, paymentId), {
        status: "failed_mock",
        failed_reason: reason,
        updated_at: serverTimestamp(),
      });
      const snapshot = await getDoc(doc(db, paymentsCollection, paymentId));

      return snapshot.exists()
        ? repositoryOk(mapPayment(snapshot.id, snapshot.data()))
        : repositoryError("NOT_FOUND", "Firebase payment not found after failure.", paymentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore payment failure error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore payment failed update failed. ${message}`, paymentId);
    }
  },

  async appendPaymentEvent(event: Omit<PaymentEvent, "id">) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", event.paymentId);
    }

    const id = `payment-event-${event.paymentId}-${Date.now()}`;
    const payload: PaymentEvent = { ...event, id };

    try {
      await setDoc(doc(collection(db, paymentEventsCollection), id), {
        ...payload,
        payment_id: payload.paymentId,
        order_id: payload.orderId,
        qr_session_id: payload.qrSessionId,
        guest_write_enabled: true,
        source: "firebase_storefront",
        updated_at: serverTimestamp(),
      });

      return repositoryOk(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore payment event write error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore payment event append failed. ${message}`, event.paymentId);
    }
  },
};
