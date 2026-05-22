# Firebase Contract Route Index

## Track

- Track: firebase-contract
- Mode: mock/test beta
- Real Firebase: not connected
- Production: not open

## Browser Routes

| Route | Purpose | Source |
| --- | --- | --- |
| `/firebase-contract` | Preview hub | `app/firebase-contract/page.tsx` |
| `/firebase-contract/status` | Status dashboard | `app/firebase-contract/status/page.tsx` |
| `/firebase-contract/schema` | Firestore schema hub | `FIRESTORE_SCHEMA_PLAN.md` |
| `/firebase-contract/auth-claims` | Auth claims hub | `AUTH_CLAIMS_PLAN.md` |
| `/firebase-contract/functions` | Functions server logic hub | `FUNCTIONS_SERVER_LOGIC_PLAN.md` |
| `/firebase-contract/seed` | Seed dry-run hub | `FIREBASE_SEED_DATA_PLAN.md` |
| `/firebase-contract/repositories` | Repository and adapter hub | `REPOSITORY_INTERFACE_PLAN.md`, `ADAPTER_SPLIT_PLAN.md` |
| `/firebase-contract/blockers` | Blocker gate hub | `FIREBASE_BLOCKERS.md` |
| `/firebase-contract/emulator` | Emulator plan hub | `FIREBASE_BLOCKERS.md` |
| `/firebase-contract/secrets` | Secret Manager plan hub | `FUNCTIONS_SERVER_LOGIC_PLAN.md`, `FIREBASE_BLOCKERS.md` |
| `/firebase-contract/smoke` | Visual smoke checklist hub | `reports/firebase-contract/VISUAL_SMOKE_PLAN.md` |
| `/firebase-contract/merge-handoff` | Merge handoff hub | `reports/firebase-contract/MERGE_HANDOFF.md` |

## Components

- `components/firebase-contract/StatusDashboard.tsx`
- `components/firebase-contract/ContractRoutePreviewGrid.tsx`
- `components/firebase-contract/ContractDocumentHub.tsx`

## Data

- `data/firebase-contract/statusMock.ts`

## Notes

- All routes use static mock/status data.
- No Firebase SDK import.
- No real Firestore/Auth/PG/provider calls.
