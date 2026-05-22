# QR History Checklist Mock

## Statuses
- `active`
- `expired`
- `used`
- `canceled`
- `payment_failed`

## Review Fields
- `short_code`
- `qr_session_id`
- `cart_id`
- `room_id`
- `tablet_id`
- `expires_at`
- payment state

## Expiration Guidance
- QR sessions should display 2~3 hour expiration guidance.
- Beta UI shows static `expiresAt` only.
- No server expiration job is connected.

## Forbidden In Beta
- No PG call.
- No payment approval.
- No payment cancellation.
- No refund.
- No external notification.
