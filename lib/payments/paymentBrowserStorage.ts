export type StoredPaymentReceiver = {
  customerName?: string;
  customerPhone?: string;
  customerPhoneMasked?: string;
  deliveryMethod?: "pickup" | "delivery";
  receiverName?: string;
  receiverPhone?: string;
  receiverPostalCode?: string;
  receiverAddress?: string;
  receiverAddressDetail?: string;
  deliveryMemo?: string;
  storedAt?: number;
  expiresAt?: number;
};

const receiverPrefix = "a5-server-payment-receiver:";
const receiverTtlMs = 30 * 60 * 1000;

export function writePaymentReceiver(paymentIntentId: string, receiver: StoredPaymentReceiver) {
  if (typeof window === "undefined" || !paymentIntentId) return;

  try {
    const now = Date.now();
    window.localStorage.setItem(
      `${receiverPrefix}${paymentIntentId}`,
      JSON.stringify({ ...receiver, storedAt: now, expiresAt: now + receiverTtlMs }),
    );
  } catch {
    // Receiver storage is a browser return convenience; server validation remains authoritative.
  }
}

export function readPaymentReceiver(paymentIntentId: string): StoredPaymentReceiver | undefined {
  if (typeof window === "undefined" || !paymentIntentId) return undefined;

  try {
    const value = window.localStorage.getItem(`${receiverPrefix}${paymentIntentId}`);
    if (!value) return undefined;

    const receiver = JSON.parse(value) as StoredPaymentReceiver;
    if (receiver.expiresAt && receiver.expiresAt <= Date.now()) {
      clearPaymentReceiver(paymentIntentId);
      return undefined;
    }

    return receiver;
  } catch {
    return undefined;
  }
}

export function clearPaymentReceiver(paymentIntentId: string) {
  if (typeof window === "undefined" || !paymentIntentId) return;

  try {
    window.localStorage.removeItem(`${receiverPrefix}${paymentIntentId}`);
  } catch {
    // Best-effort privacy cleanup after confirmation or expiry.
  }
}
