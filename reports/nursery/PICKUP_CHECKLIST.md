# Pickup Checklist Mock

## Front Desk Flow
- Confirm `order_no`.
- Confirm `room_id` and room_number.
- Confirm masked customer name.
- Confirm product snapshot and quantity.
- Confirm pickup status is `ready`.
- Use 수령완료 button mock only.

## Exception Flow
- If room is inactive or blocked, keep pickup in exception state.
- Do not send SMS, Alimtalk, push, or any external notification.
- Record only mock audit log rows.
- Escalate to human review in BLOCKERS when customer-facing policy is unclear.

## Forbidden In Beta
- No real customer 개인정보 storage.
- No real delivery tracking.
- No real notification.
- No real payment/refund operation.
