# Admin Route Smoke Checklist

## Scope

Owner track: `admin`

This checklist is for super-admin mock/test beta screens only. It does not approve real Firebase, PG, refund, settlement, payout, notification, delivery lookup, or external inventory actions.

## Routes

| Route | Desktop | Mobile Smoke | Required States | Required Controls | Notes |
| --- | --- | --- | --- | --- | --- |
| `/admin` | [ ] | [ ] | `normal`, `mock_ready`, `production_blocked` | Sidebar/topbar navigation | Entry can redirect or render dashboard if documented. |
| `/admin/dashboard` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Period/status filter | KPI cards for orders, QR, payments, refunds, settlements, risk logs. |
| `/admin/companies` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready` | Approval/status filter, search, sort | Company detail tabs and masked settlement account. |
| `/admin/nurseries` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Region/status filter, search, sort | Nursery, room, tablet identifiers visible. |
| `/admin/products` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready` | Company/status/category filter, search, sort | Approval pending, approved, rejected, rejection reason. |
| `/admin/orders` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `production_blocked` | Status/date filter, order search, amount/date sort | Order item snapshots and mock payment state. |
| `/admin/payments` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Payment/refund/date filters | No live PG, refund, or settlement execution. |
| `/admin/settlements` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Company/status/date filter, amount sort | Account values masked; payout disabled. |
| `/admin/audit-logs` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk` | Severity/date/actor filters, entity search | Critical logs require visible risk badge. |

## Required Failure Notes

- Record missing route, route crash, or state gap in combined blockers.
- If a live integration button appears, classify as P0 production-safety blocker.
- If dense table text overlaps on desktop, classify as P2 unless it blocks primary action.

