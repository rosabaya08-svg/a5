# tablet-qr TOUCH_UX_REVIEW

## Tablet UX Checks

- Product cards use large hit areas and stable card dimensions for room tablet browsing.
- Cart quantity controls are visible as touch-size mock steppers, but they do not mutate stored data.
- QR issue buttons are full-width or high-contrast where staff are expected to tap during room support.
- Purchase QR and ask-payer QR are separated so staff can distinguish direct customer payment from guardian payment.
- Inventory guard warnings are placed near cart actions before QR generation.

## Mobile QR Checks

- QR landing keeps short code, expiry, amount, and item summary above the checkout action.
- Checkout keeps payer fields, validation copy, payment method mock, and loading state in one vertical flow.
- Failed, expired, used, cancelled, and payment_failed routes use explicit blocking copy.
- Guest order lookup uses large input mocks and avoids exposing real customer existence in mismatch copy.

## Review Needed Later

- Run a real tablet viewport visual smoke after dev server use is allowed.
- Confirm whether QA route matrices should be hidden from non-internal beta users.
- Confirm final Korean production copy for guardian payer, refund request, QR expiry, and phone mismatch states.
