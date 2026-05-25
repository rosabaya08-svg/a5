# PAYMENT_FLOW_CHECKLIST

## Customer Checkout Flow

- Customer opens `/q/SANHO701/checkout`.
- Screen shows order items, QR session, total amount, and delivery/pickup method.
- Screen shows current data/PG state:
  - mock/test beta,
  - Firebase products if product read succeeded,
  - PG public config status,
  - PG browser module status,
  - Functions endpoint status.
- Until PG approval, the visible button keeps the mock flow.

## PG Ready Flow

1. Browser calls Firebase Functions `paymentsReady`.
2. Server validates QR session is active.
3. Server recalculates order amount from snapshot data.
4. Server rejects client/server amount mismatch.
5. Server creates a payment intent draft.
6. Server returns a payment intent id and order number candidate.
7. Browser opens PG payment module with client key/channel key.

## PG Confirm Flow

1. PG module returns a payment token/payment key to the browser.
2. Browser sends token/payment key and payment intent id to `paymentsConfirm`.
3. Server recalculates amount again.
4. Server calls PG confirm API with `PG_SECRET_KEY`.
5. Firestore transaction writes:
   - `payments/{paymentIntentId}`,
   - `orders/{orderNo}`,
   - `order_items/{orderNo}-{lineNo}`,
   - `inventory_movements/{autoId}`,
   - `qr_payment_sessions/{qrSessionId}` paid state,
   - `audit_logs/{autoId}`.
6. Customer is redirected to success or fail state.

## Webhook Flow

- `paymentsWebhook` receives PG event.
- Verify signature with `PG_WEBHOOK_SECRET`.
- Reject duplicate event id.
- Load payment/order by payment key or order number.
- Apply status transition inside Firestore transaction.
- Write audit log.

## Cancel/Refund Flow

- Real cancel/refund remains blocked until policy approval.
- Cancel endpoint currently returns manual review and settlement hold plan.
- Refund must check settlement status before any PG cancel/refund call.

## Ready Today

- Client PG module handoff panel exists.
- Public env key names exist.
- Server env key names exist.
- Functions HTTPS handlers exist.
- Mock provider remains safe.

## Not Ready Until PG Company Confirms

- Provider SDK/script import.
- Provider payload exact fields.
- Confirm API request/response mapping.
- Webhook signature algorithm.
- Cancel/refund API policy.
