# Firebase Integration Blockers

Updated: 2026-05-25

## Cannot be completed automatically without owner action

1. **Custom Claims assignment**
   - Required claims: `SUPER_ADMIN`, `COMPANY_ADMIN`, `NURSERY_ADMIN`, `TABLET_DEVICE`, `company_id`, `nursery_id`, `room_id`, `tablet_id`, `seed_admin`.
   - Needs Firebase Admin SDK running in a trusted environment or a manual admin process.
   - Codex must not create service account private keys.

2. **Production secrets**
   - PG secret key, webhook secret, Firebase Admin credentials, Alimtalk keys, delivery API keys, external inventory API keys.
   - Must be stored in Secret Manager or provider consoles, not committed.

3. **PG production approval**
   - Needs official PG provider docs, MID/channel key/client key/secret key, test cards, webhook signature spec, cancellation/refund policy.
   - Codex can wire skeletons but cannot execute real payment/refund/settlement without keys and approval.

4. **Business/legal policy confirmation**
   - Return/refund/AS liability, seller CS policy, food/medical-adjacent notices, privacy retention, settlement schedule.
   - UI placeholders exist but final policy text must be confirmed by the operator.

5. **Cloud Functions production deploy**
   - Function source can be created.
   - Deploy requires final runtime region, billing, secrets, IAM, and PG webhook endpoint confirmation.

6. **Storage file governance**
   - Bucket exists and rules are ready.
   - Final max sizes, allowed formats, image moderation, virus scanning, signed URL policy, retention period must be confirmed.

7. **A4 external system mapping**
   - `external_nursery_id`, `external_room_id`, `external_tablet_id` fields are prepared.
   - Real A4 API contract and credentials are still required.

8. **Operator account inventory**
   - Need final email list for owner, backup admin, company admins, nursery admins, tablet/device users.
   - Passwords must be set by invitation/reset flow, not committed.

9. **Foundation seed execution**
   - `scripts/seed-firestore-foundation.mjs` is ready.
   - Execution is blocked until local untracked `FIREBASE_SEED_EMAIL` and `FIREBASE_SEED_PASSWORD` exist and the seed account has `seed_admin` or `SUPER_ADMIN` claim.

## Cannot be safely auto-enabled yet

- Firestore writes for `orders`, `order_items`, `payments`, `payment_events`, `refunds`, `settlements`, `payouts`
- Real PG approval/cancel/refund
- Real payout/settlement transfer
- Alimtalk/SMS sending
- Delivery tracking API calls
- External inventory API calls
- Firebase Admin private key generation
