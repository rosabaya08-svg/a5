# Nursery Track BLOCKERS

## Blockers
- `node_modules/next/dist/docs/` was not available in this worktree, so the required Next.js internal guide could not be read. Existing App Router page patterns were followed instead.
- Build and lint were not executed because the prompt explicitly forbids `npm run build` and `npm run lint`.
- Actual browser verification was not performed because the prompt forbids command-driven runtime checks.
- `/nursery/status` was created for visual inspection, but no dev server, build, lint, or browser smoke command was executed.

## Decisions Deferred
- Final Auth claim model for `NURSERY_ADMIN`, `nursery_id`, `room_id`, and `tablet_id`.
- Tablet-only closed mall enforcement strategy.
- App Check, device pairing token, and browser block implementation.
- Whether pickup completion should trigger SMS/Alimtalk, push, or no customer notification.
- Whether room numbers can be edited after an order or QR session exists.
- Whether static mock control panels should remain display-only for beta or become client-side draft forms.
- Dynamic detail routes were not used because the local Next.js internal docs are unavailable; static detail routes were created to avoid relying on uncertain route parameter conventions.
- Shared layout/sidebar mobile behavior may require edits outside the nursery track allowed scope.
- Actual tablet session validation, room-bound enforcement, and browser blocking require Auth/App Check/server policy approval.
- Room bulk registration needs server-side duplicate checks before any real save flow.
- QR `payment_failed` and `canceled` statuses are display-only mock states until payment contract is approved.
- Generated 30/30/50/50/30 mock arrays are local UI data only and are not a seed script.
- Unified search, pagination, and filters are display-only until client-state and repository policy are approved.
- Status dashboard values are static mock summary data, not filesystem scans or live project telemetry.
- Route preview cards are static and do not verify that a browser can render each route until a dev server/browser smoke is allowed.
- `delivery_events` are local mock rows only; no real delivery tracking, carrier API, webhook, or external inventory lookup is connected.
- `pickup_events` are local mock rows only; no real staff audit persistence or customer notification is connected.
- `/nursery/rooms/bulk-create`, `/nursery/tablets/assignment`, and `/nursery/risk-center` are display-only mock routes.

## Hard No-Connect Items
- No live Firebase project connection.
- No Firestore/Auth SDK integration.
- No PG/refund/settlement execution.
- No notification, delivery tracking, or external inventory API integration.
- No dynamic route param API implementation.
- No actual tablet session, browser blocking, bulk write, payment failure handling, or pickup audit persistence.
- No real customer personal data storage, live payment, live notification, live delivery tracking, or external inventory API.
