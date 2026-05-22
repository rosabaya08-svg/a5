# Company State Coverage

## Product States

- `draft`
- `pending_approval`
- `approved`
- `rejected`
- `needs_reapproval`
- `suspended`

## Option And Inventory States

- `on_sale`
- `out_of_stock`
- `sales_suspended`
- `manual_adjustment_mock`
- `order_reserved_mock`
- `order_confirmed_mock`
- `cancel_restore_mock`
- `external_sync_mock_blocked`

## Order And Delivery States

- `paid`
- `preparing`
- `invoice_pending`
- `shipping`
- `ready_for_pickup`
- `picked_up`
- `refund_requested`
- `cancelled`
- `invoice_ready_mock`
- `tracking_blocked`
- `delivered_mock`

## Pickup States

- `waiting`
- `picked_up_mock`
- `cancelled_mock`

## Settlement And Payout States

- `draft`
- `review`
- `confirmed_mock`
- `payout_scheduled_mock`
- `paid_mock`
- `payout_blocked`
- `blocked_real_payout`
- `scheduled_mock`

## Refund States

- `requested`
- `company_review`
- `admin_review`
- `approved_mock`
- `rejected_mock`

## Risk And Error States

- Storage pending
- Missing PG documents
- Missing delivery API
- Missing external inventory API
- Firebase repository not connected
- Auth custom claims not connected
- Mobile action API disabled

## Coverage Notes

- States are UI-only mock states.
- No state transition performs a real server mutation.
- Any real state transition must wait for Firebase repository interfaces, Auth claims, audit logs, and server-side permission checks.
