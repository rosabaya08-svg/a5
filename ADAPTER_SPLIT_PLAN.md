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
