# Firebase Release Checklist

## Done In Repo
- Firebase client config uses public `NEXT_PUBLIC_FIREBASE_*` values.
- Products read prefers Firestore and falls back to mock data.
- Functions payment endpoints exist for ready, confirm, webhook, cancel, and status.
- Firestore rules are present in repo.
- Storage rules are present in repo.
- Client writes for orders/payments/inventory/audit are blocked in rules.

## Before Production-Like Payment Test
- Deploy updated Firestore rules after owner confirmation.
- Confirm Functions runtime environment variables.
- Confirm PG provider adapter implementation.
- Confirm App Check enforcement plan.
- Confirm Cloudflare environment variables match `.env.local.example`.

## Never Commit
- `.env.local`
- `.env.production`
- service account keys
- private keys
- PG secret keys
- webhook secret values
