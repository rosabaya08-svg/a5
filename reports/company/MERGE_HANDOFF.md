# Company Merge Handoff

## Scope

This worktree owns company Admin mock/test beta surfaces only.

## Safe Merge Paths

- `app/company/**`
- `components/company/**`
- `components/pages/companyPages.tsx`
- `data/company/**`
- `types/company.ts`
- `reports/company/**`

## Primary Browser Entry Points

- `/company/status`
- `/company/route-index`
- `/company/smoke-checklist`
- `/company/risk-center`

## Integration Blockers

- Firebase is not connected.
- Firebase Auth and Custom Claims are not connected.
- Storage upload is on hold because of Spark/storage decision.
- PG payment, refund, and partial cancel are not connected.
- Real payout is blocked.
- Alimtalk/SMS/email send is blocked.
- Delivery tracking API is blocked.
- External inventory API is blocked.

## Merge Notes

- Route aliases were added for visual smoke convenience:
  - `/company/products/detail`
  - `/company/orders/detail`
  - `/company/external-inventory`
  - `/company/delivery`
  - `/company/settlements`
- Dynamic detail routes still exist for richer mock checks.
- `company_id: company_sanho_luxury_001` is a mock visual context and must be reconciled with Auth claims before production.
