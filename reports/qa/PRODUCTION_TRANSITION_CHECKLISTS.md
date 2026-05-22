# Production Transition Checklists

## Purpose

These checklists define what must be true before moving from mock/test beta to real integration work. They are not permission to perform the integrations now.

## Firebase Connection

- [ ] Firestore schema approved.
- [ ] Firestore index candidates approved.
- [ ] Firestore Rules authored and reviewed in a dedicated approved task.
- [ ] Auth custom claims approved.
- [ ] Seed data shape approved.
- [ ] Emulator strategy approved.
- [ ] Dev/prod separation approved.
- [ ] Secret Manager names approved without secret values in repo.
- [ ] App Check and IAM plan approved.
- [ ] Mock repository interface remains available for tests.

## PG Transition

- [ ] Payment gateway provider selected.
- [ ] Test merchant account approved outside repo.
- [ ] Server-side amount recalculation implemented and reviewed.
- [ ] Webhook verification design approved.
- [ ] Refund flow and permissions approved.
- [ ] QR expiration and one-time-use behavior enforced server-side.
- [ ] No client-trusted price or settlement mutation.
- [ ] Mock PG remains available for regression tests.

## AlimTalk/Notification Transition

- [ ] Provider selected.
- [ ] Consent and message template policy approved.
- [ ] No real send in local/mock beta.
- [ ] Template IDs stored outside repo.
- [ ] Retry/failure audit log designed.
- [ ] Personal data retention policy approved.

## Delivery Lookup Transition

- [ ] Carrier/provider selected.
- [ ] Tracking number validation rules approved.
- [ ] API key stored outside repo.
- [ ] Rate limit and fallback UI designed.
- [ ] No live lookup in mock beta.

## External Inventory API Transition

- [ ] External mall/provider selected.
- [ ] Product code mapping approved.
- [ ] Sync frequency and conflict policy approved.
- [ ] Failure/retry/audit behavior designed.
- [ ] No live inventory mutation from client UI.

## Storage Blaze Transition

- [ ] Firebase billing decision approved.
- [ ] Storage bucket path policy approved.
- [ ] Upload size/type limits approved.
- [ ] Image/GIF moderation and cleanup policy approved.
- [ ] Storage Rules reviewed.
- [ ] Placeholder-only UI remains until approval.

