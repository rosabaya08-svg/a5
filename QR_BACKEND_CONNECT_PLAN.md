# QR Backend Connect Plan

## Scope
- Tablet cart QR creation now targets Firebase Functions `qrCreate`.
- Frontend contract uses `POST /qr/create` when a gateway base is configured.
- Direct Firebase Functions fallback uses `NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL/qrCreate`.
- Local QR fallback remains only as a visible developer fallback when the server request fails.

## Request Contract
- `cartId`
- `nurseryId`
- `roomId`
- `tabletId`
- `deliveryMethod`
- `items[]`
  - `productId`
  - `optionId`
  - `productName`
  - `optionName`
  - `unitPrice`
  - `quantity`
  - `companyId`
- `clientAmount`
- `expiresInMinutes`

## Response Contract
- `ok`
- `qrSessionId`
- `shortCode`
- `status`
- `expiresAt`
- `totalAmount`
- `paymentUrl`
- `customerUrl`
- `source: firebase_functions_qr_create`
- `message`

## Server Validation
- Reads `nurseries/{nurseryId}`, `rooms/{roomId}`, `tablets/{tabletId}`.
- Verifies room belongs to nursery.
- Verifies tablet belongs to nursery and room, and tablet is active.
- Reads every `products/{productId}` and requires `active` or `approved`.
- Reads `product_options/{optionId}` when an option id exists.
- Recalculates the amount from Firestore price fields.
- Blocks QR creation when the client amount does not match server amount.
- Blocks QR creation when option/product inventory is not enough.
- Checks `short_code` collision up to 3 generated codes.

## Firestore Writes
- `qr_payment_sessions/{qrSessionId}`
- `audit_logs/{autoId}`

## Fallback Policy
- Server success: browser only stores display cache in localStorage.
- Server failure: UI shows the failure reason and uses `source: local_fallback_only`.
- Browser direct Firestore QR write is blocked for successful server QR creation.

## Deploy Candidate
- `firebase.cmd deploy --only functions:qrCreate,functions:qrExpire`
- Do not run this deploy command until the final Functions environment check is approved.

## Next PG Step
- Connect `/q/{shortCode}/checkout` to `paymentsReady`.
- Keep PG provider in mock mode until official PG module and keys are received.
