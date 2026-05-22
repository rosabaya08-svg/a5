# tablet-qr QR_STATE_COVERAGE

## Covered QR States

- `active` - QR can enter mock checkout.
- `expired` - QR blocks checkout and points to failure/lookup.
- `used` - QR was already paid and points to existing order.
- `canceled` - QR was cancelled and cannot continue.
- `payment_failed` - related payment mock failed and retry remains UI-only.

## Representative Codes

- `SANHO701` - active purchase QR.
- `ASKNOW44` - active ask-payer QR.
- `ASKMOM88` - paid ask-payer QR.
- `OLDQR22` - expired purchase QR.
- `USED701` - used purchase QR.
- `VOID1234` - payment failed/cancelled order branch.
- `CANCEL77` - canceled QR branch.
- `DELIV900` - paid delivery branch.
- `BETA001` through `BETA024` - generated bulk QR coverage across active, paid, expired, and cancelled states.

## Blocked Real Behavior

- No QR image service is connected.
- No Firebase document lookup is performed.
- No server-side QR ownership validation is performed.
- No PG approval, retry, cancel, or refund call is performed.
- No notification or share API is connected.
