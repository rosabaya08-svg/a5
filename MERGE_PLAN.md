# Merge Plan

## Goal

Merge the six mock beta worktree tracks with minimal conflicts and without accidentally enabling production Firebase, PG, delivery, notification, settlement, or external inventory integrations.

## Recommended Merge Order

1. `firebase-contract`
2. `qa`
3. `admin`
4. `company`
5. `nursery`
6. `tablet-qr`

This order lands the contract and QA guardrails first, then adds management areas, then the tablet/customer flow that touches the broadest mock data surface.

## Track Ownership

| Track | Primary Paths | Conflict Risk | Merge Notes |
| --- | --- | --- | --- |
| `firebase-contract` | Firebase planning docs and `reports/firebase-contract/**` | Low | Docs only. Must not add Firebase config or rules files. |
| `qa` | `.github/workflows/**`, QA docs, `reports/qa/**` | Low | Validate workflow syntax after merge. Do not run CI locally unless requested. |
| `admin` | `app/admin/**`, `components/admin/**`, `components/pages/adminPages.tsx`, `data/admin/**`, `types/admin.ts` | Medium | Watch shared UI imports and route names. |
| `company` | `app/company/**`, `components/company/**`, `components/pages/companyPages.tsx`, `data/company/**`, `types/company.ts` | Medium | Keep product/order data assumptions aligned with tablet flow. |
| `nursery` | `app/nursery/**`, `components/nursery/**`, `components/pages/nurseryPages.tsx`, `data/nursery/**`, `types/nursery.ts` | Medium | Confirm tablet and room identifiers match tablet QR mock sessions. |
| `tablet-qr` | `app/tablet/**`, `app/q/**`, `app/orders/guest/**`, `components/tablet/**`, `components/guest/**`, shared mock product/order/QR data | High | Merge last because it can affect customer-facing data assumptions. |

## Expected Conflict Paths

| Path | Likely Tracks | Risk | Resolution Rule |
| --- | --- | --- | --- |
| `components/pages/adminPages.tsx` | admin, main history | Medium | Keep admin owner changes; verify admin route smoke. |
| `components/pages/companyPages.tsx` | company, main history | Medium | Keep company owner changes; verify company route smoke. |
| `components/pages/nurseryPages.tsx` | nursery, main history | Medium | Keep nursery owner changes; verify nursery route smoke. |
| `components/pages/tabletPages.tsx` | tablet-qr, main history | High | Keep tablet-qr owner changes; verify tablet/mobile routes. |
| `components/pages/guestPages.tsx` | tablet-qr, main history | High | Keep tablet-qr owner changes; verify QR and guest lookup. |
| `data/mockProducts.ts` | tablet-qr, company, admin | High | Prefer additive fields; preserve stable product IDs used by routes. |
| `data/mockOrders.ts` | tablet-qr, company, nursery, admin | High | Preserve order item snapshots and route smoke sample order. |
| `data/mockQrSessions.ts` | tablet-qr, nursery, admin | High | Preserve `SANHO701` sample short code and one-time-use states. |
| `types/commerce.ts` | tablet-qr, company, admin | Medium | Prefer optional additive fields and keep build-safe types. |
| Root shared reports | all tracks | Medium | Do not merge conflicting common reports; use `reports/<track>/` and `REPORT_MERGE_GUIDE.md`. |
| `.github/workflows/**` | qa, main history | Low | Keep QA-owned CI draft; do not add secrets or deploy steps. |

## Pre-Merge Human Checklist

- [ ] Confirm each worktree has only its allowed path changes.
- [ ] Read each `reports/<track>/AUTO_REPORT.md`.
- [ ] Read each `reports/<track>/BLOCKERS.md`.
- [ ] Confirm no track created `.env`, Firebase config, rules files, service accounts, private keys, or secrets.
- [ ] Confirm no track ran or committed generated dependency churn.
- [ ] Confirm shared files such as common reports were not modified.
- [ ] Compare each UI track against `STATE_COVERAGE_MATRIX.md` and `reports/qa/STATE_COVERAGE_MATRIX.md` before final merge.
- [ ] Record owner and target track for every missing P0/P1 empty, error, risk, filter, search, sort, detail, or responsive state.

## Track State Expectations

| Track | Required Before Merge | Notes |
| --- | --- | --- |
| `admin` | Empty/error states for tables, risk badges, date/status filters, search, sorting, and detail inspection. | Especially payment, refund, settlement, and audit-log risk states. |
| `company` | Empty/error states for product, inventory, order, delivery, payout, and sales routes. | External inventory, shipping, refund, and settlement remain mock-only. |
| `nursery` | Empty/error states for rooms, tablets, pickup, QR history, and order history. | Tablet access and stale-session warnings should be visible. |
| `tablet-qr` | Empty cart, invalid product, expired/used QR, failed checkout, success, failed, and guest lookup states. | Mobile/tablet layout is release-critical. |
| `firebase-contract` | Contract blockers mapped to implementation owners. | No config or rules files at this stage. |
| `qa` | CI draft, route smoke list, state coverage matrix, readiness and report templates. | Does not run build/lint during unattended generation. |

## Merge Conflict Triage

| Conflict Type | Preferred Resolution |
| --- | --- |
| Shared route/page component conflict | Keep the implementation from the owning track. Move cross-track notes to the relevant report. |
| Shared mock product/order/QR data conflict | Prefer `tablet-qr` values if they are needed for customer flow route smoke checks. Preserve admin/company/nursery display fields when additive. |
| Types conflict | Prefer the union of fields that supports route smoke checks, keeping optional fields for track-specific details. |
| UI component conflict | Keep the version used by the broadest set of routes, then verify all affected pages. |
| Firebase config or rules file appears | Stop merge and move the item to blocker review. Mock beta should not introduce production config. |

## Post-Merge Gate

- [ ] Install dependencies on a clean machine or CI runner with `npm ci`.
- [ ] Run lint.
- [ ] Run build.
- [ ] Execute the route smoke checklist.
- [ ] Execute the state coverage matrix for P0/P1 states.
- [ ] Confirm the CI workflow appears in GitHub but does not require secrets for mock beta.
- [ ] Create a single combined blocker list before any Firebase or PG integration begins.
- [ ] Use `REPORT_MERGE_GUIDE.md` to combine `AUTO_REPORT`, `NEXT_TASKS`, and `BLOCKERS` consistently.
- [ ] Use `reports/qa/REPORT_INTEGRATION_REQUIREMENTS.md` to verify required fields.
- [ ] Use `reports/qa/MANUAL_VERIFICATION_SEQUENCE.md` for the human review sequence.
- [ ] Use `reports/qa/WORKTREE_SCOPE_MATRIX.md` to verify track-specific allowed and prohibited paths.
- [ ] Use `reports/qa/BLOCKER_SEVERITY_MODEL.md` to normalize blocker priority.

## Commit Message Suggestions

- `docs: add qa mock beta gate`
- `ci: add mock beta quality workflow`
- `docs: add route smoke and merge plan`
