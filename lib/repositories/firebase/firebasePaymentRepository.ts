import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { CreatePaymentReadyInput, PaymentEvent, PaymentRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { Payment } from "@/types/commerce";

const paymentsCollection = "payments";
const paymentEventsCollection = "payment_events";

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asIsoDate(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const maybeTimestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().toISOString();
    if (typeof maybeTimestamp.seconds === "number") return new Date(maybeTimestamp.seconds * 1000).toISOString();
  }

  return undefined;
}

function normalizePaymentStatus(value: unknown) {
  const status = text(value).toLowerCase();
  if (status === "approved" || status === "paid" || status === "success" || status === "completed") return "approved";
  if (status === "failed" || status === "failure" || status === "declined") return "failed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "failed_mock" || status === "cancel_requested" || status === "cancelled_mock" || status === "approved_mock") return status;
  return "ready";
}

function mapPayment(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    orderId: text(data.order_id ?? data.orderId),
    orderNo: text(data.order_no ?? data.orderNo),
    status: normalizePaymentStatus(data.status) as Payment["status"],
    amount: typeof data.amount === "number" ? data.amount : 0,
    mockTid: text(data.provider_transaction_id ?? data.transaction_id ?? data.tid ?? data.payment_key ?? data.mock_tid ?? data.mockTid),
    approvedAt: asIsoDate(data.approved_at ?? data.approvedAt ?? data.paid_at ?? data.paidAt ?? data.completed_at ?? data.completedAt),
  };
}

export const firebasePaymentRepository: PaymentRepository = {
  async listPayments() {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", paymentsCollection);
    }

    try {
      const snapshot = await getDocs(collection(db, paymentsCollection));
      const payments = snapshot.docs.map((paymentDoc) => mapPayment(paymentDoc.id, paymentDoc.data()));

      return repositoryOk(
        payments.sort((left, right) => {
          const leftTime = left.approvedAt ? new Date(left.approvedAt).getTime() : 0;
          const rightTime = right.approvedAt ? new Date(right.approvedAt).getTime() : 0;
          return rightTime - leftTime;
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore payment list error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore payment list failed. ${message}`, paymentsCollection);
    }
  },

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
