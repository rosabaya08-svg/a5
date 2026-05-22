# tablet-qr MERGE_HANDOFF

## Track

- Worktree: `my-app-tablet-qr`
- Track: `tablet-qr`
- Main local preview route: `/tablet/status`

## Added For Preview Handoff

- `app/tablet/status/page.tsx`
- `app/q/[code]/expired/page.tsx`
- `app/orders/guest/[orderNo]/refund/page.tsx`
- `components/tablet/TabletRoutePreviewGrid.tsx`
- `components/guest/GuestRoutePreviewGrid.tsx`
- `data/tablet-qr/statusMock.ts`
- `reports/tablet-qr/ROUTE_INDEX.md`
- `reports/tablet-qr/VISUAL_SMOKE_PLAN.md`
- `reports/tablet-qr/MERGE_HANDOFF.md`

## Merge Notes

- This track intentionally touches tablet/QR/guest customer UI and mock data only.
- It does not import Firebase SDK or `lib/repositories/firebase/**`.
- It does not add real PG, refund, AlimTalk, delivery, Storage, or external stock calls.
- The status route uses static mock metadata and does not inspect runtime filesystem state.

## Suggested Human Checks

- Confirm `/tablet/status` route cards open all target routes.
- Confirm mock/test beta badges appear on tablet and customer pages.
- Confirm refund route copy is acceptable before public beta.
- Confirm `/q/SANHO701/expired` is acceptable as a dedicated expired-page preview even though real expiry should be server-enforced later.
- Run build/lint only after command restrictions are lifted.

## Known Blockers

- Browser/dev server verification blocked because `node_modules` is absent and `next` cannot run.
- `npm.cmd run build` was attempted and failed with `next is not recognized as an internal or external command`.
- Lint not run.
- Firebase/PG integration intentionally absent.
- Storage remains on hold due to Spark limitation.
