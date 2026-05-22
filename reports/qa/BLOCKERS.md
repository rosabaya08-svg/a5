# QA BLOCKERS

## Blockers

| Priority | Blocker | Impact | Recommended Next Step |
| --- | --- | --- | --- |
| P1 | `node_modules/next/dist/docs/` was not available in this worktree during QA document creation. | The project rule says relevant Next.js docs should be read before code changes. This QA track produced docs/workflow only, but workflow details should still be validated after dependencies are present. | After dependencies are installed, review the relevant Next 16 docs and confirm workflow/build assumptions. |
| P1 | Existing `data/mockProducts.ts` appears to contain mojibake and malformed string literals in the current worktree. | A later TypeScript build may fail before QA can evaluate UI routes. | Have the owning mock data/tablet QR track repair product names/categories/options, then run build. |
| P1 | Runtime checks were intentionally not executed. | Lint, build, and route smoke status are unknown. | Run `npm ci`, lint, build, and route smoke checks after all tracks merge. |
| P1 | Track outputs from admin/company/nursery/tablet-qr are not available in this QA worktree yet. | Route smoke checklist may need minor updates if final route IDs or mock data IDs differ. | Reconcile routes and sample IDs after merging each UI track. |
| P1 | Empty/error/risk/filter/search/sort/detail/responsive state coverage is not yet verified against live rendered screens. | The new state matrix defines expected coverage, but actual UI pass/fail status remains unknown until the UI tracks are merged and run. | Execute `reports/qa/STATE_COVERAGE_MATRIX.md` after merging UI tracks. |
| P1 | Access control and data ledger checklists are document-only until the UI and contract tracks merge. | Role boundaries and ledger consistency cannot be fully verified from the QA worktree alone. | Run `reports/qa/ACCESS_CONTROL_CHECKLIST.md` and `reports/qa/DATA_LEDGER_CHECKLIST.md` after merge. |
| P1 | Report merge guide depends on every track producing `AUTO_REPORT.md`, `NEXT_TASKS.md`, and `BLOCKERS.md`. | Missing reports can hide blockers or make release decision unreliable. | Treat missing track reports as P1 blockers during report consolidation. |
| P1 | Stable fixture IDs are assumed by QA documents before all feature tracks merge. | If product, QR, order, company, nursery, room, or tablet IDs change, route smoke checks can become stale. | Validate `reports/qa/MOCK_FIXTURE_EXPECTATIONS.md` after merge and update QA docs if needed. |
| P1 | PR and issue templates are drafts under `reports/qa/` because root `.github` template paths are outside the current allowed scope. | They will not be active GitHub templates until moved by an approved task. | Move to repository-native template paths only after scope approval. |
| P1 | Branch protection recommendations are document-only. | Repository settings are not enforced by this task. | Apply settings manually in GitHub after team approval. |
| P1 | Transition checklists do not grant implementation approval. | Firebase/PG/Storage/notification/delivery/inventory work must remain blocked until human approval. | Treat each transition gate as a blocker until approved. |
| P1 | `/qa/status` dashboard has not been runtime-verified in a browser. | The dashboard files are created, but rendering depends on human-started local app and unresolved existing source issues. | After merge/human start, open `/qa/status` and record result. |
| P1 | `/qa/routes`, `/qa/smoke`, and `/qa/handoff` have not been runtime-verified in a browser. | The preview hub files are created, but rendering depends on human-started local app and unresolved existing source issues. | After merge/human start, open the QA hub routes and record results. |
| P1 | Status dashboard file count is static mock data. | Counts can drift as other tracks merge. | Update `data/qa/statusMock.ts` after final report consolidation. |
| P1 | Route hub data is static mock data. | Route ownership, fixture IDs, and blocker wording can drift as tracks merge. | Update `data/qa/routeHubMock.ts` after final report consolidation. |
| P2 | Mock/test beta release notes are a draft. | Wording should be reviewed before any stakeholder demo. | Review `reports/qa/MOCK_BETA_RELEASE_NOTES.md` after merged route smoke results are known. |
| P2 | Git status and branch state were not validated with git commands during the generation task. | The final change list must be checked by a human before commit. | Run `git status` manually after unattended generation finishes. |

## Decisions Needed

| Decision | Options | Suggested Safe Default |
| --- | --- | --- |
| CI Node version | Node 20 LTS, Node 22 current/LTS depending on org standard | Keep Node 22 unless existing deployment standard requires Node 20. |
| CI trigger branches | `main` and `feat/**`, or also `codex/**` | Add `codex/**` later if Codex branches are pushed directly. |
| Product detail sample ID | Use stable mock product ID from tablet QR data | Current checklist uses `product-care-kit`; update after tablet QR track finalizes mock products. |
| Route smoke execution owner | QA owner, tech lead, or track owners | QA owner runs baseline, track owners fix route-specific failures. |
| State coverage owner | Central QA owner, or each feature track owner | QA owner records pass/fail; feature track owner fixes missing P0/P1 states. |

## Explicit Non-Blockers

- Firebase connection is intentionally out of scope.
- PG payment, refunds, settlements, notifications, shipping lookup, and external inventory APIs are intentionally out of scope.
- Missing production secrets are expected and should not be fixed inside the repository.
