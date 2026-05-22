# QA NEXT TASKS

## Immediate Human Review

1. Confirm this worktree only contains QA track changes.
2. Review `.github/workflows/mock-beta-ci.yml` before pushing because it will run `npm ci`, lint, and build in GitHub Actions.
3. Confirm Node 22 is the desired CI runtime for Next 16.2.6 and React 19.2.4.
4. Confirm the sample product route `/tablet/products/product-care-kit` still matches actual mock product IDs after the tablet QR track lands.
5. Confirm `/admin/dashboard` remains a valid route or update the smoke checklist if the final route is `/admin`.

## After All Tracks Finish

1. Merge tracks in this order: `firebase-contract`, `qa`, `admin`, `company`, `nursery`, `tablet-qr`.
2. Build a combined blocker list from every `reports/<track>/BLOCKERS.md`.
3. Combine reports with `REPORT_MERGE_GUIDE.md`.
4. Compare each UI track against `STATE_COVERAGE_MATRIX.md` and `reports/qa/STATE_COVERAGE_MATRIX.md`.
5. Review risks with `reports/qa/QA_RISK_REGISTER.md`.
6. Review screen coverage with `reports/qa/MANUAL_SCREEN_CHECKLIST.md`.
7. Review role boundaries with `reports/qa/ACCESS_CONTROL_CHECKLIST.md`.
8. Review data consistency with `reports/qa/DATA_LEDGER_CHECKLIST.md`.
9. Check mock fixtures with `reports/qa/MOCK_FIXTURE_EXPECTATIONS.md`.
10. Prepare beta messaging with `reports/qa/MOCK_BETA_RELEASE_NOTES.md`.
11. Follow next-day sequencing in `reports/qa/NEXT_WORKDAY_MERGE_PROCEDURE.md`.
12. Run a clean dependency install.
13. Run lint.
14. Run build.
15. Triage failures with `reports/qa/CI_FAILURE_TRIAGE.md`.
16. Execute `ROUTE_SMOKE_CHECKLIST.md` across desktop, tablet, and mobile widths.
17. Assign route/state failures with `reports/qa/ROUTE_OWNER_MATRIX.md`.
18. Execute the P0/P1 items in the state coverage matrices.
19. Update `RELEASE_READINESS.md` with actual results.

## Additional QA Hardening Tasks

1. Confirm every table/list route has an empty state and no-result state.
2. Confirm every lookup/detail route has invalid ID or not-found handling.
3. Confirm QR routes include active, expired, used, canceled, success, and failed states.
4. Confirm risk badges are visible for failed payment, pending refund, settlement hold, low stock, expired QR, blocked tablet access, and critical audit log cases.
5. Confirm filters, search, and sorting are visually stable on dense desktop tables.
6. Confirm mobile customer routes keep primary actions visible at 360px and 430px widths.
7. Confirm tablet mall routes work at 768px portrait and 1024px landscape widths.
8. Confirm mock data has stable IDs, no real customer data, no secrets, and no syntax/encoding errors.
9. Confirm route owners are clear for every smoke route.
10. Confirm CI failure categories have an owner and first action.
11. Confirm segmented route smoke checklists are reconciled with actual merged routes.
12. Confirm Firebase contract documents satisfy `reports/qa/FIREBASE_CONTRACT_VALIDATION_CHECKLIST.md`.
13. Confirm transition checklists remain blockers, not implementation permission.
14. Confirm PR and issue templates are copied to repository-native locations only after approval.
15. Confirm worktree scopes with `reports/qa/WORKTREE_SCOPE_MATRIX.md`.
16. Normalize blocker priorities with `reports/qa/BLOCKER_SEVERITY_MODEL.md`.
17. Record final decision with `reports/qa/FINAL_QA_SIGNOFF_TEMPLATE.md`.
18. Open `/qa/status` after a human starts the local app.
19. Open `/qa/routes`, `/qa/smoke`, and `/qa/handoff` after a human starts the local app.
20. Verify the QA preview hubs across mobile, tablet, and desktop widths.
21. Update `data/qa/statusMock.ts` and `data/qa/routeHubMock.ts` if merged route names or fixture IDs change.

## Batch 51-70 Continuation Queue

| Batch | Task | Exit Criteria |
| --- | --- | --- |
| 51 | Reconcile route smoke files after admin/company/nursery/tablet-qr merge | No stale route names. |
| 52 | Reconcile state matrices after UI merge | P0/P1 gaps have owners. |
| 53 | Reconcile permission matrix with auth claims plan | Role assumptions match contract docs. |
| 54 | Reconcile ledger matrix with mock data files | Stable IDs and snapshots align. |
| 55 | Validate production prohibition checklist | No real integrations or secrets. |
| 56 | Validate Firebase transition gate | Real Firebase remains blocked until approval. |
| 57 | Validate PG transition gate | Real payment/refund remains blocked until approval. |
| 58 | Validate notification/delivery/inventory gates | External APIs remain blocked. |
| 59 | Finalize branch protection recommendations | Team-approved rules documented. |
| 60 | Finalize PR/Issue templates | Templates ready for repo-native move. |
| 61 | Merge track reports into combined status | Missing report blockers filed. |
| 62 | Update release notes with actual smoke results | Draft becomes review-ready. |
| 63 | Update risk register with post-merge findings | All P0/P1 risks owned. |
| 64 | Prepare QA sign-off table | Release decision can be made. |
| 65 | Confirm mobile/tablet viewport evidence | Critical customer flows reviewed. |
| 66 | Confirm desktop dense table evidence | Admin/company/nursery routes reviewed. |
| 67 | Confirm blocked-state UI wording | Mock/test boundary is clear. |
| 68 | Confirm test exclusions are accepted | Out-of-scope items documented. |
| 69 | Confirm human approvals by priority | High approvals assigned. |
| 70 | Update final blocker list | No unowned P0/P1 remains. |
| 81 | Add local browser-visible QA status dashboard | `/qa/status` route exists with mock data only. |
| 82 | Add dashboard route map and state coverage docs | Dashboard has report-level traceability. |
| 83 | Verify dashboard in browser after human-run dev server | Route renders without production services. |
| 84 | Reconcile dashboard counts after final merge | File count and blocker lists match actual merged status. |
| 85 | Add route index preview hub | `/qa/routes` route exists with grouped route cards. |
| 86 | Add visual smoke checklist hub | `/qa/smoke` route exists with review checks. |
| 87 | Add merge handoff hub | `/qa/handoff` route exists with merge order and blockers. |
| 88 | Keep route hub reports in sync | `ROUTE_INDEX.md`, `VISUAL_SMOKE_PLAN.md`, `MERGE_HANDOFF.md` match UI. |

## Before Firebase Work Starts

1. Approve Firestore schema, auth claims, server logic, and adapter split documents.
2. Choose Firebase Emulator usage and dev/prod separation.
3. Decide where secrets live outside the repository.
4. Create rules files only after schema and claim assumptions are approved.
5. Keep mock adapters available for regression testing after real adapters are added.

## Commit Candidate

Commit candidate commands are recorded only in `reports/qa/COMMIT_CANDIDATE.md`.
