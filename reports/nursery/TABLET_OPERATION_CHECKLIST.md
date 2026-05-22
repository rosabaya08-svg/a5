# Tablet Operation Checklist Mock

## Daily Tablet Checks
- Check last seen time.
- Check room-bound state.
- Check tablet session mock expiration.
- Check QR generated count.
- Check cart state.
- Check access state: allowed_mock, needs_pairing, blocked_browser_mock.

## Reassignment Mock
- Confirm source `tablet_id`.
- Confirm target `room_id`.
- Show reassignment candidate only.
- Do not persist any binding.

## Browser Block Policy
- General browser blocking is display-only.
- App Check, device token, Auth claims, and server session policy are deferred.
- Do not implement live blocking logic in this track.
