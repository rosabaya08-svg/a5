# Access Control Checklist

## Purpose

This checklist verifies mock/test beta role boundaries. It does not create Auth claims, connect Firebase Auth, or enforce production rules. Production authorization remains blocked until Firebase contract approval.

## Role Matrix

| Role | Scope | Must See | Must Not See | Mock Validation |
| --- | --- | --- | --- | --- |
| `SUPER_ADMIN` | Platform-wide | All companies, nurseries, rooms, tablets, orders, payments, settlements, audit logs | Secret keys, service accounts, live payment credentials | Admin screens show platform context and risk logs. |
| `COMPANY_ADMIN` | Single `company_id` | Own products, inventory, order items, deliveries, sales, payouts | Other companies' settlement accounts or private order data | Company routes display `company_id` and scoped mock rows. |
| `NURSERY_ADMIN` | Single `nursery_id` | Own rooms, tablets, QR sessions, pickups, nursery order history | Other nurseries' rooms/tablets/customer details | Nursery routes display `nursery_id` and scoped mock rows. |
| `TABLET_DEVICE` | Bound `tablet_id`, `room_id`, `nursery_id` | Closed-mall product browsing, cart, QR generation mock | Admin/company/nursery management screens | Tablet routes show room/tablet context and browser-block note. |
| `CUSTOMER_GUEST` | QR session or guest order lookup only | QR landing, checkout mock, result pages, guest order lookup | Admin dashboards, company/nursery routes, unrelated orders | Guest flows rely on short code/order lookup mock, not Auth. |

## Route Access Checklist

| Route Family | Allowed Roles | Denied Roles | Required Mock Evidence |
| --- | --- | --- | --- |
| `/admin/**` | `SUPER_ADMIN` | `COMPANY_ADMIN`, `NURSERY_ADMIN`, `TABLET_DEVICE`, `CUSTOMER_GUEST` | Platform labels, risk logs, no tenant leakage. |
| `/company/**` | `COMPANY_ADMIN`, optionally `SUPER_ADMIN` | `NURSERY_ADMIN`, `TABLET_DEVICE`, `CUSTOMER_GUEST` | `company_id` visible; data scoped to company. |
| `/nursery/**` | `NURSERY_ADMIN`, optionally `SUPER_ADMIN` | `COMPANY_ADMIN`, `TABLET_DEVICE`, `CUSTOMER_GUEST` | `nursery_id` visible; data scoped to nursery. |
| `/tablet/**` | `TABLET_DEVICE`, optionally `SUPER_ADMIN` for demo | `CUSTOMER_GUEST` outside QR handoff | `tablet_id`, `room_id`, `nursery_id` visible. |
| `/q/**` | `CUSTOMER_GUEST` with QR session | Admin/company/nursery management contexts | `qr_session_id`, short code, expiration visible. |
| `/orders/guest/**` | `CUSTOMER_GUEST` with order lookup | Admin/company/nursery management contexts | Order lookup mock fields and no Auth requirement. |

## Blocked Production Items

- [ ] Auth custom claims are not implemented in this mock beta.
- [ ] Firestore security rules are not created in this mock beta.
- [ ] Customer guest identity does not use Firebase Auth.
- [ ] No role grants are stored in `.env` or secrets files.
- [ ] Any role ambiguity is recorded in `reports/qa/BLOCKERS.md` or the owning contract report.

