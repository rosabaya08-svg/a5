# Firebase Contract Visual Smoke Plan

## Do Not Run Automatically

The current unattended instruction forbids npm/build/lint/deploy commands. This plan is for a human visual check.

## Routes To Open

1. `/firebase-contract`
2. `/firebase-contract/status`
3. `/firebase-contract/schema`
4. `/firebase-contract/auth-claims`
5. `/firebase-contract/functions`
6. `/firebase-contract/seed`
7. `/firebase-contract/repositories`
8. `/firebase-contract/blockers`
9. `/firebase-contract/emulator`
10. `/firebase-contract/secrets`
11. `/firebase-contract/smoke`
12. `/firebase-contract/merge-handoff`

## Visual Checks

| Check | Expected |
| --- | --- |
| Beta label | Mock/Test Beta and not production |
| Firebase state | 실제 연결 없음 |
| PG state | mock only |
| Blockers | Visible, not hidden |
| Cards | No text overflow on mobile/tablet/desktop |
| Route links | Hub links point to `/firebase-contract/*` |
| Secret page | No real key-like values |
| Emulator page | Does not imply emulator is configured |
| Blocker page | C-grade actions remain blocked |
| State coverage | empty/loading/error/risk coverage visible |

## Risk Checks

- No real Firebase config displayed.
- No `.env` instruction shown as completed.
- No `firestore.rules` or `storage.rules` file claim.
- No real PG/notification/delivery/external inventory status shown as connected.
