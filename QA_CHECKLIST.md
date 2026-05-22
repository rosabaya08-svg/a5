# QA Checklist

## Purpose

This checklist defines the mock/test beta quality gate for the separated worktree tracks. It is intentionally scoped to static UI, mock data, stub adapters, route coverage, and merge readiness. It does not approve production release, real Firebase connection, PG payment, refund execution, settlement payout, SMS/AlimTalk delivery, shipping lookup, or external inventory API integration.

## Scope

- Admin mock management screens.
- Company admin mock screens.
- Nursery admin mock screens.
- Tablet closed-mall and customer QR mock flow.
- Guest order lookup mock flow.
- Firebase contract documents.
- QA/CI documents and workflow drafts.

## Required Local Checks After Merge

- [ ] `npm ci` completes on a clean checkout.
- [ ] `npm run lint` completes without blocking errors.
- [ ] `npm run build` completes without route or type errors.
- [ ] No `.env`, secret, service account, private key, `firebase.json`, `.firebaserc`, `firestore.rules`, or `storage.rules` files were introduced by mock beta tracks.
- [ ] No real Firebase SDK repository is imported into tablet/customer mock flows.
- [ ] Mock/stub adapters are visibly separated from future production adapters.
- [ ] All public route URLs in `ROUTE_SMOKE_CHECKLIST.md` render without a hard crash.
- [ ] Empty, loading, invalid, expired, failed, and success states are represented where applicable.
- [ ] Mobile viewport review covers tablet QR, checkout, success, failed, and guest order lookup routes.
- [ ] Desktop viewport review covers admin, company, and nursery management routes.
- [ ] `STATE_COVERAGE_MATRIX.md` and `reports/qa/STATE_COVERAGE_MATRIX.md` are reviewed for P0/P1 empty, loading, error, normal, risk, blocked, mock-ready, production-blocked, filter, search, sort, detail, and responsive coverage.
- [ ] `REPORT_MERGE_GUIDE.md` is used to combine track reports.
- [ ] `reports/qa/QA_RISK_REGISTER.md` has no unowned P0/P1 risks.
- [ ] `reports/qa/MANUAL_SCREEN_CHECKLIST.md` is ready for human screen review.
- [ ] `reports/qa/ACCESS_CONTROL_CHECKLIST.md` is reviewed against Firebase contract assumptions.
- [ ] `reports/qa/DATA_LEDGER_CHECKLIST.md` is reviewed against mock data and route smoke results.
- [ ] `reports/qa/CI_FAILURE_TRIAGE.md` is available for post-merge CI failures.
- [ ] `reports/qa/ROUTE_OWNER_MATRIX.md` is used to assign route/state failures.
- [ ] `reports/qa/MOCK_FIXTURE_EXPECTATIONS.md` is used to verify stable mock IDs and fixture coverage.
- [ ] `/qa/status` dashboard renders after a human starts the local app.
- [ ] `/qa/routes`, `/qa/smoke`, and `/qa/handoff` render after a human starts the local app.
- [ ] `reports/qa/STATUS_SUMMARY.md`, `STATUS_DASHBOARD_ROUTE_MAP.md`, and `STATUS_DASHBOARD_STATE_COVERAGE.md` are reviewed.
- [ ] `reports/qa/ROUTE_INDEX.md`, `VISUAL_SMOKE_PLAN.md`, and `MERGE_HANDOFF.md` are reviewed.
- [ ] Segmented route smoke files are reviewed for admin, company, nursery, tablet/QR/guest, and firebase-contract docs.
- [ ] `reports/qa/SCREEN_STATE_COVERAGE.md` is reviewed for screen-family state gaps.
- [ ] `reports/qa/PERMISSION_COVERAGE_MATRIX.md` is reviewed for role/route boundaries.
- [ ] `reports/qa/DATA_LEDGER_COVERAGE_MATRIX.md` is reviewed for cross-ledger consistency.

## State Coverage Checks

- [ ] Every list/table route has an empty state that does not collapse the layout.
- [ ] Loading and normal states are represented where a mock async or detail flow would naturally need them.
- [ ] Every lookup route has an invalid or not-found state.
- [ ] QR routes cover active, expired, used, canceled, success, and failed states.
- [ ] Blocked, mock-ready, and production-blocked states are explicit for Firebase, PG, Storage, refund, settlement, notification, shipping, and external inventory areas.
- [ ] Payment, refund, settlement, shipping, notification, and external inventory errors remain mock-only and never imply live integration.
- [ ] Risk badges are visible for critical payment, QR, settlement, inventory, access, and audit-log states.
- [ ] Filter controls are available for admin, company, and nursery management lists where tenant/status/date filtering is expected.
- [ ] Search controls are available for order, QR, room, tablet, company, nursery, and product lookup routes where applicable.
- [ ] Sort states are visible on dense admin/company/nursery tables.
- [ ] Detail views, panels, or modals show stable IDs and snapshots rather than relying on live data.
- [ ] Mobile-first customer routes avoid clipped text, overlapping controls, and hidden primary actions.
- [ ] Tablet mall routes remain usable in portrait and landscape widths.
- [ ] Desktop admin/company/nursery routes remain scannable with dense data.
- [ ] QA status dashboard keeps cards and route links readable on mobile, tablet, and desktop.
- [ ] QA route index, visual smoke checklist, and merge handoff hubs keep cards and lists readable on mobile/tablet/desktop.

## Data And Security Checks

- [ ] Mock products include stable IDs and option IDs.
- [ ] Mock orders include order item snapshots instead of relying only on live product references.
- [ ] QR sessions include short code, session ID, expiration state, and one-time-use status.
- [ ] Stable smoke fixtures such as `product-care-kit`, `SANHO701`, and `A5-20260519-001` remain available or all QA documents are updated.
- [ ] Admin and company views show tenant IDs such as `company_id`, `nursery_id`, `room_id`, and `tablet_id` where relevant.
- [ ] Sensitive values such as settlement accounts are masked.
- [ ] Customer guest flows avoid storing real customer data.
- [ ] Refund, settlement, shipping, payment, and external inventory behaviors remain mock-only.
- [ ] Blocked external integrations are recorded in per-track `reports/<track>/BLOCKERS.md`.
- [ ] Mock data contains no real customer names, phone numbers, addresses, payment tokens, account numbers, or secret-looking strings.
- [ ] Any mock data encoding or syntax issue is recorded before route smoke testing starts.
- [ ] Ledger relationships across products, order items, payments, QR sessions, inventory movements, and audit logs are checked with `reports/qa/DATA_LEDGER_CHECKLIST.md`.
- [ ] Test exclusions are confirmed in `reports/qa/TEST_EXCLUSIONS.md`.
- [ ] Human approval needs are triaged in `reports/qa/APPROVAL_MATRIX.md`.

## Review Sign-Off Template

| Area | Owner | Status | Notes |
| --- | --- | --- | --- |
| Firebase contract | TBD | Not reviewed | Validate schema and claim assumptions before adapter work. |
| QA/CI | TBD | Not reviewed | Run local checks after merge. |
| Admin | TBD | Not reviewed | Confirm route coverage and mock status states. |
| Company | TBD | Not reviewed | Confirm product, order, inventory, and payout mocks. |
| Nursery | TBD | Not reviewed | Confirm room, tablet, pickup, and QR history mocks. |
| Tablet QR | TBD | Not reviewed | Confirm responsive customer flow and no Firebase imports. |

## Failure Handling

If a check cannot be completed without a prohibited command or missing credential, do not improvise a production connection. Record the blocker in the relevant `reports/<track>/BLOCKERS.md`, keep the mock path intact, and continue with reviewable file changes.
