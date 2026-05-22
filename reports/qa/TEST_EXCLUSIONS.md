# Test Exclusions

## Purpose

This document clarifies what is intentionally not tested in the mock/test beta.

## Excluded From Mock/Test Beta

- Real Firebase project connection.
- Firestore Rules enforcement.
- Storage Rules enforcement.
- Firebase Auth custom claim assignment.
- Service account permissions.
- Secret Manager access.
- Real PG payment authorization/capture.
- Real refund execution.
- Real settlement payout.
- Real SMS/AlimTalk send.
- Real delivery tracking lookup.
- Real external inventory synchronization.
- Production deployment.
- Real customer data retention, deletion, and export flows.
- Load, stress, and scale testing.
- Browser/device farm coverage beyond manual viewport checks.

## Required Documentation For Exclusions

- [ ] Each excluded production integration is listed in blockers or transition checklist.
- [ ] UI copy does not imply excluded functionality is live.
- [ ] Mock/stub alternatives exist for demo-critical flows.

