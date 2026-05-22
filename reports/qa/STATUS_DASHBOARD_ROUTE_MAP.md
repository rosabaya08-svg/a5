# QA Status Dashboard Route Map

## Dashboard Route

| Route | File | Purpose |
| --- | --- | --- |
| `/qa/status` | `app/qa/status/page.tsx` | Browser-visible QA progress dashboard for this worktree. |

## Linked Smoke Routes

| Route | Owner | Purpose | Status Source |
| --- | --- | --- | --- |
| `/` | tablet-qr + qa | Entry route and mock beta navigation. | `ROUTE_SMOKE_CHECKLIST.md` |
| `/admin/dashboard` | admin | Super admin KPIs and risk alerts. | `reports/qa/ROUTE_SMOKE_ADMIN.md` |
| `/company` | company | Company admin entry and scoped dashboard. | `reports/qa/ROUTE_SMOKE_COMPANY.md` |
| `/nursery` | nursery | Nursery admin entry and scoped dashboard. | `reports/qa/ROUTE_SMOKE_NURSERY.md` |
| `/tablet/products` | tablet-qr | Tablet product browsing. | `reports/qa/ROUTE_SMOKE_TABLET_QR.md` |
| `/tablet/cart` | tablet-qr | Cart and QR pre-check. | `reports/qa/ROUTE_SMOKE_TABLET_QR.md` |
| `/tablet/qr` | tablet-qr | Buy QR and ask-to-pay QR handoff. | `reports/qa/ROUTE_SMOKE_TABLET_QR.md` |
| `/q/SANHO701` | tablet-qr | Customer QR landing. | `reports/qa/ROUTE_SMOKE_TABLET_QR.md` |
| `/orders/guest/A5-20260519-001` | tablet-qr | Guest order detail and mock refund request. | `reports/qa/ROUTE_SMOKE_TABLET_QR.md` |

## Notes

- The dashboard links are static anchors and do not call real services.
- A route link failing at runtime should be recorded as a route smoke blocker after human-run local verification.
- The dashboard itself should be smoke-tested at desktop, tablet, and mobile widths after the local app is started by a human.

