# Permission Coverage Matrix

## Purpose

This matrix covers role-based mock/test beta expectations for batch 23. It is document-only and does not implement Firebase Auth, custom claims, or Firestore Rules.

| Role | Allowed Route Families | Required Context | Denied Route Families | Required Blocked State |
| --- | --- | --- | --- | --- |
| `SUPER_ADMIN` | `/admin/**`, optional read-only review of all tracks | Platform/global | None in mock review, but secrets remain denied | Secret/config visibility blocked |
| `COMPANY_ADMIN` | `/company/**` | `company_id` | `/admin/**`, `/nursery/**`, `/tablet/**`, unrelated `/orders/guest/**` | Tenant access denied |
| `NURSERY_ADMIN` | `/nursery/**` | `nursery_id` | `/admin/**`, `/company/**`, unrelated `/tablet/**` | Tenant access denied |
| `TABLET_DEVICE` | `/tablet/**` | `tablet_id`, `room_id`, `nursery_id` | `/admin/**`, `/company/**`, `/nursery/**` | Management access blocked |
| `CUSTOMER_GUEST` | `/q/**`, `/orders/guest/**` | `qr_session_id` or order/phone lookup | `/admin/**`, `/company/**`, `/nursery/**`, `/tablet/**` outside handoff | Guest access limited |

## Cross-Role Checks

- [ ] Admin screens do not display secret material.
- [ ] Company screens cannot imply cross-company order or settlement access.
- [ ] Nursery screens cannot imply cross-nursery room/tablet access.
- [ ] Tablet screens are bound to one room/tablet/nursery context.
- [ ] Customer QR and guest lookup do not require Firebase Auth.
- [ ] Any role ambiguity is recorded as a contract blocker.

