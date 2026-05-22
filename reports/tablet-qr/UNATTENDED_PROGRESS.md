# tablet-qr UNATTENDED_PROGRESS

## Batch 18-20

- Catalog tabs and filter controls were expanded with category, price, stock, receive method, search, and sort mock UI.
- Product cards already expose list price, closed mall price, discount rate, comparison saving, stock badge, and fulfillment badge.

## Batch 21-28

- Product detail was expanded with placeholder visuals, option/quantity mock controls, risk badges, policy panels, and price comparison.
- Cart was expanded with quantity, delete, recalculation, fulfillment, and snapshot panels.
- QR creation was split between purchase QR and ask-payer QR and now includes source/expiry details.

## Batch 29-40

- QR status page route was added at `/q/[code]/status`.
- Active, expired, used, canceled, and payment_failed states are represented.
- Checkout includes card mock, easy pay mock, and blocked bank transfer.
- Success and failure pages include snapshot and failure reason panels.

## Batch 41-50

- Guest order lookup includes order/phone input, filters, summary grid, result list, empty state, and error state.
- Order detail includes status, payment detail, delivery/pickup timeline, item snapshot, and refund request mock.
- Mobile/tablet touch UX was reinforced with large cards, large buttons, and route matrices.

## Batch 51-53

- `mockProducts` expanded beyond 30 products.
- `mockQrSessions` expanded beyond 30 sessions using static generated mock records.
- `mockOrders`, `mockOrderItems`, and `mockPayments` expanded beyond 30 records using the generated QR sessions.

## Batch 54-60

- Route map, QR state coverage, order lookup coverage, privacy blockers, smoke checklist, AUTO_REPORT, NEXT_TASKS, and BLOCKERS were updated.

## Batch 61-80 Generated Follow-On Work

- Batch 61 added product detail image placeholder gallery slots for main/detail/package/room visuals.
- Batch 62 added cart inventory guard notices from mock product stock versus cart item snapshots.
- Batch 63 added purchase QR versus ask-payer QR issue mode cards with source and expiry metadata.
- Batch 64 added payer validation mock panels that do not persist real personal information.
- Batch 65 added checkout loading mock steps that explicitly block PG handoff and webhook behavior.
- Batch 66 added QR conflict messaging for expired, used, canceled, and payment_failed states.
- Batch 67 added order/phone mismatch safe-error copy for guest lookup.
- Batch 68 added `/q/[code]/loading` as a dedicated payment progress mock route.
- Batch 69 added edge-case, touch UX, and data-volume report files.
- Batch 70 updated smoke/report files to keep commit candidates isolated in `COMMIT_CANDIDATE.md`.

## Generated Batch 81-90 Backlog

- `reports/tablet-qr/BATCH_81_90_PLAN.md` was created as the next safe unattended queue.
- Batch 81 added `/tablet/status` as a local static status dashboard route.
- Batch 82 added `data/tablet-qr/statusMock.ts` for mock-only dashboard summary data.
- Batch 83 added `components/tablet-qr/StatusDashboard.tsx` for progress, blockers, route map, next tasks, human checks, and state coverage.
- Batch 84 added `reports/tablet-qr/STATUS_SUMMARY.md`.
- Batch 85 added `/tablet/status` to the tablet navigation and QA route matrix.
- Batch 86 added `reports/tablet-qr/STATUS_ROUTE_MAP.md`.
- Batch 87 added `reports/tablet-qr/STATUS_STATE_COVERAGE.md`.
- Batch 88 rebuilt `/tablet/status` into a browser-visible route index and preview hub.
- Batch 89 added `components/tablet/TabletRoutePreviewGrid.tsx` and `components/guest/GuestRoutePreviewGrid.tsx`.
- Batch 90 added `/q/[code]/expired`, `/orders/guest/[orderNo]/refund`, `ROUTE_INDEX.md`, `VISUAL_SMOKE_PLAN.md`, and `MERGE_HANDOFF.md`.
- Add browser screenshots only after dev-server/browser use is allowed.
- Convert static filter controls to server-backed mock repository functions if approved.
- Add route-level visual regression notes after build/lint restrictions are lifted.
- Move QA route matrices behind a QA-only flag before any external beta.
- Add real Firebase/PG handoff tests only after contracts and secrets are approved.
