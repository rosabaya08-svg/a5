# Company Status Summary

## Route

- Track: `company`
- Status route: `/company/status`
- Dashboard component: `components/company/StatusDashboard.tsx`
- Data source: `data/company/statusMock.ts`
- Route preview component: `components/company/CompanyRoutePreviewGrid.tsx`
- Mock company id: `company_sanho_luxury_001`

## Visible Status Claims

- Firebase: 실제 연결 없음
- PG: mock only
- Alimtalk: blocker
- Delivery tracking: blocker
- External inventory API: blocker
- Storage: Spark 제한으로 보류
- Mode: mock/test beta
- Open warning: 운영 오픈 아님, 실결제 아님, 실제 정산 지급 아님

## Dashboard Sections

- Big title and track label
- Progress cards
- Route preview card groups
- Connection state cards
- Completed item card
- Blocker card
- Human review card
- Major screen list
- Browser smoke route list
- Next task list
- Empty/loading/error/risk coverage

## Preview Route Groups

- Dashboard
- Products
- Product Detail
- Product Create Wizard
- Options
- Inventory
- Inventory Movements
- External Inventory Mapping
- Orders
- Order Detail
- Delivery
- Pickup
- Sales
- Settlements
- Refund Requests
- Company Users
- Audit Logs
- Risk Center

## Notes

- No real data lookup was added.
- No Firebase SDK import was added.
- No PG, payout, delivery tracking, Alimtalk, Storage, or external inventory integration was added.
