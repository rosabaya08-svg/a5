# my-app merge handoff

This handoff is for merging parallel worktree outputs back into main after manual review. It does not approve production launch or live integration.

## Before merge

1. Confirm each worktree is reviewed from its own folder.
2. Confirm no worktree created forbidden files:
   - `.env`
   - `.env.*`
   - `firebase.json`
   - `.firebaserc`
   - `firestore.rules`
   - `storage.rules`
   - service account files
   - private key files
   - real PG key files

3. Confirm no worktree imported Firebase SDK without explicit approval:
   - `firebase/app`
   - `firebase/firestore`
   - `firebase/auth`

4. Confirm no worktree implemented live PG, refund, settlement, Alimtalk, delivery tracking, external inventory, or deployment logic.

## Suggested review order

1. `my-app-firebase-contract`
   - Review Firebase schema, claims, functions, blockers, and seed/adapter contracts.

2. `my-app-qa`
   - Review smoke checklist, merge plan, release readiness, and route coverage.

3. `my-app-admin`
   - Review admin mock UI pages and ensure no live actions exist.

4. `my-app-company`
   - Review company Admin product/inventory/order/payout mock screens.

5. `my-app-nursery`
   - Review nursery room/tablet/pickup/QR history mock screens.

6. `my-app-tablet-qr`
   - Review tablet, QR, checkout, and guest order UI last because it is most likely to touch shared mock data and customer-facing routes.

7. `my-app`
   - Review localhost:3000 launcher, route index, status dashboard, and reports.

## Port guide

| Track | Folder | Port |
| --- | --- | --- |
| admin | `my-app-admin` | 3001 |
| company | `my-app-company` | 3002 |
| nursery | `my-app-nursery` | 3003 |
| tablet-qr | `my-app-tablet-qr` | 3004 |
| firebase-contract | `my-app-firebase-contract` | 3005 |
| qa | `my-app-qa` | 3006 |
| my-app | `my-app` | 3000 |

## Main worktree checks

1. Review `/` on `localhost:3000`.
2. Review `/mock-ui/status`.
3. Review `/mock-ui/smoke`.
4. Review `/mock-ui/merge`.
5. Review `reports/my-app/ROUTE_INDEX.md`.
6. Review `reports/my-app/VISUAL_SMOKE_PLAN.md`.
7. Review `reports/my-app/BLOCKERS.md`.
8. Run manual lint only after review.
9. Run manual build only after lint.
10. Stage and commit only after manual verification.

## Keep blocked until separate approval

- Firebase config and SDK import
- Firestore/Auth live connection
- Firebase Storage upload
- PG approval/cancel/refund
- Real settlement/payout
- Alimtalk sending
- Delivery tracking API
- External inventory API
- Production deployment
