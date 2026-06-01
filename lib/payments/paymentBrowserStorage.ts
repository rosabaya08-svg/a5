export type StoredPaymentReceiver = {
  customerName?: string;
  customerPhoneMasked?: string;
  deliveryMethod?: "pickup" | "delivery";
  receiverAddress?: string;
  receiverAddressDetail?: string;
};

const receiverPrefix = "a5-server-payment-receiver:";

export function writePaymentReceiver(paymentIntentId: string, receiver: StoredPaymentReceiver) {
  if (typeof window === "undefined" || !paymentIntentId) return;

  try {
    window.localStorage.setItem(`${receiverPrefix}${paymentIntentId}`, JSON.stringify(receiver));
  } catch {
    // Receiver storage is a browser return convenience; server validation remains authoritative.
  }
}

export function readPaymentReceiver(paymentIntentId: string): StoredPaymentReceiver | undefined {
  if (typeof window === "undefined" || !paymentIntentId) return undefined;

  try {
    const value = window.localStorage.getItem(`${receiverPrefix}${paymentIntentId}`);
    return value ? (JSON.parse(value) as StoredPaymentReceiver) : undefined;
  } catch {
    return undefined;
  }
}
