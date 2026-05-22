# Adapter Split Plan

작성일: 2026-05-20

## 1. 목적

현재 `lib/mock/mockApi.ts`와 `lib/adapters/*Mock.ts`에 머무는 mock/test 구조를, 추후 Firebase 연결 시 안전하게 교체할 수 있도록 파일 구조와 adapter boundary를 제안한다. 이 문서는 제안 문서이며 실제 파일이나 코드를 만들지 않는다.

## 2. 현재 구조

```text
data/
  mockProducts.ts
  mockOrders.ts
  mockQrSessions.ts

lib/
  mock/
    mockApi.ts
  adapters/
    paymentMock.ts
    notificationMock.ts
    deliveryMock.ts
    externalInventoryMock.ts
```

현재 장점:

- 외부 API 호출이 없다.
- mock/test 베타 화면을 빠르게 확인할 수 있다.
- PG/알림/배송/외부 재고가 운영 코드와 섞이지 않았다.

현재 한계:

- UI가 장기적으로 `mockApi`에 의존하면 Firebase 전환 시 변경 범위가 커진다.
- 데이터 조회와 업무 흐름 검증이 한 계층에 섞일 수 있다.
- mock adapter와 추후 Firebase adapter의 계약이 아직 고정되지 않았다.

## 3. 권장 파일 구조 후보

실제 생성은 별도 승인 후 진행한다.

```text
lib/
  repositories/
    interfaces/
      ProductRepository.ts
      QrSessionRepository.ts
      OrderRepository.ts
      PaymentRepository.ts
      InventoryRepository.ts
      AuditLogRepository.ts
    mock/
      mockProductRepository.ts
      mockQrSessionRepository.ts
      mockOrderRepository.ts
      mockPaymentRepository.ts
      mockInventoryRepository.ts
      mockAuditLogRepository.ts
    firebase/
      firebaseProductRepository.ts
      firebaseQrSessionRepository.ts
      firebaseOrderRepository.ts
      firebasePaymentRepository.ts
      firebaseInventoryRepository.ts
      firebaseAuditLogRepository.ts
  services/
    commerce/
      qrSessionService.ts
      checkoutService.ts
      guestOrderService.ts
      inventoryService.ts
  adapters/
    payment/
      paymentPort.ts
      paymentMock.ts
      paymentFirebaseOrPgAdapter.ts
    notification/
      notificationPort.ts
      notificationMock.ts
      notificationProviderAdapter.ts
    delivery/
      deliveryPort.ts
      deliveryMock.ts
      deliveryProviderAdapter.ts
    inventory/
      externalInventoryPort.ts
      externalInventoryMock.ts
      externalInventoryProviderAdapter.ts
```

## 4. Mock/Firebase 분리 규칙

| 영역 | mock 구현 | Firebase/운영 후보 | 분리 규칙 |
| --- | --- | --- | --- |
| 상품/옵션 조회 | `data/mockProducts.ts` | Firestore `products`, `product_options` | 같은 Repository interface 사용 |
| QR 세션 | `data/mockQrSessions.ts` | Firestore `qr_payment_sessions` + Functions | 생성/상태변경은 service 경계 |
| 주문/주문상세 | `data/mockOrders.ts` | Firestore `orders`, `order_items` | snapshot 구조 유지 |
| 결제 | `paymentMock.ts` | PG adapter + Functions callback | mock/prod adapter 명칭 분리 |
| 알림 | `notificationMock.ts` | 알림톡/SMS provider | 템플릿 승인 전 prod 금지 |
| 배송조회 | `deliveryMock.ts` | 배송조회 API 또는 URL provider | 공식 문서 전 prod 금지 |
| 외부 재고 | `externalInventoryMock.ts` | 외부 재고 API provider | 상품코드/rate limit 필요 |

## 5. Adapter 선택 방식 후보

승인 전에는 실제 선택 코드를 만들지 않는다. 설계상 후보는 아래 중 하나다.

| 방식 | 설명 | 장점 | 주의 |
| --- | --- | --- | --- |
| build-time selection | `mock` 또는 `firebase` 구현을 빌드 설정으로 선택 | 단순함 | `.env` 필요 가능성이 있어 현재 금지 |
| server factory | 서버에서 실행 환경에 따라 repository 구현 선택 | Firebase 연결 후 적합 | 잘못 설정 시 운영 연결 위험 |
| explicit import per route | 각 route/service가 명시적으로 mock 구현 사용 | 현재 mock 단계에 안전 | 전환 시 변경 범위 증가 |
| dependency injection | service 생성 시 repository 묶음을 주입 | 테스트와 전환이 쉬움 | 구조 설계가 조금 무거움 |

현재 단계에서는 explicit mock 사용을 유지하고, Firebase 전환 승인 후 dependency injection 구조로 옮기는 방식을 권장한다.

## 6. 전환 단계

| 단계 | 작업 | 산출물 |
| --- | --- | --- |
| 1 | interface 문서 승인 | `REPOSITORY_INTERFACE_PLAN.md` |
| 2 | mock repository wrapper 작성 | 기존 `mockApi`를 감싸는 mock 구현 |
| 3 | service boundary 작성 | QR/checkout/order use case 분리 |
| 4 | adapter contract test 작성 | mock/firebase가 같은 계약을 만족하는지 검증 |
| 5 | Firebase config 보관 방식 승인 | `.env` 또는 다른 방식은 별도 승인 필요 |
| 6 | Firebase SDK 설치 승인 | `npm install firebase`는 별도 승인 전 금지 |
| 7 | dev Firebase adapter 작성 | Firestore/Auth 연결은 dev only |
| 8 | production adapter 판단 | PG/알림/배송/재고 공식 문서와 운영 승인 필요 |

## 7. 이름 규칙

- mock 전용 파일은 반드시 `Mock` 또는 `mock`을 포함한다.
- Firebase 개발 adapter는 `firebase`를 포함하되 운영 연결 아님을 문서에 명시한다.
- PG/알림톡/배송조회/외부 재고 실연동 파일은 provider 이름과 `prod` 의미가 섞이지 않게 한다.
- Secret, key, service account, Firebase config는 adapter 파일에 직접 넣지 않는다.

## 8. 위험 차단

아래 조건 중 하나라도 충족되지 않으면 Firebase/운영 adapter를 만들지 않는다.

- Firebase config 보관 방식 승인
- Firestore Rules 권한 설계 승인
- Auth claims 부여 절차 승인
- Storage Blaze 필요성 및 비용 승인
- PG 테스트 MID/KEY 및 공식 문서 확보
- 알림톡 발송사/템플릿 승인
- 배송조회 API 공식 문서 확보
- 외부 재고 API 공식 문서/테스트 계정 확보

## 9. 현재 금지

- `npm install firebase`
- `.env`, `firebase.json`, `.firebaserc`, rules 파일 생성
- 실제 Firestore/Auth 연결
- 실제 PG/환불/정산/알림톡/배송조회/외부 재고 API 연결
- deploy

## 10. 5일 베타 adapter 분리 계약

이번 베타에서는 실제 adapter 파일을 늘리기보다, 각 화면이 따라야 할 방향을 문서로 고정한다.

| 영역 | 현재 허용 | 실제 연결 전 금지 |
| --- | --- | --- |
| Firebase | 계약 문서, schema, claims, rules 초안 문서 | SDK import, config, `.env`, deploy |
| PG | mock 승인/실패 상태, error code | MID/KEY 저장, callback route 운영 연결 |
| 환불 | 요청/검토 mock | 실제 취소/부분취소 실행 |
| 정산 | `order_items` 기반 mock 계산 | 지급 실행, 은행 API, 세무 자동 처리 |
| 알림 | 발송 예정/성공/실패 mock log | 실제 알림톡/SMS 발송 |
| 배송조회 | 송장 입력 mock, 배송상태 mock | 실제 택배 API 호출 |
| 외부 재고 | external code 표시, mock sync status | 실제 외부 API 호출 |

## 11. feature flag 후보

`.env`를 만들지 않으므로 지금은 구현하지 않는다. 전환 시 후보만 남긴다.

| flag | 의미 | 기본값 후보 |
| --- | --- | --- |
| `DATA_SOURCE` | `mock` 또는 `firebase` | `mock` |
| `PAYMENT_PROVIDER` | `mock` 또는 PG provider | `mock` |
| `NOTIFICATION_PROVIDER` | `mock` 또는 provider | `mock` |
| `DELIVERY_PROVIDER` | `mock` 또는 provider | `mock` |
| `INVENTORY_PROVIDER` | `mock` 또는 provider | `mock` |
| `ALLOW_PROD_MUTATION` | 운영 mutation 허용 gate | `false` |

## 12. 병렬 worktree merge 방지 원칙

- `firebase-contract` 트랙은 문서와 reports만 수정한다.
- UI 트랙은 실제 Firebase adapter를 import하지 않는다.
- 공용 `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md`는 병렬 충돌 방지를 위해 수정하지 않는다.
- adapter 실제 파일 생성은 별도 승인 후 하나의 트랙에서만 진행한다.
- Firebase 설정 파일, Rules 파일, Storage Rules 파일은 이 트랙에서도 만들지 않는다.

## 13. 전환 승인 체크포인트

1. Firestore schema와 Auth claims 승인
2. Rules 초안 문서 승인
3. Emulator 또는 dev project 사용 여부 결정
4. Firebase config 보관 방식 결정
5. Secret Manager와 service account 운영 방식 결정
6. PG/알림/배송/외부재고 공식 문서 확보
7. mock repository contract test 후보 승인
8. dev adapter 작성 범위 승인

## 14. 상태 UI adapter boundary

추가 고도화 항목은 실제 UI 코드가 아니라 adapter가 반환해야 할 상태 계약으로 분리한다.

| UI 요구 | adapter boundary |
| --- | --- |
| 빈 상태 UI | list repository가 `items: []`와 `empty_state` 후보를 반환 |
| 오류 상태 UI | service가 표준 `ErrorStateView`를 반환 |
| 위험 상태 배지 | server/service가 `RiskBadgeView` 후보를 계산 |
| 필터/검색/정렬 UI | list 메서드가 filter/sort/page 입력을 명시적으로 받음 |
| 상세 페이지 mock | detail repository가 related/timeline을 포함한 view를 반환 |
| 모바일/태블릿 반응형 | DTO에서 핵심 summary와 detail snapshot을 분리 |

Firebase adapter 전환 전에도 mock adapter가 이 계약을 먼저 만족해야 한다.

## 15. mock data provider 확장 후보

실제 파일 생성은 별도 승인 후 진행한다. 지금은 아래 provider 후보만 문서화한다.

| provider 후보 | 역할 |
| --- | --- |
| `mockScenarioProvider` | empty/error/risk/detail scenario 선택 |
| `mockFilterProvider` | query/filter/sort/page 결과 흉내 |
| `mockRiskProvider` | 위험 배지 계산 후보 반환 |
| `mockResponsiveSummaryProvider` | mobile/tablet/desktop summary 차이 검증 |

이 provider들은 실제 Firebase, PG, 배송, 알림, 외부 재고 API를 호출하지 않는다.

## 16. 외부 연동 port/stub 계약

실제 adapter 파일은 만들지 않는다. 아래는 추후 생성할 port 계약 후보만 정리한다.

| port 후보 | mock 동작 | 실제 전환 gate |
| --- | --- | --- |
| `PaymentPort` | `approved_mock`, `failed_mock`, `EXTERNAL_BLOCKED` | PG MID/Secret/callback/cancel 문서 확보 |
| `NotificationPort` | `sent_mock`, `failed_mock`, retry 후보 | 템플릿 코드, 발송사 API, 수신자 정책 승인 |
| `DeliveryTrackingPort` | 배송 단계 mock | 택배사 코드, 송장 API, rate limit 확보 |
| `ExternalInventoryPort` | 재고 sync success/failure mock | external_product_id, external_sku, API key 확보 |
| `StorageAssetPort` | placeholder URL/tone 반환 | Blaze, 권한, 비용, 업로드 정책 승인 |
| `SecretProviderPort` | secret required error 반환 | Secret Manager/IAM 승인 |

## 17. production adapter 생성 차단 조건

아래 중 하나라도 미완료면 production adapter를 만들지 않는다.

- dev/prod Firebase project 분리 미완료
- Secret Manager 접근 정책 미승인
- PG callback 검증 방식 미확보
- 알림톡 템플릿 미승인
- 배송조회 공식 API 문서 미확보
- 외부 재고 API 테스트 계정 미확보
- Storage Blaze 비용/권한 미승인
- Rules/Emulator 테스트 미완료

## 18. Batch 44 mock/test/production adapter 구분표

| 구분 | 할 수 있는 일 | 필요한 준비 | 금지 |
| --- | --- | --- | --- |
| mock adapter | UI 표시, 빈/오류/위험 상태, mock 결제/배송/알림/재고 | 로컬 mock 원장, scenario catalog | 실제 외부 API 호출 |
| test adapter | Emulator/dev project 검증, Rules/claims/transaction 테스트 | dev Firebase, Emulator, test PG key 후보 | 운영 고객/운영 PG 사용 |
| production adapter | 실제 고객/결제/알림/배송/재고 처리 | prod Firebase, Secret Manager, IAM, provider 계약, 감사/백업 | 승인 전 생성/배포 |

## 19. Batch 31 adapter readiness gate

| gate | 통과 조건 |
| --- | --- |
| AD-G1 | schema/claims/rules 문서 승인 |
| AD-G2 | dev/prod 또는 Emulator 전략 승인 |
| AD-G3 | seed dry-run 검증 계획 승인 |
| AD-G4 | Secret Manager/IAM 접근 정책 승인 |
| AD-G5 | mock contract test 후보 승인 |
| AD-G6 | 외부 provider별 공식 문서 확보 |

하나라도 미완료면 Firebase adapter는 stub 문서 상태에 머문다.

## 20. Batch 66 adapter rollout plan

| 단계 | 허용 adapter | 금지 |
| --- | --- | --- |
| 0 문서 | 문서 계약만 | 파일 생성, SDK import |
| 1 mock | 기존 mock adapter | 실제 API 호출 |
| 2 contract | mock contract test 후보 | Firebase 연결 |
| 3 emulator | Firebase emulator adapter 후보 | prod key, 운영 데이터 |
| 4 dev | dev Firebase adapter | prod project, 실제 고객 |
| 5 prod | production adapter | gate 미통과 상태 배포 |

## 21. Batch 67 rollback 기준

| 문제 | rollback 기준 |
| --- | --- |
| adapter 오류 | mock adapter로 즉시 전환 가능한 feature flag 필요 |
| Rules 차단 과다 | dev/emulator에서 rules 수정 후 재검증 |
| 금액 불일치 | payment/order 생성 차단, mock으로 복귀 |
| 재고 불일치 | external sync 중단, 내부 재고 유지 |
| 알림 오발송 위험 | notification provider disabled |
| 배송 API 장애 | mock/manual status 유지 |

feature flag 구현은 현재 금지된 `.env` 없이 문서 후보로만 둔다.
