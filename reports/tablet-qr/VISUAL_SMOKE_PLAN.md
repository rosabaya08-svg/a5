# tablet-qr VISUAL_SMOKE_PLAN

## Goal

Use `/tablet/status` as the first browser page for visual review. Open every route card and confirm that each route clearly shows mock/test beta, Firebase none, and PG mock-only safety cues.

## Smoke Order

1. `/tablet/status`
2. `/tablet`
3. `/tablet/products`
4. `/tablet/products/product-care-kit`
5. `/tablet/cart`
6. `/tablet/ask`
7. `/tablet/qr`
8. `/q/SANHO701`
9. `/q/SANHO701/checkout`
10. `/q/SANHO701/loading`
11. `/q/SANHO701/success`
12. `/q/SANHO701/failed`
13. `/q/SANHO701/expired`
14. `/q/OLDQR22/status`
15. `/q/USED701/status`
16. `/q/VOID1234/status`
17. `/q/CANCEL77/status`
18. `/orders/guest`
19. `/orders/guest/A5-20260519-001`
20. `/orders/guest/A5-20260519-001/refund`

## Visual Checks

- Header safety badges are visible on tablet and guest/customer pages.
- Route cards do not overflow on mobile width.
- Large tablet buttons remain easy to tap.
- Checkout/expired/failed/refund routes do not imply real payment or refund.
- Empty, loading, error, risk, blocked, and review states are visually distinct.

## Blocked Verification

- Browser execution, screenshots, and runtime route verification remain pending because `node_modules` is absent and `next` cannot run.
- `npm.cmd run dev` failed with `next is not recognized as an internal or external command`.
- `npm.cmd run build` failed with `next is not recognized as an internal or external command`.
- See `reports/tablet-qr/BROWSER_CHECK_RESULT.md`.
