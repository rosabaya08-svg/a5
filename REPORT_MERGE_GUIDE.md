# Report Merge Guide

## Purpose

This guide explains how to combine `reports/<track>/AUTO_REPORT.md`, `NEXT_TASKS.md`, and `BLOCKERS.md` from all worktrees into one reviewable mock/test beta status package. It is a documentation-only process and does not require Codex to run git, npm, deploy, Firebase, PG, Storage, notification, shipping, or external inventory commands.

## Source Reports

| Track | Source Folder | Required Reports |
| --- | --- | --- |
| firebase-contract | `reports/firebase-contract/` | `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md` |
| qa | `reports/qa/` | `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md` |
| admin | `reports/admin/` | `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md` |
| company | `reports/company/` | `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md` |
| nursery | `reports/nursery/` | `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md` |
| tablet-qr | `reports/tablet-qr/` | `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md` |

## Merge Order

1. Read all `BLOCKERS.md` files first.
2. Promote any P0/P1 blockers to the combined release decision.
3. Read all `AUTO_REPORT.md` files and record created/modified files.
4. Read all `NEXT_TASKS.md` files and deduplicate tasks by owner, route, and integration area.
5. Compare route and state claims against `ROUTE_SMOKE_CHECKLIST.md` and `STATE_COVERAGE_MATRIX.md`.
6. Create a final status summary only after every track has a report or an explicit missing-report blocker.

## BLOCKERS Integration Template

| Priority | Track | Blocker | Evidence | Required Decision | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | TBD | Production secret/config introduced | File path or report line | Remove before merge | TBD | Open |
| P0 | TBD | Real Firebase/PG/deploy integration added | File path or report line | Revert or isolate before beta | TBD | Open |
| P1 | TBD | Build/lint failure | CI/local result | Fix before beta package | TBD | Open |
| P1 | TBD | Route or state smoke failure | Route/state | Assign owning track | TBD | Open |
| P2 | TBD | Visual/responsive issue | Screenshot or route | Fix before external demo | TBD | Open |

See `reports/qa/REPORT_INTEGRATION_REQUIREMENTS.md` for required fields and deduplication rules before creating the combined blocker list.

## AUTO_REPORT Integration Template

| Track | Summary | Files Added | Files Modified | Completed Items | Failed/Skipped Items | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| firebase-contract | TBD | TBD | TBD | TBD | TBD | Docs reviewed |
| qa | TBD | TBD | TBD | TBD | TBD | Docs reviewed |
| admin | TBD | TBD | TBD | TBD | TBD | Pending route smoke |
| company | TBD | TBD | TBD | TBD | TBD | Pending route smoke |
| nursery | TBD | TBD | TBD | TBD | TBD | Pending route smoke |
| tablet-qr | TBD | TBD | TBD | TBD | TBD | Pending route smoke |

## NEXT_TASKS Integration Template

| Horizon | Priority | Track | Task | Owner | Exit Criteria |
| --- | --- | --- | --- | --- | --- |
| 1 day | P0 | TBD | Remove production-blocking issue | TBD | No P0 blockers remain. |
| 1 day | P1 | TBD | Fix build/lint blockers | TBD | Clean build/lint after merge. |
| 3 days | P1 | TBD | Complete route/state smoke fixes | TBD | P0/P1 route and state checks pass. |
| 5 days | P1 | TBD | Prepare Firebase adapter task breakdown | TBD | Contract-to-adapter checklist approved. |
| 10 days | P2 | TBD | Polish responsive and table density issues | TBD | Manual QA ready for external review. |

The detailed 1/3/5/10 day queue lives in `reports/qa/QA_TASK_QUEUE.md`.

## Deduplication Rules

- If the same blocker appears in multiple tracks, keep one combined row and list all affected tracks.
- If a task depends on Firebase, PG, Storage, shipping, notification, or external inventory, keep it blocked until production approval exists.
- If reports disagree on route names or mock IDs, prefer actual routes found after merge and record the mismatch as a QA correction.
- If a track lacks a report file, create a P1 blocker rather than guessing its status.

## Release Decision Format

| Decision | Meaning |
| --- | --- |
| Hold | P0 blockers or unreviewed production-risk changes exist. |
| Mock beta only | No P0 blockers, P1 issues are assigned, and production integrations remain disabled. |
| Ready for next review | Route smoke, state coverage, build, lint, and blocker triage are complete. |
