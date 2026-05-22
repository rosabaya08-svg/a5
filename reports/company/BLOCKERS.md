# Company Track Blockers

## Required By Local Instructions

- `node_modules/next/dist/docs/` does not exist in this worktree, so the required local Next.js guide could not be read.
- No `npm install` was run because package installation is forbidden for this unattended mode.
- Dynamic route props for `/company/products/[id]` and `/company/orders/[orderNo]` should be checked against the installed Next.js guide before release.
- Dynamic route props for newly added detail routes should also be checked once the local Next.js docs are available.
- `/company/status` browser verification is blocked until a dev server is available; no `npm install`, build, or lint was run.
- `/company/route-index` and `/company/smoke-checklist` visual verification are blocked until a dev server is available.

## Commands Intentionally Not Run

- `npm run build`
- `npm run lint`
- `npm run dev`
- `git add`
- `git commit`
- `git push`
- Any deploy command

## Integration Blockers

- Final `company_id` source is blocked until Auth Custom Claims or admin-selected company scope is finalized.
- Product and order detail URL identifiers are blocked pending a decision on public slug versus internal document id.
- `needs_reapproval` ownership is blocked pending final admin/company approval workflow.
- Inventory movement enum naming is blocked pending Firestore schema finalization.
- External inventory mapping fields are blocked pending external mall API contract and data exposure policy.
- Pickup completion ownership is blocked pending company versus nursery operational process.
- Mobile operations action design is blocked pending whether this is a separate route or responsive dashboard mode.
- Generated mock data strategy is blocked pending whether beta seed data should be explicit records or deterministic generated records.
- Dense company sidebar/navigation is blocked pending final beta information architecture review.
- Status dashboard generated file count is a curated local mock count and should be reconciled with real file inventory before release.
- `company_sanho_luxury_001` is a visual mock company_id and must be reconciled with final Auth Custom Claims.
- Firebase repository connection is blocked until the Firebase contract track finalizes repository interfaces and security rules.
- Firebase Storage image/GIF upload is blocked until bucket paths, rules, and upload policy are approved.
- External luxury mall inventory sync is blocked until API credentials, mapping contract, retry policy, and rate limits are approved.
- Delivery tracking is blocked until carrier API and notification policy are approved.
- PG refund, partial cancel, settlement confirmation, and payout execution are blocked until payment provider, audit log, and admin approval gates are finalized.
- Real payout execution remains blocked and is represented only by `blocked_real_payout`.
- COMPANY_ADMIN Auth and Custom Claims are blocked until Firebase Auth contracts are finalized.

## Review Notes

- Some pre-existing shared files display mojibake or suspicious text encoding in terminal output. This track did not modify shared status, mock API, admin, nursery, tablet, or global layout files.
- Build/lint verification was intentionally skipped by instruction, so TypeScript and route compilation still require a later human-run gate.
