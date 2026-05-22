# Next Workday Merge Procedure

## Purpose

This procedure is for the next human review window after unattended worktree generation finishes. It documents the intended sequence without asking Codex to run git, npm, build, lint, deploy, Firebase, PG, or secret-related commands during generation.

## Per-Worktree Review

For each worktree:

1. Confirm the worktree path is the intended project folder.
2. Check changed files.
3. Confirm changed files stay inside the track's allowed paths.
4. Read `reports/<track>/AUTO_REPORT.md`.
5. Read `reports/<track>/BLOCKERS.md`.
6. Confirm no prohibited files were created:
   - `.env`
   - `firebase.json`
   - `.firebaserc`
   - `firestore.rules`
   - `storage.rules`
   - service account files
   - private key files
   - secret material
7. Confirm no real Firebase, PG, refund, settlement, notification, shipping, or external inventory integration was added.

## Commit Sequence

Use one commit per track after human review:

| Order | Track | Suggested Commit Theme |
| --- | --- | --- |
| 1 | firebase-contract | `docs: expand firebase contract planning` |
| 2 | qa | `docs: add qa mock beta gate` |
| 3 | admin | `feat: expand admin mock management screens` |
| 4 | company | `feat: expand company admin mock screens` |
| 5 | nursery | `feat: expand nursery admin mock screens` |
| 6 | tablet-qr | `feat: expand tablet qr mock flow` |

## Push And PR/Merge Sequence

1. Push each reviewed track branch.
2. Open PRs or merge in this order:
   - `firebase-contract`
   - `qa`
   - `admin`
   - `company`
   - `nursery`
   - `tablet-qr`
3. Resolve conflicts using `MERGE_PLAN.md`.
4. Combine reports using `REPORT_MERGE_GUIDE.md`.
5. Run clean install/lint/build only after the merge target is ready for human validation.
6. Run `ROUTE_SMOKE_CHECKLIST.md`.
7. Run `STATE_COVERAGE_MATRIX.md`.
8. Update `RELEASE_READINESS.md` with actual results.

## Stop Conditions

Stop merge and create a P0/P1 blocker if:

- Production credentials or secret-looking files appear.
- Firebase config or rules files appear before approval.
- Live PG/payment/refund/settlement behavior appears.
- A track modifies broad shared files outside its allowed scope.
- Build/lint failure blocks all route smoke checks.
- Customer QR or guest order routes are unusable on mobile.

