# Mock/Test Beta Release Notes Draft

## Release Label

Mock/Test Beta Package

## Summary

This beta package is intended to validate the user interface, mock data flows, route coverage, merge readiness, and integration planning for the closed-mall workflow. It is not a production release and must not be used for live orders, real payment, real refund, real settlement, real customer data storage, or live external API operation.

## Included Areas

- Super admin mock management screens.
- Company admin mock product, inventory, order, delivery, payout, and sales screens.
- Nursery admin mock room, tablet, pickup, QR history, and order screens.
- Tablet closed-mall mock product/cart/QR flow.
- Customer QR mock checkout and result flow.
- Guest order lookup mock flow.
- Firebase contract and adapter planning documents.
- QA/CI draft workflow, route smoke checklist, state coverage matrix, merge plan, and release readiness documents.

## Explicitly Not Included

- Production Firebase connection.
- Firestore/Auth/Storage live configuration.
- Firebase rules files.
- `.env`, secrets, service accounts, private keys, or production credentials.
- Live PG payment, refund, settlement payout, shipping lookup, SMS/AlimTalk, or external inventory API calls.
- Production deployment.

## Known Pending Gates

- Clean dependency install has not been run during unattended generation.
- Lint has not been run during unattended generation.
- Build has not been run during unattended generation.
- Route smoke checks are pending after merge.
- State coverage checks are pending after merge.
- Firebase contract approval is required before real adapter work.
- Storage Blaze decision remains blocked before upload features.

## Release Decision Language

Use one of these labels after merge review:

| Decision | Meaning |
| --- | --- |
| Hold | P0 blockers or production-risk changes exist. |
| Mock beta only | UI/mock review can proceed; real production integrations remain disabled. |
| Ready for implementation planning | Mock beta is stable enough to plan Firebase/PG/Storage adapter work. |

