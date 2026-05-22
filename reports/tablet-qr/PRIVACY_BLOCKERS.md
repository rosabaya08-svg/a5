# tablet-qr PRIVACY_BLOCKERS

## Current Privacy Position

- Guest names are sample labels only.
- Phone numbers are masked sample values only.
- No real customer identity is stored.
- No Auth account is created or queried.
- No Firestore customer document is queried.
- No notification recipient is contacted.

## Required Human Decisions

- Decide whether guest lookup requires full phone number, masked phone plus order number, SMS verification, or payment approval token.
- Decide which order fields are visible to a non-member payer versus a nursery room guest.
- Decide retention rules for QR payer information.
- Decide whether guardian payer information is stored, tokenized, or discarded after payment approval.

## Blocked Until Approved

- Real phone verification.
- Real customer profile lookup.
- Real payer identity storage.
- Real order recipient updates.
- Real refund request identity verification.
