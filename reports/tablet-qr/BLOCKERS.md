# tablet-qr BLOCKERS

## Blocked By Instruction

- `npm run build` was not run.
- `npm run lint` was not run.
- `git status`, `git add`, `git commit`, and `git push` were not run.
- No package install command was run.
- No Firebase, Firestore, Auth, Storage, PG, refund, settlement, notification, delivery tracking, or external inventory API was connected.
- `npm.cmd run build` was attempted after the latest instruction, but it failed because the local `next` executable is missing.

## Environment Blockers

- `node_modules/next/dist/docs/` was not present in this worktree, so the AGENTS.md request to read local Next.js docs could not be completed.
- `node_modules` is not present in this worktree.
- `next` is not available at `node_modules/.bin/next`, so `npm.cmd run dev` and `npm.cmd run build` cannot run until dependencies are restored.
- TypeScript and Next.js validation remains pending because the local `next` executable is unavailable.
- Visual browser verification was not completed because the dev server could not start without `next`.
- Search, filter, and sort controls are static UI only. Real query handling needs server/data-layer approval.
- Summary grids and route matrices are mock QA aids. They are not permission-gated and should be reviewed before a public beta.
- `/q/[code]/status` is a mock state route only and does not validate real QR ownership, expiry, or payment records.
- Runtime-generated bulk data is used for the 30+ QR/order/payment cases. Simple text search counts do not represent runtime record counts.
- `/tablet/status` uses static mock summary data. It does not count files from the filesystem or inspect real runtime state.
- `/q/[code]/expired` is a dedicated mock preview route. Real expiry must be server-enforced later.
- `/orders/guest/[orderNo]/refund` is a UI-only refund request route. No PG cancellation, settlement hold, inventory restoration, or notification is executed.

## Merge Risks

- Some shared mock/type files were edited because the tablet and guest flows depended on them:
  - `types/status.ts`
  - `types/roles.ts`
  - `lib/mock/mockApi.ts`
  - shared `data/mock*.ts` files
- If other parallel worktrees edit the same files, merge conflicts may need manual resolution.

## Out Of Scope

- Existing admin/company/nursery page files appeared to contain mojibake/syntax-risk content during inspection. They were not rebuilt here because this track is tablet-qr focused.
- Real authentication, customer identity verification, payment approval, refund handling, inventory writes, and delivery updates remain design blockers for the Firebase/PG phase.
- Real QR image generation is not connected. The QR block is a deterministic mock visual and route link.
- Product risk badges use mock stock/external-code heuristics only. They are not connected to live inventory, fulfillment, or external supplier data.
- Delivered/cancelled/payment-failed states are represented by static mock records only. No carrier, PG, notification, or refund system is connected.
- Bank transfer is shown as blocked UI only. No banking, virtual account, settlement, or refund dependency is implemented.
- Payer validation, checkout loading, order/phone mismatch, and QR conflict panels are UI-only. They do not persist personal information or execute payment/refund logic.
- The local status dashboard is for internal visual inspection only and must not be treated as production readiness proof.
- Route preview cards are manual smoke aids only. They do not prove route rendering until a browser/dev-server pass is allowed.
- `reports/tablet-qr/BROWSER_CHECK_RESULT.md` records the blocked browser/build result.
