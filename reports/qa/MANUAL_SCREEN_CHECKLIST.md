# Manual Screen Checklist

## Purpose

This checklist guides human review after all tracks are merged and a local app is explicitly started. It is not an instruction for unattended Codex to install, build, lint, deploy, or connect production services.

## Admin

- [ ] Dashboard shows order, QR, payment, refund, settlement, and risk-log mock KPIs.
- [ ] Company management shows active, approval-pending, suspended, and detail states.
- [ ] Nursery/room/tablet management shows `nursery_id`, `room_id`, and `tablet_id`.
- [ ] Product approval queue shows pending, approved, rejected, and rejection reason states.
- [ ] Orders/payments/settlements remain mock-only and do not show live PG or payout actions.
- [ ] Audit log route shows severity badges and readable timestamps.
- [ ] Filters, search, sort, empty state, error state, and detail inspection are available for dense tables.

## Company

- [ ] Dashboard is scoped to `company_id`.
- [ ] Product list and form show draft, pending approval, approved, and rejected states.
- [ ] Product image/GIF areas use placeholders only.
- [ ] Inventory route shows stock movement mock data and external code mapping without API calls.
- [ ] Order/delivery routes show order item snapshots, fulfillment type, and invoice mock fields.
- [ ] Payout/sales routes show mock settlement states and masked account details.
- [ ] Empty/error/risk states are visible for inventory, delivery, refund, and payout cases.

## Nursery

- [ ] Dashboard is scoped to `nursery_id`.
- [ ] Room management shows add/edit/inactive mock states and duplicate room guidance.
- [ ] Tablet management shows active/inactive/stale last seen/browser blocked states.
- [ ] Pickup management shows pending, completed, and failed/mock blocked states.
- [ ] QR history shows active, expired, used, canceled states.
- [ ] Order history supports mock search/filter and empty/no-result states.

## Tablet

- [ ] Product list shows category, price, discount, stock, delivery, and pickup indicators.
- [ ] Product detail shows stable product ID, options, stock, closed-mall price, and placeholder media.
- [ ] Cart shows empty cart, quantity change, pickup/delivery split, and QR handoff.
- [ ] QR generation screen shows session ID, expiration, short code, and production PG blocked state.
- [ ] Tablet portrait and landscape widths keep primary actions visible.

## QR Customer Flow

- [ ] `/q/SANHO701` shows QR session summary, expiration, product/order summary, and mock-only checkout language.
- [ ] `/q/SANHO701/checkout` shows payer info mock fields and no live PG script.
- [ ] Success route shows mock order number and next steps.
- [ ] Failed route shows clear reason for expired, used, canceled, invalid, or failed mock payment.
- [ ] 360px and 430px widths do not clip primary buttons or critical status text.

## Guest Order Lookup

- [ ] `/orders/guest` shows order number and phone mock inputs.
- [ ] Invalid/no-match state is visible.
- [ ] `/orders/guest/A5-20260519-001` shows order summary, items, fulfillment state, and mock refund request.
- [ ] Real customer data, full phone numbers, addresses, payment tokens, and secrets are not present.

