# Firebase Contract Status Summary

## Track

- Track: firebase-contract
- Route: `/firebase-contract/status`
- Mode: mock/test beta
- Production: not open
- Payments: not real

## Current Integration State

| Item | State |
| --- | --- |
| Firebase | 실제 연결 없음 |
| Firestore/Auth | 실제 연결 없음 |
| PG | mock only |
| 알림톡 | blocker |
| 배송조회 | blocker |
| 외부 재고 API | blocker |
| Storage | Spark 제한으로 보류 |

## Dashboard Files

- `app/firebase-contract/status/page.tsx`
- `app/firebase-contract/page.tsx`
- `app/firebase-contract/smoke/page.tsx`
- `app/firebase-contract/merge-handoff/page.tsx`
- `components/firebase-contract/StatusDashboard.tsx`
- `components/firebase-contract/ContractRoutePreviewGrid.tsx`
- `components/firebase-contract/ContractDocumentHub.tsx`
- `data/firebase-contract/statusMock.ts`

## Coverage

| State | Coverage |
| --- | --- |
| empty | 문서 계약 있음 |
| loading | 실제 fetch 없음, UI 후보 필요 |
| error | 표준 error code 계약 있음 |
| risk | normal/watch/risk/blocked 계약 있음 |

## Verification Note

`npm run build`, `npm run lint`, `npm install`, Firebase 연결, deploy는 실행하지 않았다.
