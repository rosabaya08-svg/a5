# Company Route Map

## Core

- `/company`
- `/company/status`
- `/company/route-index`
- `/company/smoke-checklist`
- `/company/risk-center`
- `/company/dashboard`
- `/company/mobile-ops`
- `/company/search`

## Products

- `/company/products`
- `/company/products/new`
- `/company/products/wizard`
- `/company/products/rejections`
- `/company/products/price-analysis`
- `/company/products/[id]`
- `/company/products/detail`
- `/company/options`

## Inventory

- `/company/inventory`
- `/company/inventory/adjustments`
- `/company/inventory/movements`
- `/company/inventory/external-mapping`
- `/company/external-inventory`
- `/company/inventory/external-sync-logs`
- `/company/inventory/options/[optionId]`

## Orders And Fulfillment

- `/company/orders`
- `/company/orders/[orderNo]`
- `/company/orders/detail`
- `/company/deliveries`
- `/company/delivery`
- `/company/pickups`
- `/company/pickups/[pickupId]`

## Money

- `/company/sales`
- `/company/payouts`
- `/company/payouts/[settlementId]`
- `/company/settlements`
- `/company/refunds`
- `/company/refunds/[refundId]`

## Company Operations

- `/company/users`
- `/company/profile`
- `/company/notifications`
- `/company/audit-logs`

## Notes

- All routes are mock/test beta only.
- All routes are scoped to `company_id: company_sanho_luxury_001`.
- No route connects to Firebase, PG, Storage, delivery tracking, Alimtalk, payout, or external inventory APIs.
