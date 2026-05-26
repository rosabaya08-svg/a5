# QA Release Gate

Last updated: 2026-05-25

## Purpose

This gate checks whether the A5 closed mall beta is safe to move toward Firebase, Cloudflare, and PG integration review.

It does not deploy, does not print secrets, and does not call real PG/Firebase write APIs.

## Commands

```powershell
npm.cmd run check:env
npm.cmd run check:no-secrets
npm.cmd run check:release
npm.cmd run build
```

## Required Environment Presence

The release gate checks that these keys exist in runtime env or local env files without printing values:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Secret Safety Gate

The release gate checks:

- `.env.local` local existence only, with no values printed
- `.env.local` tracked state by reading `.git/index` without running git commands
- `serviceAccountKey.json` existence
- high-risk private key/service account filename patterns

## Required Smoke Routes

- `/`
- `/products`
- `/tablet/products`
- `/tablet/cart`
- `/tablet/qr`
- `/q/[code]`
- `/q/[code]/checkout`
- `/orders/guest`
- `/orders/guest/[orderNo]`
- `/admin/dashboard`
- `/admin/payments`
- `/company/products/new`
- `/company/products/preview`
- `/nursery/dashboard`
- `/mock-ui/status`

## Latest Build Result

- `npm.cmd run check:env`: passed. Required `NEXT_PUBLIC_FIREBASE_*` keys are present. No secret values printed.
- `npm.cmd run check:no-secrets`: passed. `.env.local` exists locally, is not tracked in git index, and `serviceAccountKey.json` is absent.
- `node scripts/check-routes.mjs`: passed. 69 App Router page routes found and all required smoke routes are present.
- `npm.cmd run build`: passed. Static generation completed for 96 routes.
- Build note: Firestore backend access logged `EACCES/UNAVAILABLE` in this execution environment, and the app used the existing mock fallback path.

## Hard Stop Conditions

- Real secret value printed to terminal or report
- `.env.local` tracked by git index
- `serviceAccountKey.json` present
- Real PG approval/cancel/refund call
- Firebase deploy or Cloudflare production deploy without approval
- Firestore write rules/IAM not approved for payment/order paths
# 2026-05-25 Release Gate Update

Run before push:
1. `npm run check:env`
2. `npm run check:no-secrets`
3. `node scripts/check-routes.mjs`
4. `npm run check:release:ready`
5. `npm run lint`
6. `npm run build`
7. `npm --prefix functions run build`

Optional live read smoke:
- `npm run check:firestore-products`

Hard blockers:
- `.env.local` tracked in git.
- service account/private key files.
- PG secret values in repo.
- Real PG/refund/settlement/Alimtalk/delivery/external inventory calls.
- Firebase deploy commands in this phase.
