# Nursery Track NEXT_TASKS

## 1 Day
- Run lint/build only after commands are allowed.
- Open `/nursery/status` manually after a dev server is already running or after runtime commands are allowed.
- Review `/nursery/dashboard`, `/nursery/rooms`, `/nursery/tablets`, `/nursery/pickups`, `/nursery/qr-history`, `/nursery/orders`.
- Review generated mock data counts on `/nursery/mock-data`.
- Compare `/nursery/status` route list against `reports/nursery/ROUTE_MAP.md`.
- Use `reports/nursery/STATUS_SMOKE_MATRIX.md` as the browser smoke checklist.
- Use `reports/nursery/ROUTE_INDEX.md` as the full route index.
- Use `reports/nursery/VISUAL_SMOKE_PLAN.md` for visual route smoke once runtime commands are allowed.
- Review `/nursery/rooms/bulk-create`, `/nursery/tablets/assignment`, and `/nursery/risk-center`.

## 3 Days
- Confirm whether static detail routes should become dynamic routes.
- Confirm whether `/nursery/status` should stay nursery-only or be standardized across all tracks.
- Confirm whether `pickup_events` and `delivery_events` field names match the Firebase contract track.
- Confirm whether `/nursery/rooms/bulk` remains preview-only or becomes a draft wizard.
- Confirm whether `/nursery/tablets/access` becomes the source of truth for tablet session policy.
- Confirm mobile/sidebar behavior outside nursery-owned files.

## 5 Days
- Add real client-side filter/search state after mock UI approval.
- Add real tab interaction after client-state policy is approved.
- Connect repository interfaces only after Firebase/Auth contracts are approved.
- Add visual regression screenshots after dev server/browser commands are allowed.

## 10 Days
- Plan Firebase Emulator tests before live Firebase connection.
- Plan role-scoped route guards for `NURSERY_ADMIN`.
- Plan pickup audit persistence only after customer notification policy is approved.
- Decide whether `/nursery/operations` becomes a real incident triage workspace.

## Merge Notes
- This track intentionally writes reports under `reports/nursery/`.
- Suggested merge after firebase-contract and QA tracks, before tablet-qr if QR source fields change.
