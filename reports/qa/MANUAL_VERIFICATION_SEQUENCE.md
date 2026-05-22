# Manual Verification Sequence

## Purpose

This is the human-run sequence for the next review day. It documents commands conceptually but does not ask unattended Codex to run them.

## Sequence

1. Confirm each worktree folder is the intended track.
2. Check worktree status.
3. Review changed files and diffs.
4. Confirm changes stay inside allowed paths.
5. Read each track's `AUTO_REPORT.md`, `NEXT_TASKS.md`, and `BLOCKERS.md`.
6. Merge or PR in this order:
   - `firebase-contract`
   - `qa`
   - `admin`
   - `company`
   - `nursery`
   - `tablet-qr`
7. After merge target is ready, run clean dependency install.
8. Run lint.
9. Run build.
10. Run route smoke checklists.
11. Run state, permission, data ledger, and production prohibition checklists.
12. Commit reviewed track changes.
13. Push reviewed branches.
14. Open PRs or merge in the planned order.
15. Update release readiness and combined blockers.

## Evidence To Capture

| Evidence | Where To Record |
| --- | --- |
| Build/lint result | `RELEASE_READINESS.md` or combined QA report |
| Route smoke result | `ROUTE_SMOKE_CHECKLIST.md` and segmented route reports |
| State failures | `STATE_COVERAGE_MATRIX.md` and combined blockers |
| Production safety failures | Combined blockers as P0 |
| Merge conflicts | `MERGE_PLAN.md` notes and owning track report |

