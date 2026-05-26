export type ServerWriteCollection =
  | "payment_intents"
  | "orders"
  | "order_items"
  | "payments"
  | "payment_events"
  | "inventory_movements"
  | "qr_payment_sessions"
  | "audit_logs";

export const paymentConfirmTransactionCollections: ServerWriteCollection[] = [
  "payment_intents",
  "orders",
  "order_items",
  "payments",
  "payment_events",
  "inventory_movements",
  "qr_payment_sessions",
  "audit_logs",
];

export function getPaymentConfirmTransactionPlan(): string[] {
  return paymentConfirmTransactionCollections.map((collection) => `${collection}: Firebase Functions Admin SDK write only`);
}

export function isServerWriteCollection(collection: string): collection is ServerWriteCollection {
  return paymentConfirmTransactionCollections.includes(collection as ServerWriteCollection);
}
