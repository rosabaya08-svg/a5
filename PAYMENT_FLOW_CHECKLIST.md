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
# 2026-05-25 Payment Flow Gate

- [x] Client checkout has PG readiness panel and mock fallback.
- [x] Functions `paymentsReady` recalculates amount.
- [x] Functions `paymentsConfirm` keeps real PG disabled and writes Firestore transaction in mock mode.
- [x] Functions `paymentsStatus` endpoint skeleton exists.
- [x] PG provider adapter slot exists without SDK import.
- [x] Firestore rules block direct client writes to payment/order ledgers.
- [ ] Real PG SDK/API selected.
- [ ] PG test keys inserted into safe runtime locations.
- [ ] Real webhook signature verification implemented.
- [ ] Real cancel/refund policy approved.

# 2026-05-26 Transaction Backend Checklist

- [x] `paymentsReady` reads QR session from Firestore.
- [x] `paymentsReady` blocks missing, paid, expired, or cancelled QR sessions.
- [x] `paymentsReady` reads Firestore `products` and recalculates server amount.
- [x] `paymentsConfirm` blocks duplicate payment/order attempts.
- [x] `paymentsConfirm` blocks amount mismatch before any state transition.
- [x] `paymentsConfirm` blocks out-of-stock products.
- [x] `paymentsConfirm` writes order, order items, payment, payment event, inventory movement, QR paid state, and audit log in one Firestore transaction.
- [x] `paymentsWebhook` records event skeleton and duplicate event state without real signature validation.
- [x] `paymentsCancel` records manual review only; real cancel/refund remains blocked.
- [x] `ordersCreate` creates order draft snapshots only.
- [x] `qrCreate` creates active QR sessions with item snapshot and expiry.
- [x] `qrExpire` expires active QR sessions without changing paid/cancelled sessions.
- [x] `inventoryReserve` creates inventory reservations and increments `reserved_inventory`.
- [x] `inventoryRelease` releases reservations and prevents reserve underflow.
- [ ] Replace mock provider internals with official PG provider after keys/docs arrive.
- [ ] Add real webhook signature algorithm from the PG company.
- [ ] Run sandbox PG success/fail/expired/duplicate/amount-mismatch tests after deploy.
## 2026-05-26 QR Before PG Gate
- [x] Tablet cart QR creation calls backend QR API instead of silent local mock.
- [x] Backend QR response stores only display cache in browser localStorage.
- [x] `qr_payment_sessions` server write is the primary path.
- [x] QR amount is recalculated on the server from Firestore product/option prices.
- [x] Customer route is `/q/{shortCode}`.
- [ ] Deploy `qrCreate`/`qrExpire` Functions after final environment approval.
- [ ] Connect checkout to `paymentsReady`.
- [ ] Insert official PG adapter and keys after PG contract is received.
