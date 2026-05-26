# Firestore Rules Deploy Plan

## Current Beta Direction
- Project: `a5-closed-mall`
- Client read is allowed only for public active commerce content and role-scoped admin data.
- Client write is blocked for server-owned commerce ledgers:
  - `orders`
  - `order_items`
  - `payments`
  - `payment_events`
  - `inventory_movements`
  - `audit_logs`
- Those collections must be written by Firebase Functions Admin SDK transaction only.

## Deploy Command Candidate
Do not run automatically without owner confirmation:

```powershell
firebase.cmd deploy --only firestore:rules
```

## Before Deploy
- Confirm Firebase Auth Custom Claims are assigned for `SUPER_ADMIN`, `COMPANY_ADMIN`, `NURSERY_ADMIN`, `TABLET_DEVICE`, and `seed_admin`.
- Confirm product/CMS seed records use `status`, `created_at`, and `updated_at`.
- Confirm checkout uses Functions endpoints, not direct client writes.

## Still Blocked
- Real PG webhook signature verification.
- Real refund/cancel provider API.
- Real settlement payout.
