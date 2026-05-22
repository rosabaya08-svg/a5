# my-app 안전 실행 큐

## 현재 큐 상태

`my-app` 트랙은 세부 기능 트랙이 아니라 공통 기준 트랙으로 해석한다. 따라서 앱 코드 직접 수정은 보류하고, 병렬 작업자가 참고할 수 있는 기준 문서와 실행 큐만 관리한다.

## DAY 1

- 프로젝트 공통 금지 항목 재확인
- 공용 보고서 수정 금지 유지
- `reports/my-app/` 전용 보고서 작성
- mock/test 베타 기준 정리

## DAY 2

- 공통 UI 상태 기준 정리
- 빈 상태, 오류 상태, 위험 배지 기준 정의
- 필터/검색/정렬 기준 정의

## DAY 3

- mock 데이터 확장 기준 정리
- 상품, 주문, QR 세션별 상태 폭 정의
- 실제 운영 데이터와 혼동하지 않도록 mock/test 라벨 기준 정의

## DAY 4

- 병렬 트랙 merge 기준 정리
- 충돌 가능 파일을 기능별로 분리
- 공용 타입/데이터 변경이 필요한 경우 별도 승인 대상으로 분리

## DAY 5

- 각 트랙 보고서 통합 양식 정리
- 최종 커밋 전 확인 항목 정리
- 검증 명령은 금지 상태가 해제될 때까지 보류

## 추가 고도화 큐

- 관리자 화면은 정보 밀도와 상태 추적 중심으로 개선
- 기업 화면은 상품/재고/주문 처리 중심으로 개선
- 조리원 화면은 객실/태블릿/현장수령 중심으로 개선
- 태블릿/QR 화면은 실제 고객 폐쇄몰 쇼핑 경험 중심으로 개선
- Firebase 계약 문서는 실제 연결 직전 체크리스트 중심으로 개선
- QA 트랙은 smoke route, merge plan, release readiness 중심으로 개선

## 종료 시 제안할 커밋 후보

Commit candidate command was moved to `reports/my-app/COMMIT_CANDIDATE.md`.

## 완료된 추가 배치

- 공통 mock UI 상태 타입 추가
- mock UI 시나리오 데이터 추가
- 위험 상태 배지 추가
- 빈/오류/차단/만료 상태 panel 추가
- 검색/필터/정렬 panel 추가
- 상세 section preview 추가
- 상품 카드 preview 추가
- QR 세션 card preview 추가
- 주문 timeline preview 추가
- `/mock-ui`, `/mock-ui/detail` preview route 추가
## 추가 완료 배치: checkout / guest lookup

- checkout/guest lookup mock 타입 추가
- checkout/guest lookup mock 데이터 추가
- mobile action bar 추가
- checkout summary component 추가
- guest order lookup component 추가
- `/mock-ui/checkout` preview route 추가

## 갱신된 종료 시 제안 커밋 후보

Commit candidate command was moved to `reports/my-app/COMMIT_CANDIDATE.md`.
## 추가 완료 배치: operations board

- operations mock 타입 추가
- operations mock 데이터 추가
- metric grid component 추가
- approval queue component 추가
- integration gate list component 추가
- smoke route matrix component 추가
- `/mock-ui/operations` preview route 추가

## 추가 완료 배치: QA / merge readiness

- QA/merge readiness mock 타입 추가
- QA/merge readiness mock 데이터 추가
- merge plan board component 추가
- manual checklist component 추가
- release readiness component 추가
- `/mock-ui/qa` preview route 추가

## 추가 완료 배치: storefront preview

- storefront mock 타입 추가
- storefront mock 데이터 추가
- store hero component 추가
- category rail component 추가
- benefit strip component 추가
- price layer panel component 추가
- `/mock-ui/storefront` preview route 추가

## 추가 완료 배치: session lifecycle

- session lifecycle mock 타입 추가
- session lifecycle mock 데이터 추가
- QR lifecycle board component 추가
- device context panel component 추가
- payer handoff card component 추가
- `/mock-ui/session` preview route 추가

## 추가 완료 배치: analytics / settlement visibility

- analytics mock 타입 추가
- analytics mock 데이터 추가
- analytics tile component 추가
- risk distribution component 추가
- settlement preview component 추가
- `/mock-ui/analytics` preview route 추가

## 추가 완료 배치: preview route index

- preview route mock 타입 추가
- preview route mock 데이터 추가
- preview route grid component 추가
- `/mock-ui`에 preview route index 추가

## 추가 완료 배치: end-to-end journey

- journey mock 타입 추가
- journey mock 데이터 추가
- journey map component 추가
- decision ledger component 추가
- `/mock-ui/journey` preview route 추가
- preview route index에 journey route 추가

## 추가 완료 배치: local status dashboard

- status dashboard mock 데이터 추가
- status dashboard component 추가
- `/mock-ui/status` preview route 추가
- preview route index에 status route 추가
- status summary report 추가
- commit candidate file path list 갱신

## 추가 완료 배치: status dashboard enhancement

- live integration status mock 데이터 추가
- progress timeline mock 데이터 추가
- status dashboard integration status grid 추가
- status dashboard progress timeline 추가
- status dashboard design notes 추가
