# Firebase Contract Blockers

## 결정 필요

| ID | 항목 | 현재 안전한 기본값 |
| --- | --- | --- |
| FC-B001 | 태블릿 인증 방식 | `TABLET_DEVICE` claims 구조만 문서화, 실제 발급 보류 |
| FC-B002 | guest QR token 생성/해시 방식 | 원문 token 저장 금지, `token_hash`만 저장 |
| FC-B003 | 주문번호/short code unique 보장 | 서버 transaction 또는 retry 설계 필요 |
| FC-B004 | Firestore Rules 적용 방식 | 문서 초안만 유지, 파일 생성 금지 |
| FC-B005 | Emulator 사용 여부 | 유용하지만 설정 파일 생성은 보류 |
| FC-B006 | dev/prod Firebase project 분리 | 분리 권장, 실제 연결 전 결정 필요 |
| FC-B007 | Secret Manager 운영 방식 | key/secret 생성 금지, 후보 목록만 유지 |
| FC-B008 | PG provider와 callback 검증 | 공식 문서와 test key 확보 전 mock 유지 |
| FC-B009 | 알림톡/SMS provider | 템플릿 승인 전 실제 발송 금지 |
| FC-B010 | 배송조회 API | 공식 문서 확보 전 mock 유지 |
| FC-B011 | 외부 재고 API | 테스트 계정/rate limit 확보 전 mock 유지 |
| FC-B012 | Storage 비용/Blaze | placeholder 유지 |
| FC-B013 | 정산/환불 정책 | 요청/검토 mock까지만 유지 |
| FC-B014 | cart 원장 유지 방식 | Firestore `carts/cart_items` 문서 후보만 정의 |
| FC-B015 | settlement 생성 방식 | mock snapshot 후보만 정의, 실제 지급 금지 |
| FC-B016 | PG 중복 callback 보상 로직 | idempotency 원칙만 문서화, 실제 구현 보류 |
| FC-B017 | 상태 UI 공통 타입 생성 여부 | 문서 계약만 정의, 코드 생성 보류 |
| FC-B018 | 검색 방식 | Firestore prefix/search key 또는 별도 검색 서비스 결정 필요 |
| FC-B019 | mock scenario 실제 데이터화 | seed scenario catalog만 정의, `data/**` 수정 보류 |
| FC-B020 | 모바일/태블릿 요약 DTO | 노출 원칙만 정의, UI 트랙 대조 필요 |
| FC-B021 | payouts MVP 포함 여부 | 문서 구조만 정의, 실제 지급/은행 연동 금지 |
| FC-B022 | notification provider 선정 | `notification_logs` mock만 유지 |
| FC-B023 | delivery carrier code 표준 | 배송조회 API 문서 확보 전 mock 유지 |
| FC-B024 | external_sku 매핑 | 외부 명품몰 API 문서 확보 전 후보 필드만 유지 |
| FC-B025 | Rules helper 실제 문법 | 문서 후보만 유지, `firestore.rules` 생성 금지 |
| FC-B026 | Secret Manager IAM | secret 이름만 정의, 값 생성 금지 |
| FC-B027 | production adapter 생성 | 모든 gate 통과 전 금지 |

## 실행하지 않은 항목

- git add/commit/push
- npm install/build/lint
- Firebase deploy
- Firebase SDK import
- `.env`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`
- service account, private key, Secret 생성
- 실제 Firestore/Auth/PG/알림톡/배송조회/외부 재고 API 연결

## 다음 사람이 판단할 사항

- 문서 기준을 그대로 승인할지, 운영/법무/정산 정책 확정 후 수정할지 결정 필요
- Firebase Emulator를 먼저 도입할지, dev project를 먼저 연결할지 결정 필요
- UI 트랙이 만든 mock 화면과 이 계약 문서의 필드명이 어긋나는지 cross-check 필요

## 사람 승인 필요 통합 목록

### C등급 - 승인 전 절대 금지

- 실제 PG 연결, 운영 PG key/Secret 사용
- 실제 환불, 부분취소, 운영 취소 API 호출
- 정산 지급, payout 실제 입금 처리
- 운영 배포, prod Firebase 연결
- Secret 생성, service account/private key 생성
- 실제 알림톡/SMS 발송
- 실제 배송조회 API 호출
- 실제 외부 재고 API 호출
- Storage Blaze 업그레이드와 실제 파일 업로드

### B등급 - 설계/테스트 승인 필요

- Firestore Rules pseudo-rules를 실제 `firestore.rules`로 전환
- Emulator 설정 파일 생성
- Firebase dev adapter 파일 생성
- seed dry-run script 생성
- Repository interface 실제 파일 생성
- mock scenario를 `data/**` 파일로 추가
- composite index 생성

### A등급 - 현재처럼 문서/mock/report 가능

- 상태 UI 계약 문서화
- 빈/오류/위험 상태 scenario 문서화
- mock 전환 gate 정리
- reports/firebase-contract 갱신
- blocker/next task 정리

## 추가 승인 필요

- idempotency key를 Firestore 문서 필드로 둘지 별도 event 원장으로 둘지 결정 필요
- `system_status`를 실제 컬렉션으로 둘지 report-only로 둘지 결정 필요
- `financial_events`를 별도 컬렉션으로 둘지 audit/payment/settlement 원장으로 충분한지 결정 필요
- partial failure 보상 큐를 Cloud Tasks/queue로 둘지 운영 수동 점검으로 둘지 결정 필요
- rollback feature flag를 `.env` 없이 어떤 설정 원장으로 관리할지 결정 필요

## 상태 대시보드 관련 blockers

- `node_modules/next/dist/docs`가 없어 AGENTS의 Next.js 로컬 문서 확인을 완료하지 못했다.
- `npm install`, `npm run build`, `npm run lint`는 금지되어 실행하지 않았다.
- 브라우저 육안 확인은 route 파일 생성 상태까지만 준비했다. 실제 dev server 실행 여부는 사람 확인이 필요하다.
- 이 대시보드는 정적 mock/status 데이터만 표시하며 실제 Firebase/PG/알림/배송/외부재고 상태를 조회하지 않는다.

## Route hub 관련 blockers

- `/firebase-contract/*` routes는 정적 문서 허브이며 실제 문서 파일을 런타임에 읽지 않는다.
- 실제 브라우저 smoke는 아직 사람이 확인해야 한다.
- build/lint 검증은 금지 명령 때문에 실행하지 않았다.
- Next.js 로컬 docs 부재로 route convention 확인은 기존 app 구조 기준으로만 진행했다.
- smoke/handoff route는 보고서 요약을 정적 data에서 보여주며 실제 파일 내용을 런타임 read하지 않는다.
