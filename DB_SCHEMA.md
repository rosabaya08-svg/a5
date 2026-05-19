# DB Schema

작성일: 2026-05-19

## 1. 목적

이 문서는 mock/test 베타에서 사용할 데이터 원장 기준을 고정한다. 실제 Firestore, SQL, Firebase 연결 파일은 생성하지 않는다.

## 2. 핵심 컬렉션/모델

| 원장 | 모델 | 목적 |
| --- | --- | --- |
| 입점사 | `companies` | 기업 Admin, 수수료율, 승인 상태 |
| 조리원 | `nurseries` | 조리원, 객실, 태블릿 소유 기준 |
| 객실 | `rooms` | QR 출처의 room_id 기준 |
| 태블릿 | `tablets` | 폐쇄몰 접근 device/session 기준 |
| 상품 | `products` | 상품명, 가격, 가격비교, 승인 상태 |
| 옵션 | `product_options` | 옵션별 가격/재고 |
| 재고이동 | `inventory_movements` | 차감/복구/외부 API 동기화 이력 |
| 장바구니 | `carts`, `cart_items` | 태블릿 장바구니와 상품 snapshot |
| QR | `qr_payment_sessions` | 만료, 1회성, 출처 추적 |
| 주문 | `orders` | 고객 결제 단위 |
| 주문상세 | `order_items` | 입점사별 정산 기준 |
| 결제 | `payments` | mock PG 승인/실패/TID |
| 배송 | `delivery_events` | 송장/배송 이벤트 |
| 현장수령 | `pickup_events` | 조리원/기업 현장수령 처리 |
| 정산 | `settlements` | 기간별 정산 snapshot |
| 입금 | `payouts` | 지급 예정/검토/완료 상태. 실제 지급 처리 금지 |
| 알림 | `notification_logs` | mock 알림 발송 기록 |
| 감사 | `audit_logs` | 권한/금액/상태 변경 기록 |

## 3. 보존 원칙

- 주문 생성 후 상품명, 옵션, 가격은 snapshot으로 보존한다.
- 결제 승인 전 주문을 확정하지 않는다.
- QR 세션은 paid, expired, cancelled 이후 재사용할 수 없다.
- 재고 변경은 현재 수량만 수정하지 않고 movement 기록을 남긴다.
- 정산은 기간별 snapshot으로 검산하며 운영 지급과 분리한다.
- 권한, 금액, 상태 변경은 audit log에 남긴다.

## 4. mock 베타 데이터 출처

현재 베타는 `data/**` TypeScript 파일의 mock 데이터만 사용한다. Firebase, Firestore, Storage, Cloud Functions, Cloud Run에 연결하지 않는다.
