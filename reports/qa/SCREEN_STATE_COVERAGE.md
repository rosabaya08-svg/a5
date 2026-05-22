# Screen State Coverage

## Purpose

This document expands state coverage by screen family for batches 22 and 51-70. The authoritative state names are `empty`, `loading`, `error`, `normal`, `risk`, `blocked`, `mock_ready`, and `production_blocked`.

| Screen Family | Empty | Loading | Error | Normal | Risk | Blocked | Mock Ready | Production Blocked |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admin dashboard | No KPI rows | Skeleton cards | Mock data load failure | KPI cards | Risk log present | Live operation blocked | Dashboard reviewable | No real ops |
| Admin list/table | No rows/no search result | Table skeleton | Invalid filter | Rows render | Critical badge | Approval/action blocked | Detail view opens | Real payout/refund disabled |
| Company products | No products | Form/list loading | Invalid product | Products render | Low stock/rejected | Storage upload blocked | Draft/pending flow reviewable | No real upload |
| Company inventory | No movements | Movement loading | External code mismatch | Inventory rows render | Low stock | External API blocked | Movement history reviewable | No live inventory API |
| Nursery rooms/tablets | No rooms/tablets | Loading list | Duplicate room/tablet error | Rows render | Stale tablet | Browser access blocked | Room/tablet detail reviewable | No real device provisioning |
| Nursery pickups/orders | No pickup/order | Loading list | Lookup failure | Rows render | Pickup delayed | Notification blocked | Pickup state reviewable | No live notification |
| Tablet product list | No products | Card skeleton | Missing product data | Cards render | Low stock | Purchase blocked | Browsing reviewable | No live inventory |
| Tablet product detail | Missing product | Gallery loading | Invalid product ID | Detail renders | Low stock | Option unavailable | Cart handoff reviewable | No live checkout |
| Cart/QR generation | Empty cart | QR creating mock | Stock or QR failure | Cart/QR ready | Expiring QR | PG blocked | QR mock reviewable | No live PG |
| Customer QR landing | Invalid code/no items | Session loading | Expired/used/invalid | Session render | Near expiry | Session blocked | Checkout handoff reviewable | No live payment |
| Checkout | Missing payer fields | Payment processing mock | Mock payment failure | Confirmation ready | Expired during checkout | Bank transfer blocked | Mock payment reviewable | No live PG |
| Guest order lookup | No matches | Lookup loading | Phone/order mismatch | Result list/detail | Refund requested | Refund blocked | Lookup reviewable | No live refund |

## Recording Template

| Screen | Missing State | Severity | Owner Track | Required Fix |
| --- | --- | --- | --- | --- |
| TBD | TBD | P0/P1/P2 | TBD | TBD |

