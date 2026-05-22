# Route Owner Matrix

## Purpose

This matrix maps smoke-test routes to the owning worktree track. Use it for route smoke failures, state coverage failures, and CI triage after merge.

| Route | Owner Track | Secondary Track | Critical States |
| --- | --- | --- | --- |
| `/` | tablet-qr | qa | `normal`, `mock_ready`, `production_blocked` |
| `/admin/dashboard` | admin | qa | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` |
| `/admin/companies` | admin | firebase-contract | `empty`, `error`, `risk`, `blocked`, `mock_ready` |
| `/admin/nurseries` | admin | nursery | `empty`, `error`, `risk`, `mock_ready` |
| `/admin/products` | admin | company | `empty`, `error`, `risk`, `blocked`, `mock_ready` |
| `/admin/orders` | admin | tablet-qr | `empty`, `error`, `risk`, `production_blocked` |
| `/admin/payments` | admin | firebase-contract | `empty`, `error`, `risk`, `blocked`, `production_blocked` |
| `/admin/settlements` | admin | company | `empty`, `error`, `risk`, `blocked`, `production_blocked` |
| `/admin/audit-logs` | admin | firebase-contract | `empty`, `error`, `risk`, `normal` |
| `/company` | company | qa | `normal`, `mock_ready`, `production_blocked` |
| `/company/dashboard` | company | qa | `empty`, `error`, `risk`, `mock_ready` |
| `/company/products` | company | admin | `empty`, `error`, `risk`, `blocked`, `mock_ready` |
| `/company/products/new` | company | firebase-contract | `empty`, `error`, `blocked`, `mock_ready` |
| `/company/inventory` | company | firebase-contract | `empty`, `error`, `risk`, `blocked`, `production_blocked` |
| `/company/orders` | company | tablet-qr | `empty`, `error`, `risk`, `mock_ready` |
| `/company/deliveries` | company | firebase-contract | `empty`, `error`, `blocked`, `production_blocked` |
| `/company/payouts` | company | firebase-contract | `empty`, `error`, `risk`, `blocked`, `production_blocked` |
| `/company/sales` | company | qa | `empty`, `normal`, `risk`, `mock_ready` |
| `/nursery` | nursery | qa | `normal`, `mock_ready`, `production_blocked` |
| `/nursery/dashboard` | nursery | qa | `empty`, `error`, `risk`, `mock_ready` |
| `/nursery/rooms` | nursery | admin | `empty`, `error`, `risk`, `mock_ready` |
| `/nursery/tablets` | nursery | tablet-qr | `empty`, `error`, `risk`, `blocked`, `mock_ready` |
| `/nursery/pickups` | nursery | company | `empty`, `error`, `risk`, `mock_ready` |
| `/nursery/qr-history` | nursery | tablet-qr | `empty`, `error`, `risk`, `mock_ready` |
| `/nursery/orders` | nursery | tablet-qr | `empty`, `error`, `risk`, `mock_ready` |
| `/tablet/products` | tablet-qr | company | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` |
| `/tablet/products/product-care-kit` | tablet-qr | company | `error`, `normal`, `risk`, `mock_ready` |
| `/tablet/cart` | tablet-qr | qa | `empty`, `error`, `normal`, `risk`, `mock_ready`, `production_blocked` |
| `/tablet/qr` | tablet-qr | firebase-contract | `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` |
| `/tablet/ask` | tablet-qr | qa | `error`, `normal`, `blocked`, `mock_ready` |
| `/q/SANHO701` | tablet-qr | firebase-contract | `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` |
| `/q/SANHO701/checkout` | tablet-qr | firebase-contract | `error`, `normal`, `risk`, `blocked`, `production_blocked` |
| `/q/SANHO701/success` | tablet-qr | company | `normal`, `mock_ready`, `production_blocked` |
| `/q/SANHO701/failed` | tablet-qr | firebase-contract | `error`, `risk`, `blocked`, `production_blocked` |
| `/orders/guest` | tablet-qr | qa | `empty`, `error`, `normal`, `mock_ready`, `production_blocked` |
| `/orders/guest/A5-20260519-001` | tablet-qr | company | `error`, `normal`, `risk`, `mock_ready`, `production_blocked` |

