# Release Readiness

## Release Type

This project state targets a mock/test beta package only. It is not ready for production commerce, real customer data, real Firebase, PG payment, refund execution, settlement payout, shipping lookup, notification sending, or external inventory synchronization.

## Mock Beta Ready Criteria

- [ ] All six worktree tracks are merged in the planned order.
- [ ] Each track has `reports/<track>/AUTO_REPORT.md`, `NEXT_TASKS.md`, and `BLOCKERS.md`.
- [ ] CI workflow file exists and is reviewable.
- [ ] `QA_CHECKLIST.md`, `ROUTE_SMOKE_CHECKLIST.md`, and `MERGE_PLAN.md` are current.
- [ ] `STATE_COVERAGE_MATRIX.md` and `REPORT_MERGE_GUIDE.md` are current.
- [ ] A clean checkout can install dependencies, lint, and build.
- [ ] Route smoke checks pass or each failure has an owner and blocker note.
- [ ] `/qa/status` dashboard renders and accurately reflects current QA blockers and next tasks.
- [ ] `/qa/routes`, `/qa/smoke`, and `/qa/handoff` render and match their report documents.
- [ ] P0/P1 items in `reports/qa/STATE_COVERAGE_MATRIX.md` pass or have owner/blocker notes.
- [ ] Mobile customer QR and guest order lookup routes are usable with mock data.
- [ ] Admin, company, and nursery desktop routes are usable with mock data.
- [ ] No production credentials or secret material exist in the repository.

## Area Readiness Checklist

| Area | Ready Criteria | Status |
| --- | --- | --- |
| UI completion | Core admin, company, nursery, tablet, QR, and guest screens render with mock/test states. | Pending route smoke |
| Mock data | Products, order items, payments, QR sessions, inventory movements, and audit logs are internally consistent. | Pending ledger review |
| Repository/adapters | Mock/stub paths are separated from future Firebase/PG/Storage adapters. | Pending code review |
| Firebase blockers | Project, env split, schema, claims, rules, emulator, App Check, IAM, and Secret Manager decisions are documented. | Blocked before production |
| PG blockers | Live payment, refund, settlement, and payout actions are disabled and documented as mock-only. | Blocked before production |
| Auth blockers | `SUPER_ADMIN`, `COMPANY_ADMIN`, `NURSERY_ADMIN`, `TABLET_DEVICE`, and `CUSTOMER_GUEST` rules are planned but not enforced by real Auth. | Blocked before production |
| Storage blockers | Product image/GIF upload remains placeholder-only while Storage/Blaze decision is pending. | Blocked before production |
| Route smoke | Required routes pass desktop/tablet/mobile smoke checks. | Pending |
| Build/lint | Clean build and lint pass after merge. | Pending |
| Operating prohibition | Real payment/refund/settlement/deploy/secret/Firebase/PG/external API work remains disabled. | Required |

## Triage And Ownership Inputs

- [ ] CI failures can be categorized with `reports/qa/CI_FAILURE_TRIAGE.md`.
- [ ] Route and state failures can be assigned with `reports/qa/ROUTE_OWNER_MATRIX.md`.
- [ ] Mock fixture gaps can be checked with `reports/qa/MOCK_FIXTURE_EXPECTATIONS.md`.
- [ ] Release messaging can be drafted from `reports/qa/MOCK_BETA_RELEASE_NOTES.md`.
- [ ] Mock beta release criteria can be checked with `reports/qa/MOCK_BETA_RELEASE_CRITERIA.md`.
- [ ] Production prohibitions can be checked with `reports/qa/PRODUCTION_PROHIBITION_CHECKLIST.md`.
- [ ] Future integration gates can be checked with `reports/qa/PRODUCTION_TRANSITION_CHECKLISTS.md`.
- [ ] Test exclusions can be checked with `reports/qa/TEST_EXCLUSIONS.md`.
- [ ] Human approval needs can be checked with `reports/qa/APPROVAL_MATRIX.md`.
- [ ] Final sign-off can be recorded with `reports/qa/FINAL_QA_SIGNOFF_TEMPLATE.md`.

## State Readiness Gate

Mock/test beta is not ready for external review until these state checks are satisfied:

- [ ] Customer QR routes show safe mock handling for active, expired, used, failed, and success states.
- [ ] Guest order lookup has invalid order and no-match states.
- [ ] Tablet cart has empty cart, quantity change, fulfillment split, and QR handoff states.
- [ ] Admin, company, and nursery tables have empty state, filter/search/sort affordances, and detail inspection.
- [ ] Risk badges distinguish critical, warning, pending, expired, failed, and completed states.
- [ ] Mobile/tablet layouts keep the primary action visible without overlap.
- [ ] Production-only integrations remain blocked with mock error messaging.

## Production Blockers

- Firebase project selection and environment split are not finalized.
- Firestore schema and index plan require implementation review.
- Auth custom claims require secure server-side assignment.
- Firestore and Storage rules are not created for this mock beta stage.
- Payment gateway integration is intentionally absent.
- Refund, settlement, notification, shipping lookup, and external inventory APIs are intentionally absent.
- App Check, IAM, Secret Manager, and audit log enforcement need a separate production hardening pass.
- Real customer information handling and retention policy are not approved.

## Firebase Connection Entry Criteria

- [ ] `FIRESTORE_SCHEMA_PLAN.md` is approved.
- [ ] `AUTH_CLAIMS_PLAN.md` is approved.
- [ ] `FUNCTIONS_SERVER_LOGIC_PLAN.md` is approved.
- [ ] `REPOSITORY_INTERFACE_PLAN.md` and adapter split are approved.
- [ ] Emulator strategy is chosen.
- [ ] Dev/prod separation is documented.
- [ ] Rules files are authored only after the schema and claims model are approved.
- [ ] Secrets are created outside the repository and documented by name only.

## QA Report Template

| Field | Value |
| --- | --- |
| Review date | YYYY-MM-DD |
| Reviewer | TBD |
| Branch/worktree | TBD |
| Scope | Mock/test beta |
| Install result | Not run / Pass / Fail |
| Lint result | Not run / Pass / Fail |
| Build result | Not run / Pass / Fail |
| Route smoke result | Not run / Pass / Fail |
| Critical blockers | Link to blocker list |
| Release decision | Hold / Mock beta only / Ready for next review |

## AUTO_REPORT Integration Template

| Track | Summary | Files touched | Verification | Blockers |
| --- | --- | --- | --- | --- |
| firebase-contract | TBD | TBD | Docs reviewed | TBD |
| qa | TBD | TBD | Docs reviewed | TBD |
| admin | TBD | TBD | Pending route smoke | TBD |
| company | TBD | TBD | Pending route smoke | TBD |
| nursery | TBD | TBD | Pending route smoke | TBD |
| tablet-qr | TBD | TBD | Pending route smoke | TBD |

## BLOCKERS Integration Template

| Priority | Track | Blocker | Required Decision | Owner |
| --- | --- | --- | --- | --- |
| P0 | TBD | Production secret/config introduced | Remove before merge | TBD |
| P1 | TBD | Route build failure | Fix before mock beta package | TBD |
| P1 | TBD | Data model mismatch | Align mock and contract | TBD |
| P2 | TBD | Visual or responsive issue | Fix before external demo | TBD |

## NEXT_TASKS Integration Template

| Order | Task | Owner | Exit Criteria |
| --- | --- | --- | --- |
| 1 | Merge contract and QA tracks | TBD | Docs and workflow land cleanly. |
| 2 | Merge admin/company/nursery tracks | TBD | Management routes render. |
| 3 | Merge tablet QR track | TBD | Customer flow route smoke passes. |
| 4 | Run clean install/lint/build | TBD | CI and local results match. |
| 5 | Prepare Firebase adapter task list | TBD | Production blockers are resolved or assigned. |
