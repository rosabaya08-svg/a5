# Admin Track Next Tasks

## Human Review

- Open `/admin/status` and click every Preview hub card in the order documented in `reports/admin/VISUAL_SMOKE_PLAN.md`.
- Run a full route smoke check for `/admin`, `/admin/dashboard`, `/admin/companies`, `/admin/companies/detail`, `/admin/nurseries`, `/admin/nurseries/detail`, `/admin/rooms`, `/admin/tablets`, `/admin/qr-sources`, `/admin/products`, `/admin/products/detail`, `/admin/orders`, `/admin/orders/detail`, `/admin/payments`, `/admin/refunds`, `/admin/settlements`, `/admin/integrations`, `/admin/risks`, and `/admin/audit-logs`.
- Include preferred alias routes `/admin/delivery` and `/admin/risk-center` in visual smoke.
- Run lint and build after the unattended worktree generation phase is finished.
- Compare the admin-scoped data model in `types/admin.ts` with the Firebase contract track before real adapter work starts.

## Merge Prep

- Keep this track limited to admin-scoped files when merging.
- Review `reports/admin/MERGE_HANDOFF.md` before merging into main.
- Merge after firebase-contract and qa tracks if they define shared schema or CI expectations.
- Do not merge broken shared mock encoding fixes from this track unless a separate shared-data task is approved.

## 1 Day Tasks

- Verify `/admin/status` preview cards open the intended routes.
- Confirm every admin page shows the mock/test beta banner and `실제 Firebase/PG 연결 없음`.
- Review the `/admin/status` route state coverage matrix and mark any empty/loading/error/risk gaps found during browser smoke.
- Run route smoke for every route in `reports/admin/ROUTE_MAP.md`.
- Run the click order in `reports/admin/VISUAL_SMOKE_PLAN.md`.
- Open `/admin/status` in a browser after dev server usage is allowed.
- Run lint and build after the unattended worktree generation phase is finished.
- Review admin nav length and shared sidebar mobile behavior.
- Check table overflow on mobile and tablet viewports.

## 3 Day Tasks

- Add explicit test fixtures for status tone mapping and admin table rendering.
- Validate mock status coverage against `reports/admin/STATE_COVERAGE.md`.
- Compare the admin-scoped data model in `types/admin.ts` with the Firebase contract track before real adapter work starts.
- Add real pagination/query requirements to repository interface docs.

## 5 Day Tasks

- Replace static mock controls with server-authorized actions only after Auth custom claims and Firestore rules are approved.
- Add real query adapters behind an interface after dev/prod Firebase separation is confirmed.
- Add route-level smoke tests for all admin pages.
- Decide whether detail pages should remain static mock pages or move to dynamic `[id]` routes after the local Next.js docs and build verification are available.
- Validate mobile/tablet behavior once the shared shell/sidebar can be reviewed by the UI track owner.
- Add table-level fixtures for refund status, external integration status, and operation risk severity mappings.
- Convert static tab panels into URL-addressable tab routes only after Next.js routing docs are locally available.

## 10 Day Tasks

- Connect only approved repository interfaces to Firebase emulator or dev backend after rules and claims are reviewed.
- Add audit-safe server actions for approval/rejection only after security approval.
- Add PG/refund/settlement adapters only after official documents, credentials, and QA gates are complete.
- Add notification, delivery, and inventory adapters behind mock-first contracts.

## Release Readiness

- Confirm all production actions remain unavailable in beta.
- Confirm masked settlement account values never expose full account numbers.
- Confirm QR source tracking uses `nursery_id + room_id + tablet_id`.
- Confirm QR source records expose `short_code`, `qr_session_id`, expiry, and order linkage without storing production customer data.
- Confirm order and settlement screens reference order_items as the settlement basis.
- Confirm static detail pages do not imply real mutation support.
- Confirm refund/cancel screens never imply production PG cancellation.
- Confirm external integration readiness screens do not contain secrets or connection instructions.
- Confirm operation risk dashboard remains documentative until product owners clear blockers.
