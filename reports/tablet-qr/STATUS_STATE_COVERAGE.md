# tablet-qr STATUS_STATE_COVERAGE

## Dashboard State Coverage

| State | Dashboard source | Covered behavior |
| --- | --- | --- |
| Complete | `completedItems`, `progressCards`, `smokeRoutes` | Generated mock/test screens and implemented UI coverage. |
| In progress | `inProgressItems` | Browser smoke, mock filter behavior, and beta visibility decisions. |
| Blocked | `blockers`, integration rows | Firebase, PG, AlimTalk, delivery lookup, external stock API, and Storage hold. |
| Review | `smokeRoutes`, `humanChecks` | Routes and decisions requiring a human before merge or external beta. |

## Customer Flow State Coverage

- Empty state: catalog no-products and guest lookup no-results placeholders.
- Loading state: checkout loading panel and `/q/[code]/loading`.
- Error state: unknown order, missing payment record, and external inventory unavailable.
- Risk state: critical stock, missing external code, cancelled QR, expired QR, payment_failed QR, and blocked bank transfer.

## Production Safety

- Dashboard labels explicitly say mock/test beta.
- Dashboard labels explicitly say not production and no real payment.
- Real integrations are presented as blocked, not partially done.
