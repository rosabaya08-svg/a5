# Admin Merge Handoff

Track: admin  
Workspace: my-app-admin  
Mode: mock/test beta only

## Files To Review Before Main Merge

- `app/admin/**`
- `components/admin/**`
- `components/pages/adminPages.tsx`
- `data/admin/**`
- `types/admin.ts`
- `reports/admin/**`

## High-Value Review Targets

- `/admin/status` preview hub and route card links.
- `components/admin/AdminRoutePreviewGrid.tsx` for card layout and route metadata rendering.
- `data/admin/statusMock.ts` for route metadata, blockers, and smoke routes.
- `components/pages/adminPages.tsx` for the shared admin beta banner and sidebar routes.
- `app/admin/delivery/page.tsx` and `app/admin/risk-center/page.tsx` alias routes.

## Likely Conflict Files

- `components/pages/adminPages.tsx`: many admin page exports and admin sidebar entries live here.
- `data/admin/mockAdminData.ts`: large mock dataset may conflict with future admin data additions.
- `data/admin/statusMock.ts`: status dashboard metadata will likely change as routes grow.
- `reports/admin/AUTO_REPORT.md`, `reports/admin/NEXT_TASKS.md`, `reports/admin/BLOCKERS.md`: generated reports may be updated by later unattended passes.

## Build And Verification Required Later

These commands were not run in unattended mode because the user explicitly forbade build/lint/npm commands:

- TypeScript compile / Next build.
- Lint.
- Browser route smoke.
- Mobile/tablet screenshot pass.

## Merge Order Recommendation

1. Merge firebase-contract first if schema and claims docs changed.
2. Merge qa second if route smoke or CI expectations changed.
3. Merge admin after confirming no shared route/page conflicts.
4. Re-run route index smoke after merge.

## Production Safety Gates

- Firebase connection remains blocked.
- Firestore/Auth connection remains blocked.
- PG, refund, cancellation, and payout remain blocked.
- Alimtalk, delivery lookup, and external inventory remain blocked.
- Storage Blaze decision remains pending.
- Production deploy/open remains forbidden.

## Manual Checks

- Confirm every preview hub card opens the intended page.
- Confirm every admin page displays the mock/test beta banner.
- Confirm no page claims real approval, payment, refund, payout, notification, delivery, or inventory execution.
- Confirm account numbers remain masked.
- Confirm QR source fields include nursery_id, room_id, tablet_id, qr_session_id, short_code, and cart_id where relevant.
