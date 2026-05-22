# tablet-qr NEXT_TASKS

## Human Review

1. Run `npm run build` after the unattended phase, if allowed.
2. Run `npm run lint` after the unattended phase, if allowed.
3. Review route rendering for:
   - `/tablet/products`
   - `/tablet/cart`
   - `/tablet/qr`
   - `/tablet/ask`
   - `/tablet/status`
   - `/q/SANHO701`
   - `/q/SANHO701/loading`
   - `/q/SANHO701/expired`
   - `/q/ASKNOW44`
   - `/q/OLDQR22`
   - `/q/USED701`
   - `/q/VOID1234`
   - `/q/VOID1234/status`
   - `/q/CANCEL77/status`
   - `/q/DELIV900`
   - `/q/DELIV900/status`
   - `/orders/guest`
   - `/orders/guest/A5-20260519-001`
   - `/orders/guest/A5-20260519-001/refund`
   - `/orders/guest/A5-20260519-003`
   - `/orders/guest/A5-20260519-004`
   - `/orders/guest/A5-20260519-005`
   - `/orders/guest/A5-20260518-012`
   - `/orders/guest/UNKNOWN-ORDER`
   - `/tablet/products/product-monitor`
   - `/tablet/products/product-wrap-set`
4. Check whether other worktrees also changed tablet-qr shared data files such as `data/mockProducts.ts`, `data/mockOrders.ts`, `data/mockQrSessions.ts`, or `lib/repositories/mock/**` before merging.
5. Confirm the new tablet/guest panel split is acceptable before extracting more page internals into route-specific components.
6. Review the static search/filter/sort controls and decide which should become real server-backed filters later.
7. Confirm whether the route matrices should remain visible in beta or move to a QA-only/admin-only page later.
8. Review `reports/tablet-qr/SMOKE_CHECKLIST.md` and decide whether any route should be hidden before external beta review.
9. Review `reports/tablet-qr/EDGE_CASE_MATRIX.md` for QR/order edge cases that still need product or policy decisions.
10. Review `reports/tablet-qr/TOUCH_UX_REVIEW.md` before placing the beta on a real room tablet.
11. Use `reports/tablet-qr/BATCH_81_90_PLAN.md` as the next mock-only unattended queue if continuing this track.
12. Review `/tablet/status` in a browser after dev server use is allowed.
13. Review `reports/tablet-qr/STATUS_ROUTE_MAP.md` and `reports/tablet-qr/STATUS_STATE_COVERAGE.md` alongside the dashboard.
14. Review `reports/tablet-qr/ROUTE_INDEX.md`, `VISUAL_SMOKE_PLAN.md`, and `MERGE_HANDOFF.md` before merge.

## Product Decisions Needed

1. Confirm whether ask-payer QR should be created from the cart screen, a separate guardian flow, or both.
2. Confirm final guest order lookup verification policy.
3. Decide exact QR expiration duration and whether expired QR can be regenerated.
4. Decide pickup completion responsibility: nursery admin, tablet staff, or both.
5. Decide whether guest refund requests require phone verification, order number only, or paid transaction proof.
6. Confirm whether `/q/[code]/expired` should remain a dedicated route or fold into `/q/[code]/status`.
7. Confirm customer-facing Korean copy for refund request mock and expired QR states.

## Engineering Follow-Up

1. Move future Firebase implementation behind repository interfaces without importing Firebase SDK into UI pages.
2. Add tests for QR state branching once test commands are allowed.
3. Add a real image strategy later: Storage placeholders, static seed assets, or generated product images.
4. Add Server Actions only after the Firebase/PG contract is approved.
5. Keep real payment, refund, delivery tracking, and settlement code blocked until explicit approval.
6. Add real empty/error-state tests after build/lint/test commands are allowed.
7. When server-backed filters are approved, keep route matrices and summary grids behind mock repository adapters first.
8. Add route-level visual smoke screenshots after dev server/browser verification is allowed.
9. Keep commit candidate commands only in `reports/tablet-qr/COMMIT_CANDIDATE.md` during unattended mode.
10. Add screenshot-based visual review once dev server/browser use is allowed.
