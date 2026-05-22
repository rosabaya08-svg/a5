# Firebase Contract Unattended Progress

작성일: 2026-05-20
트랙명: firebase-contract

## 진행 원칙

- 현재 worktree 내부 허용 문서만 수정했다.
- 다른 worktree, main `my-app`, 공용 루트 보고서는 수정하지 않았다.
- git add/commit/push, npm install/build/lint, deploy, Firebase 연결은 실행하지 않았다.
- `.env`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, service account, private key, Secret Key는 생성하지 않았다.

## 완료 배치

- Batch 0-16: schema, claims, functions, seed, rules 초안, dev/prod, Emulator, reports
- Batch 17-50: lifecycle, 상태 전이, 결제/환불/정산/알림/배송/외부재고, blockers, next tasks
- Batch 51-70: validation, invariant, source of truth, QR threat model, idempotency, retry/dead-letter, observability, reconciliation, rollout/rollback, handoff

## 추가 생성한 안전 작업

1. 컬렉션별 validation 규칙을 문서화했다.
2. 상태 invariant와 금액 source of truth를 문서화했다.
3. QR/token 위협 모델과 idempotency 후보를 문서화했다.
4. retry/dead-letter, partial failure, reconciliation 후보를 문서화했다.
5. adapter rollout/rollback과 contract test acceptance 후보를 문서화했다.
6. 추가 blocker와 no-go 조건을 정리했다.
7. `/firebase-contract/status` 로컬 상태 대시보드를 생성했다.
8. status mock data와 route map, coverage, blocker, next task 표시 데이터를 생성했다.
9. `/firebase-contract` preview hub와 문서별 route hub를 생성했다.
10. route index, visual smoke plan, merge handoff 보고서를 생성했다.
11. `/firebase-contract/smoke`와 `/firebase-contract/merge-handoff` route를 추가했다.

## 다음 무인 진행 후보

1. Batch 71-80: pseudo-rules test case matrix
2. Batch 81-90: repository contract examples in documentation only
3. Batch 91-100: QA handoff checklist and merge conflict map
4. Status dashboard browser visual check
5. Responsive polish for status dashboard after browser check
6. Preview hub browser visual check
7. Route card copy review

실제 코드/설정 파일 생성은 사람 승인 전 보류한다.
