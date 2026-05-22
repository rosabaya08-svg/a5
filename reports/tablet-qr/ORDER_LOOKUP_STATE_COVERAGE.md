# tablet-qr ORDER_LOOKUP_STATE_COVERAGE

## Covered Order States

- `pending_payment` - active or expired QR has not completed payment.
- `paid` - payment approved mock exists.
- `ready_for_pickup` - pickup branch is ready for nursery confirmation.
- `picked_up` - generated paid pickup orders.
- `delivered` - delivery branch completed in mock data.
- `refund_requested` - refund UI branch only.
- `cancelled` - cancelled/payment failed branch.

## Covered Payment States

- `ready` - payment is not approved yet.
- `approved_mock` - mock payment approved.
- `failed_mock` - mock payment failed.
- `cancel_requested` - refund/cancel branch pending.
- `cancelled_mock` - cancelled payment branch.

## Covered Lookup States

- Order number and phone input mock.
- Result list with status badges.
- Order detail with product snapshot.
- Delivery timeline.
- Pickup timeline.
- Payment detail.
- Refund request mock.
- Unknown order safe error state.
- Empty state placeholder for no filter results.

## Data Volume

- Product data is expanded beyond 30 items.
- Order data is expanded beyond 30 items using generated mock orders.
- QR session data is expanded beyond 30 items using generated mock QR sessions.
