# Admin Track Blockers

## Verification Blockers

- `node_modules/next/dist/docs` was not present in this worktree, so the AGENTS.md Next.js documentation check could not be completed before editing.
- `npm run build` and `npm run lint` were intentionally not run because the task explicitly forbids build and lint commands.
- No browser/dev-server verification was run because command execution for build/run style validation is outside this unattended file-generation mode.
- `/admin/status` was created but not opened in a browser because dev server/browser smoke was not run in this unattended mode.
- `/admin/status` preview hub links were created but not clicked in a live browser because dev-server/browser smoke is still blocked by unattended command restrictions.
- `/admin/delivery` and `/admin/risk-center` were added as mock alias routes, but live visual confirmation still requires browser smoke.
- Dynamic admin detail routes were not created because the local Next.js docs directory is missing and build/lint verification is forbidden in this mode. Static `/detail` mock routes were used instead.
- Search, filters, sorting, pagination, and tabs are static UI mocks only because no repository/query layer is approved in this track.

## Existing Repository Risks

- Several shared mock files outside the admin scope appear to contain mojibake text and broken string literals. This admin track did not modify them because the instruction limits work to the current admin scope.
- Existing layout/sidebar text outside the admin scope still contains mojibake copy. This track left it unchanged to avoid cross-track conflicts.
- Full mobile sidebar behavior likely requires shared layout changes outside the admin allowed scope. This track only improved responsive grids inside admin-owned components.

## Product / Platform Blockers

### High

- Real Firebase, Firestore/Auth, and custom claims are blocked until the firebase-contract track finalizes schema, claims, and rules.
- Real PG payment, refund, cancellation, and settlement execution are blocked until contracts, keys, test MID, production MID, and human approval gates are complete.
- Refund/cancel approval requires a real PG ledger, cancellation API contract, and settlement reconciliation design.
- Storage Blaze and Firestore Rules decisions remain outside this admin UI track.

### Medium

- Real delivery lookup, notification, and external inventory APIs are blocked until adapter ownership and credentials are approved.
- Full customer privacy handling for guest payer data needs a separate privacy/security review before production storage.
- QR source enforcement needs server-side validation before production checkout can trust `nursery_id + room_id + tablet_id`.
- External integrations require official docs, credentials, templates, and adapter tests before any live calls are allowed.

### Low

- Static search, sorting, pagination, tab, and detail pages need route smoke after build/lint are allowed.
- Scale mock data uses generated sample names and should be reconciled with final seed data later.

## Decision Items Recorded Without Question

- Used admin-scoped mock data in `data/admin/mockAdminData.ts` instead of shared `mockApi` because shared mock files are currently unsafe to import.
- Used static mock controls and notices instead of client-side mutation controls.
- Used English ASCII UI labels to avoid worsening the existing text encoding problems in this worktree.
- Added `/admin/qr-sources` as an admin-only mock route because QR provenance needs a dedicated review screen.
- Added static detail mock pages for company, nursery, product, and order review instead of asking for routing decisions.
- Added refund, integration, and operation risk pages as mock-only admin routes.
- Chose static pagination/filter/search UI to avoid inventing unapproved query behavior.
- Added static detail routes for payment, refund, settlement, notification, delivery, inventory, search, and audit-log review.
- Added a route preview hub under `/admin/status` instead of changing shared app navigation outside the admin scope.
- Added preferred alias routes for delivery and risk center to match visual smoke naming while preserving existing legacy routes.
