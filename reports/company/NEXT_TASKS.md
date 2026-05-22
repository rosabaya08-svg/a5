# Company Track Next Tasks

## Human Verification

1. Run a clean status check from this worktree.
2. Review the changed company track files only.
3. Run build and lint manually when ready.
4. Open the company routes in a browser after a dev server is started manually.

## Suggested Manual Smoke Routes

- `/company`
- `/company/status`
- `/company/route-index`
- `/company/smoke-checklist`
- `/company/risk-center`
- `/company/dashboard`
- `/company/products`
- `/company/products/product-care-kit`
- `/company/products/product-oil`
- `/company/products/detail`
- `/company/products/new`
- `/company/products/wizard`
- `/company/products/rejections`
- `/company/products/price-analysis`
- `/company/inventory`
- `/company/options`
- `/company/inventory/adjustments`
- `/company/inventory/movements`
- `/company/inventory/external-mapping`
- `/company/external-inventory`
- `/company/inventory/external-sync-logs`
- `/company/inventory/options/product-generated-7-opt-basic`
- `/company/orders`
- `/company/orders/A5-20260520-007`
- `/company/orders/detail`
- `/company/deliveries`
- `/company/delivery`
- `/company/pickups`
- `/company/pickups/pickup-002-ready`
- `/company/sales`
- `/company/payouts`
- `/company/settlements`
- `/company/payouts/settlement-202605-w3`
- `/company/refunds`
- `/company/refunds/refund-006`
- `/company/users`
- `/company/mobile-ops`
- `/company/profile`
- `/company/notifications`
- `/company/audit-logs`
- `/company/search`

## Follow-Up Implementation

- Confirm whether `company_sanho_luxury_001` remains the beta company_id or should be selected from authenticated claims later.
- Confirm dynamic route behavior against the installed Next.js docs once `node_modules/next/dist/docs/` is available.
- Decide whether product/order detail URLs should use internal ids or public slugs/order numbers.
- Decide whether `needs_reapproval` is owned by company users, admin users, or a server-side approval workflow.
- Decide the final movement enum names before Firebase schema work, because this mock includes both legacy and requested movement labels.
- Decide final external inventory mapping fields and whether external product ids are public enough to show to COMPANY_ADMIN users.
- Decide whether pickup completion is company-owned, nursery-owned, or requires both parties.
- Decide whether compact mobile operations should be a separate route or a responsive variant of the main dashboard.
- Decide whether generated mock rows should remain deterministic Array.from data or become explicit seed records.
- Decide whether route count should be reduced before beta if the sidebar becomes too dense.
- Open `/company/status` in browser after a dev server is available and visually inspect responsive cards.
- Open `/company/route-index` and `/company/smoke-checklist` after a dev server is available.
- Confirm each preview card in `CompanyRoutePreviewGrid` reaches an existing mock route.
- Compare `STATUS_SUMMARY.md` against `ROUTE_MAP.md` after the next route expansion.
- Replace read-only mock controls with client actions only after Firebase repository interfaces are finalized.
- Connect product image upload only after Storage policy and bucket path rules are approved.
- Connect external inventory sync only after external API contract, rate limits, and retry policy are approved.
- Connect delivery tracking only after carrier API and notification policy are approved.
- Connect refund and payout actions only after PG, settlement, audit log, and permission gates are approved.

## Merge Notes

- This track intentionally avoids common reports and unrelated track folders.
- Merge after `firebase-contract` and `qa` if those tracks define final contracts or checklists.
- Expected merge paths:
  - `app/company/**`
  - `components/company/**`
  - `components/pages/companyPages.tsx`
  - `data/company/**`
  - `types/company.ts`
  - `reports/company/**`
