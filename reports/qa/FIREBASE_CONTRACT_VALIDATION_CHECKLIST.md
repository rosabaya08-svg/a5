# Firebase Contract Validation Checklist

## Scope

Owner track: `firebase-contract`

This checklist validates planning documents only. It must not create `.env`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, service accounts, private keys, or live Firebase connections.

## Required Documents

| Document | Required Coverage | Status |
| --- | --- | --- |
| `FIRESTORE_SCHEMA_PLAN.md` | Collections, documents, ownership fields, order item snapshots, QR sessions, payments, inventory, settlements, audit logs | [ ] |
| `AUTH_CLAIMS_PLAN.md` | `SUPER_ADMIN`, `COMPANY_ADMIN`, `NURSERY_ADMIN`, `TABLET_DEVICE`, `CUSTOMER_GUEST` assumptions | [ ] |
| `FUNCTIONS_SERVER_LOGIC_PLAN.md` | QR creation/expiry, server price recalculation, stock decrement/recovery, payment gateway transition, audit log | [ ] |
| `FIREBASE_SEED_DATA_PLAN.md` | Mock-to-seed mapping and emulator seed assumptions | [ ] |
| `REPOSITORY_INTERFACE_PLAN.md` | Mock adapter and future Firebase adapter boundary | [ ] |
| `ADAPTER_SPLIT_PLAN.md` | No Firebase import in mock-only UI flows | [ ] |
| `FIREBASE_BLOCKERS.md` | Rules, claims, emulator, secrets, App Check, IAM, dev/prod split blockers | [ ] |

## Validation Questions

- [ ] Does every collection include tenant/ownership fields where needed?
- [ ] Are customer guest flows based on QR/order lookup rather than Auth user creation?
- [ ] Are settlement and refund operations server-controlled in the plan?
- [ ] Are Rules described as a future file and not created yet?
- [ ] Are emulator and seed tasks separated from production setup?
- [ ] Are secret names documented without secret values?
- [ ] Is Storage/Blaze work blocked until approval?
- [ ] Is App Check/IAM/server SDK bypass risk documented?

## Stop Conditions

- A Firebase config or rules file exists before approval.
- Any secret-like value appears in docs or code.
- A Firebase SDK import appears in mock-only routes.
- A plan implies client-side authority for payment, refund, settlement, or stock mutation.

