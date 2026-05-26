export type ServerWriteCollection =
  | "payment_intents"
  | "order_drafts"
  | "inventory_reservations"
  | "orders"
  | "order_items"
  | "payments"
  | "payment_events"
  | "webhook_events"
  | "inventory_movements"
  | "qr_payment_sessions"
  | "audit_logs";

export const paymentConfirmTransactionCollections: ServerWriteCollection[] = [
  "payment_intents",
  "order_drafts",
  "inventory_reservations",
  "orders",
  "order_items",
  "payments",
  "payment_events",
  "webhook_events",
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

export function getPaymentReadyTransactionPlan(): string[] {
  return [
    "Read qr_payment_sessions/{qrSessionId} and require active, not expired.",
    "Read products/{productId} for every cart line and require active/approved.",
    "Recalculate amount from Firestore product prices, not browser totals.",
    "Create payment_intents/{paymentIntentId} in ready_mock status.",
    "Append audit_logs/{autoId} for ready attempt.",
  ];
}

export function getOrderCreateTransactionPlan(): string[] {
  return [
    "Read qr_payment_sessions/{qrSessionId}.",
    "Read products/{productId} and create immutable order_drafts snapshot.",
    "Do not create final orders before PG confirm.",
    "Append audit_logs/{autoId}.",
  ];
}

export function getQrTransactionPlan(): string[] {
  return [
    "Read nurseries/rooms/tablets and validate tablet-room-nursery scope.",
    "Read products/options in cart snapshot and require active/approved products.",
    "Recalculate amount from Firestore prices, not browser totals.",
    "Check option/product inventory before QR session creation.",
    "Create qr_payment_sessions/{qrSessionId} with active status and expires_at.",
    "Store item snapshot and total_amount_snapshot.",
    "Append audit_logs/{autoId}.",
  ];
}

export function getInventoryTransactionPlan(action: "reserve" | "release"): string[] {
  if (action === "reserve") {
    return [
      "Read products/{productId} inside a transaction.",
      "Calculate available = inventory - reserved_inventory.",
      "Reject if available is lower than requested quantity.",
      "Increment reserved_inventory and create inventory_reservations/{reservationId}.",
      "Append inventory_movements reserve event and audit log.",
    ];
  }

  return [
    "Read inventory_reservations/{reservationId}.",
    "Decrement reserved_inventory without going below zero.",
    "Mark reservation released and append inventory_movements release event.",
    "Append audit log.",
  ];
}
