# Tablet QR Route Smoke Checklist

## Scope

Owner track: `tablet-qr`

This checklist validates tablet closed-mall, QR checkout, ask-to-pay, and guest order lookup mock/test beta flows. It does not approve real Firebase repository imports, Firestore/Auth, PG, refund, delivery lookup, notification, or external inventory integration.

## Tablet Routes

| Route | Tablet | Mobile | Required States | Required Controls | Notes |
| --- | --- | --- | --- | --- | --- |
| `/tablet/products` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready` | Category, price, stock, fulfillment filters; search/sort | Large touch cards and readable price comparison. |
| `/tablet/products/product-care-kit` | [ ] | [ ] | `error`, `normal`, `risk`, `mock_ready` | Option selection, quantity, fulfillment entry | Placeholder gallery, stock, refund note. |
| `/tablet/cart` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `risk`, `mock_ready`, `production_blocked` | Quantity controls, fulfillment selector | Sold-out/low-stock warnings and QR pre-check. |
| `/tablet/qr` | [ ] | [ ] | `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Buy QR vs ask-to-pay QR | Short code, expiration, room/tablet IDs. |
| `/tablet/ask` | [ ] | [ ] | `error`, `normal`, `blocked`, `mock_ready` | Payer handoff mock | No real personal data storage. |

## Customer QR Routes

| Route | Mobile 360 | Mobile 430 | Required States | Required Controls | Notes |
| --- | --- | --- | --- | --- | --- |
| `/q/SANHO701` | [ ] | [ ] | `loading`, `error`, `normal`, `risk`, `blocked`, `production_blocked` | Product summary, fulfillment, expiration | Invalid/expired/used variants must be reachable or documented. |
| `/q/SANHO701/checkout` | [ ] | [ ] | `error`, `normal`, `risk`, `blocked`, `production_blocked` | Mock payment method, payer info validation | Card/quick pay mock only; bank transfer blocked. |
| `/q/SANHO701/success` | [ ] | [ ] | `normal`, `mock_ready`, `production_blocked` | Result actions | Mock order number visible. |
| `/q/SANHO701/failed` | [ ] | [ ] | `error`, `risk`, `blocked`, `production_blocked` | Retry/back actions | Failure reason must be clear. |

## Guest Lookup Routes

| Route | Mobile 360 | Mobile 430 | Required States | Required Controls | Notes |
| --- | --- | --- | --- | --- | --- |
| `/orders/guest` | [ ] | [ ] | `empty`, `loading`, `error`, `normal`, `mock_ready`, `production_blocked` | Order number/phone mock fields | Mismatch and no-order states required. |
| `/orders/guest/A5-20260519-001` | [ ] | [ ] | `error`, `normal`, `risk`, `mock_ready`, `production_blocked` | Refund request mock, detail tabs | Delivery and pickup timelines required. |

## Required Failure Notes

- Any Firebase SDK or live PG import in this flow is P0.
- Hidden primary action at 360px is P1.
- Missing sample IDs `product-care-kit`, `SANHO701`, or `A5-20260519-001` is P1 unless all QA docs are updated together.

