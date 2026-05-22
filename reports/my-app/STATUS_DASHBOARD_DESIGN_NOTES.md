# Status dashboard design notes

## Route

- Local status dashboard route: `/mock-ui/status`
- Track fallback: `my-app`
- Reason: current folder name is `my-app`, which is not one of the six named parallel worktree folders in the instruction.

## UI structure

- Large top title with mock/test beta and no-production warnings
- Progress card with static progress estimate
- Metric cards for major files, preview routes, and blockers
- Generated screen inventory
- Mock/test completed items
- Live integration status grid
- Blocker cards
- Next task cards
- Human review cards
- Browser smoke route map
- Empty/loading/error/risk state coverage
- Worktree progress timeline

## Responsive behavior

- Mobile: single-column stack with dense cards and readable route table
- Tablet: two-column sections for screen/completion and blocker/next tasks
- Desktop: KPI grid, route table, and status panels expand to multi-column layout

## Safety labels

- `mock/test beta`
- `not production`
- `no real payment`
- `no Firebase connection`
- `no live integration`
- `payout disabled`

## Coverage notes

- Empty state: represented by StatePanel scenarios
- Loading state: represented as manual-pending/deferred state because no live fetch is used
- Error state: represented by expired QR, mock payment failure, and integration-blocked scenarios
- Risk state: represented by blocked, mock-only, integration-pending, payment-failed, settlement-hold, and inventory-low badges

## Deferred validation

- Lint was not executed by instruction
- Build was not executed by instruction
- Browser smoke was not executed by instruction
- Git commands were not executed by instruction

