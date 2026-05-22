# Company Visual Smoke Plan

## Preconditions

- Do not run build or lint in unattended mode.
- Start a local dev server manually only when allowed.
- Open `/company/status` first.

## Smoke Steps

1. Confirm the hero says mock/test beta and not production.
2. Confirm company_id is visible as `company_sanho_luxury_001`.
3. Confirm progress cards render on desktop and mobile widths.
4. Confirm all connection states show blocked/mock only.
5. Open every route card in the preview grid.
6. Confirm route pages show company Admin context.
7. Confirm Product Detail and Order Detail alias routes open without requiring user input.
8. Confirm Risk Center lists Storage, PG, delivery, and external inventory blockers.
9. Confirm Smoke Checklist route lists every route and expected coverage.
10. Confirm no page suggests real Firebase, PG, payout, delivery tracking, Alimtalk, or external inventory API is connected.

## Required Smoke Routes

- `/company/status`
- `/company/route-index`
- `/company/smoke-checklist`
- `/company/risk-center`
- `/company/products/detail`
- `/company/orders/detail`
- `/company/external-inventory`
- `/company/delivery`
- `/company/settlements`

## Result Recording

- Record pass/fail manually in the next QA pass.
- Do not edit shared root reports from this worktree.
