# my-app status summary

## Track decision

- Current folder name: `my-app`
- Provided mappings did not include `my-app`
- Safe fallback track: `my-app`
- Status route: `/mock-ui/status`

## Dashboard files

- `app/page.tsx`
- `app/mock-ui/status/page.tsx`
- `components/my-app/StatusDashboard.tsx`
- `data/my-app/statusMock.ts`

## Status shown

- Track name
- Major generated file count
- Generated route count
- Generated component count
- Generated report count
- Generated screen list
- Mock/test completed items
- Live integration blockers
- Firebase connection: no live connection
- PG status: mock only
- Alimtalk: blocker
- Delivery tracking: blocker
- External inventory API: blocker
- Storage: held because Spark plan blocks usage
- Next 10 tasks
- Human review items
- Browser smoke route map
- Empty/loading/error/risk coverage

## Validation

- `npm run lint` not executed by instruction
- `npm run build` not executed by instruction
- Browser smoke not executed by instruction
- Git commands not executed by instruction

## Added launcher section

- Home route `/` now includes `자동 생성 결과 확인`
- Cards link to:
  - `/mock-ui/status`
  - `/mock-ui`
  - `/mock-ui/smoke`
  - `/mock-ui/merge`
  - `/tablet/products`
  - `/tablet/cart`
  - `/tablet/qr`
  - `/q/SANHO701`
  - `/q/SANHO701/checkout`
  - `/orders/guest/A5-20260519-001`

## Worktree port guide

- admin: 3001
- company: 3002
- nursery: 3003
- tablet-qr: 3004
- firebase-contract: 3005
- qa: 3006
