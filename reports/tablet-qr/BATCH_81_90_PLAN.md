# tablet-qr BATCH_81_90_PLAN

## Batch 81 - Visual QA Notes

- Status: started with local `/tablet/status` dashboard.
- Status: route index cards added to `/tablet/status`.
- Add route screenshot notes after dev server/browser use is allowed.
- Prioritize `/tablet/products`, `/tablet/cart`, `/tablet/qr`, `/q/SANHO701`, `/q/SANHO701/loading`, and `/orders/guest`.

## Batch 82 - Catalog Filter Behavior

- Convert static category, price, stock, receive method, search, and sort controls into repository-backed mock filters.
- Keep the implementation inside `lib/repositories/mock/**` until Firebase contracts are approved.

## Batch 83 - Cart Mutation Contract

- Draft UI states for quantity changed, item deleted, stale cart, and insufficient stock.
- Do not persist cart changes until server-side cart rules are approved.

## Batch 84 - QR Regeneration Contract

- Status: `/q/[code]/expired` was added as an expired QR preview route.
- Add mock copy for expired QR regeneration, cancelled QR replacement, and already-used QR lookup guidance.
- Keep QR regeneration as documentation/UI only.

## Batch 85 - Guest Verification Contract

- Decide whether guest lookup uses order number + phone, one-time code, or payment proof.
- Keep mismatch responses non-enumerating so customer existence is not leaked.

## Batch 86 - Refund Request Contract

- Status: `/orders/guest/[orderNo]/refund` was added as a refund request preview route.
- Add refund reason categories, attachment placeholder, and admin approval copy.
- Keep real PG cancellation and settlement hold blocked.

## Batch 87 - Pickup Timeline Detail

- Add nursery staff confirmation, room pickup ready, picked up, and cancelled pickup timeline states.
- Keep pickup writes blocked until nursery/admin rules are finalized.

## Batch 88 - Delivery Timeline Detail

- Add invoice pending, carrier accepted, out for delivery, delivered, and delivery issue mock states.
- Keep carrier API and tracking links blocked.

## Batch 89 - QA Gate

- Status dashboard now includes a manual route and blocker review panel.
- Add a manual review checklist for Firebase import absence, PG import absence, and no-secret files.
- Keep build/lint/test pending until command restrictions are lifted.

## Batch 90 - Beta Copy Review

- Status: `ROUTE_INDEX.md`, `VISUAL_SMOKE_PLAN.md`, and `MERGE_HANDOFF.md` were added.
- Prepare Korean production copy for QR expiry, guardian payer, phone mismatch, refund request, and external integration blocked states.
