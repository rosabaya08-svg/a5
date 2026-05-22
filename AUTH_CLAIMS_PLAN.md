# Auth Claims Plan

작성일: 2026-05-20

## 1. 목적

Firebase Auth Custom Claims로 관리자, 입점사, 산후조리원, 태블릿 접근 범위를 분리한다. 고객/보호자는 원칙적으로 회원가입하지 않고 QR token 또는 주문조회 인증 흐름으로 접근한다.

## 2. 역할 구조

| role | 설명 | 필수 scope |
| --- | --- | --- |
| `SUPER_ADMIN` | 최고관리자 | 없음 또는 `admin_level` |
| `COMPANY_ADMIN` | 입점사 관리자 | `company_id` |
| `NURSERY_ADMIN` | 산후조리원 관리자 | `nursery_id` |
| `TABLET_DEVICE` | 객실 태블릿 세션 | `nursery_id`, `room_id`, `tablet_id` |
| `CUSTOMER_GUEST` | 비회원 고객 | Auth claim 비권장. QR token/주문조회 인증 |
| `PAYER_GUEST` | 조르기 결제자 | Auth claim 비권장. QR token 기반 |

## 2-1. 계정 사용 범위

현재 Firebase Authentication 이메일/비밀번호는 활성화되었지만, 실제 Auth 연결 코드는 만들지 않는다. 연결 전 계획상 이메일/비밀번호 계정은 관리자, 입점사, 산후조리원 운영자에게만 사용한다.

| 대상 | Auth 계정 | 이유 |
| --- | --- | --- |
| 최고관리자 | 사용 | 전체 운영/승인/감사 권한 필요 |
| 기업 Admin | 사용 | `company_id` 기준 상품/주문/정산 scope 필요 |
| 산후조리원 Admin | 사용 | `nursery_id` 기준 객실/태블릿/현장수령 scope 필요 |
| 태블릿 | 조건부 | 이메일/비밀번호보다 등록 코드 또는 device token 후보. claim에는 `tablet_id` 필요 |
| 고객/보호자 | 사용하지 않음 | 비회원 QR 결제/주문조회 흐름 유지 |

## 2-2. Scope 필드 표준

Firestore 문서 필드와 Claims는 snake_case를 기준으로 맞춘다.

| scope | 적용 role | 의미 | 검증 대상 |
| --- | --- | --- | --- |
| `role` | 전체 | 권한 분기 기준 | 모든 서버 로직 |
| `company_id` | `COMPANY_ADMIN` | 자기 입점사 데이터만 접근 | `products`, `order_items`, `settlements`, `delivery_events` |
| `nursery_id` | `NURSERY_ADMIN`, `TABLET_DEVICE` | 자기 조리원 데이터만 접근 | `rooms`, `tablets`, `orders`, `qr_payment_sessions`, `pickup_events` |
| `room_id` | `TABLET_DEVICE` | 객실 출처와 QR 생성 범위 | `carts`, `qr_payment_sessions` |
| `tablet_id` | `TABLET_DEVICE` | 태블릿 장치 식별 | `tablets`, `carts`, `qr_payment_sessions` |
| `admin_level` | `SUPER_ADMIN` | owner/operator/auditor 등 세부 운영 권한 후보 | 관리자 전용 화면/서버 로직 |

## 3. Custom Claims 예시

### 최고관리자

```json
{
  "role": "SUPER_ADMIN",
  "admin_level": "owner"
}
```

### 기업 Admin

```json
{
  "role": "COMPANY_ADMIN",
  "company_id": "company-sanho-care"
}
```

### 산후조리원 Admin

```json
{
  "role": "NURSERY_ADMIN",
  "nursery_id": "nursery-gangnam-01"
}
```

### 태블릿

```json
{
  "role": "TABLET_DEVICE",
  "nursery_id": "nursery-gangnam-01",
  "room_id": "room-701",
  "tablet_id": "tablet-701-a"
}
```

## 4. 권한 원칙

- `SUPER_ADMIN`은 전체 운영 데이터 접근 가능
- `COMPANY_ADMIN`은 자기 `company_id`의 상품, 주문상세, 정산, 배송만 접근
- `NURSERY_ADMIN`은 자기 `nursery_id`의 객실, 태블릿, QR 이력, 현장수령만 접근
- `TABLET_DEVICE`는 자기 객실 context에서 상품 read, cart/qr 생성 요청만 가능
- 고객/보호자는 Auth 계정을 만들지 않고 QR token 검증을 통과한 최소 화면만 접근

## 4-1. Firestore 접근 매트릭스 초안

| 컬렉션 | SUPER_ADMIN | COMPANY_ADMIN | NURSERY_ADMIN | TABLET_DEVICE | CUSTOMER/PAYER guest |
| --- | --- | --- | --- | --- | --- |
| `companies` | 전체 read/write | 자기 회사 read | 없음 | 없음 | 없음 |
| `nurseries` | 전체 read/write | 없음 | 자기 조리원 read | 자기 조리원 read 제한 | 없음 |
| `rooms` | 전체 read/write | 없음 | `nursery_id` 일치 read/write | `nursery_id`, `room_id` 일치 read | 없음 |
| `tablets` | 전체 read/write | 없음 | `nursery_id` 일치 read/write | `tablet_id` 일치 read | 없음 |
| `products` | 전체 read/write/approve | `company_id` 일치 write/read | approved read 후보 | approved read | QR 세션 snapshot 범위 read 후보 |
| `product_options` | 전체 read/write | `company_id` 일치 write/read | approved read 후보 | approved read | QR 세션 snapshot 범위 read 후보 |
| `carts` | 전체 read | 없음 | 없음 | 자기 `tablet_id` cart create/update | 없음 |
| `cart_items` | 전체 read | 없음 | 없음 | 자기 `tablet_id` cart item create/update | 없음 |
| `qr_payment_sessions` | 전체 read/write | scoped read 후보 | `nursery_id` 일치 read | 자기 `tablet_id` create/read | `token_hash` 검증 후 해당 세션 read |
| `orders` | 전체 read/write | 직접 read 금지, `order_items` 중심 | `nursery_id` 일치 read | 없음 | 주문조회 인증 후 해당 주문 read |
| `order_items` | 전체 read/write | `company_id` 일치 read/update 배송상태 | `nursery_id` 조인 필요 시 server mediated | 없음 | 주문조회 인증 후 해당 주문 item read |
| `payments` | 전체 read | 없음 | 없음 | 없음 | 해당 주문의 제한 정보만 server mediated |
| `settlements` | 전체 read/write | `company_id` 일치 read | 없음 | 없음 | 없음 |
| `audit_logs` | 전체 read, server append | 없음 | 없음 | 없음 | 없음 |

복잡한 조인이나 guest token 검증은 Firestore Rules만으로 해결하지 않고 Cloud Functions/서버 로직으로 중재한다.

## 4-2. 서버 검증 원칙

- Claims는 UI 숨김용이 아니라 서버 mutation 검증의 입력이다.
- `company_id`, `nursery_id`, `tablet_id`가 문서 필드와 일치하지 않으면 요청을 거부한다.
- `SUPER_ADMIN`이라도 결제/환불/정산 지급 실행은 별도 C등급 승인 게이트가 필요하다.
- 고객/보호자 guest 흐름은 Auth 계정 없이 `token_hash`, 주문번호, 휴대폰 hash 등 최소 인증으로 제한한다.
- 서버 SDK/Cloud Functions는 Firestore Rules를 우회할 수 있으므로 IAM, 서버 코드 검증, audit log를 별도로 둔다.

## 5. Claims 발급/변경 서버 로직

Custom Claims 설정은 클라이언트에서 하지 않는다. Cloud Functions 또는 관리자 서버에서만 수행한다.

필요 서버 액션:

- 입점사 승인 후 `COMPANY_ADMIN` claims 설정
- 산후조리원 승인 후 `NURSERY_ADMIN` claims 설정
- 태블릿 등록/재발급 시 `TABLET_DEVICE` claims 설정
- 계정 정지 시 claims 제거 또는 status 차단
- claims 변경 시 `audit_logs` 기록

## 6. 차단 항목

- 클라이언트 코드에 claims 설정 로직 작성 금지
- service account 생성 금지
- 실제 Auth 연결 금지
- 운영 사용자 초대 전 dev/prod 분리 필요
- 고객 Auth 계정 생성 금지
- claims 변경 후 audit log 누락 금지

## 7. 5일 베타 claims 계약

mock/test 베타 UI는 아래 claims 계약을 가정하고 화면과 repository scope를 맞춘다. 실제 Auth 연결, 사용자 초대, claims 설정 코드는 만들지 않는다.

| role | mock 화면에서 보는 범위 | 서버 전환 시 필수 검증 |
| --- | --- | --- |
| `SUPER_ADMIN` | 전체 KPI, 입점사, 조리원, 주문, 결제 mock, 정산 mock | 결제/환불/정산 실행은 별도 승인 gate |
| `COMPANY_ADMIN` | 자기 회사 상품, 옵션, 재고, 주문상세, 정산 | `company_id`가 문서와 일치해야 함 |
| `NURSERY_ADMIN` | 자기 조리원 객실, 태블릿, QR, 현장수령 | `nursery_id`가 문서와 일치해야 함 |
| `TABLET_DEVICE` | 자기 객실 상품 read, cart/QR 생성 | `nursery_id`, `room_id`, `tablet_id` 모두 일치해야 함 |
| `CUSTOMER_GUEST` | QR landing, 결제 전 확인, 주문조회 | Auth claims 없음. `token_hash`와 주문조회 인증으로 제한 |
| `PAYER_GUEST` | 조르기 결제자 입력/확인 | Auth claims 없음. QR token 만료와 1회 사용 검증 |

## 8. Claims 변경 lifecycle

1. 최고관리자가 입점사 또는 조리원을 승인한다.
2. 서버 action이 해당 운영자 계정에 role과 scope claims를 설정한다.
3. claims 변경 이벤트를 `audit_logs`에 append한다.
4. 클라이언트는 token refresh 후 새 claims를 받는다.
5. 정지 또는 계약 종료 시 claims 제거와 계정 status 차단을 함께 수행한다.

실제 구현 전까지는 이 흐름을 문서와 mock 상태 배지로만 표현한다.

## 9. 거부 조건

| 조건 | 처리 |
| --- | --- |
| role 없음 | 관리자 화면 접근 거부 |
| `COMPANY_ADMIN`인데 `company_id` 없음 | 모든 company mutation 거부 |
| `NURSERY_ADMIN`인데 `nursery_id` 없음 | 모든 nursery mutation 거부 |
| `TABLET_DEVICE`인데 `tablet_id` 없음 | cart/QR 생성 거부 |
| claims scope와 문서 scope 불일치 | `FORBIDDEN_SCOPE` |
| guest가 list query 요청 | 거부, 단일 QR/order 조회만 허용 |
| client가 claims 변경 요청 | 거부, server only |

## 10. TABLET_DEVICE 보안 후보

태블릿은 일반 이메일 로그인보다 다음 중 하나를 별도 검토한다.

| 방식 | 장점 | 보류 사유 |
| --- | --- | --- |
| 등록 코드 기반 | 현장 설치가 쉬움 | 코드 유출 시 재발급 절차 필요 |
| device token 기반 | 장치별 차단 가능 | 발급/보관 정책 필요 |
| 제한된 Auth 계정 | Firebase claims 적용 쉬움 | 객실 변경/기기 교체 운영 부담 |

현재 단계에서는 `TABLET_DEVICE` claims 구조만 확정하고, 발급 방식은 `reports/firebase-contract/BLOCKERS.md`에 결정 필요 항목으로 남긴다.

## 11. Batch 04 최종 claims payload 계약

| role | claims payload | 발급 주체 | 회수 조건 |
| --- | --- | --- | --- |
| `SUPER_ADMIN` | `role`, `admin_level` | server admin action | 운영자 퇴사, 권한 회수, 보안 사고 |
| `COMPANY_ADMIN` | `role`, `company_id` | 입점사 승인 server action | 입점 정지, 계약 종료, 계정 정지 |
| `NURSERY_ADMIN` | `role`, `nursery_id` | 조리원 승인 server action | 조리원 계약 종료, 계정 정지 |
| `TABLET_DEVICE` | `role`, `nursery_id`, `room_id`, `tablet_id` | 태블릿 등록 server action | 객실 변경, 태블릿 분실, 재발급 |
| `CUSTOMER_GUEST` | Auth claims 사용하지 않음 | 없음 | QR token 만료 또는 주문조회 인증 실패 |

Claims에는 이름, 전화번호, 이메일 외 민감정보, 정산계좌, PG 정보, Secret을 넣지 않는다.

## 12. Scope 접근 규칙 상세

| scope | 일치 조건 | 실패 코드 | 감사 로그 |
| --- | --- | --- | --- |
| `company_id` | claims.company_id와 문서 company_id 일치 | `FORBIDDEN_SCOPE` | company scope mismatch |
| `nursery_id` | claims.nursery_id와 문서 nursery_id 일치 | `FORBIDDEN_SCOPE` | nursery scope mismatch |
| `room_id` | TABLET_DEVICE의 room_id와 cart/QR room_id 일치 | `FORBIDDEN_SCOPE` | room scope mismatch |
| `tablet_id` | TABLET_DEVICE의 tablet_id와 cart/QR tablet_id 일치 | `FORBIDDEN_SCOPE` | tablet scope mismatch |
| guest token | `token_hash` 일치, 만료 전, 1회 사용 조건 충족 | `QR_EXPIRED`, `QR_ALREADY_USED`, `FORBIDDEN_SCOPE` | guest token check result |

## 13. CUSTOMER_GUEST QR 인증 흐름

고객/보호자는 Firebase Auth 계정을 만들지 않는다.

1. 태블릿이 QR session을 생성한다.
2. 서버가 `short_code`와 원문 token을 발급하되, Firestore에는 `token_hash`만 저장한다.
3. 고객 QR landing은 `short_code`와 token을 함께 제시해야 한다.
4. 서버는 `status`, `expires_at`, `used_at`, `token_hash`를 검증한다.
5. 결제 성공 후에는 QR을 `paid`로 바꾸고 재사용을 차단한다.
6. 주문조회는 주문번호와 휴대폰 hash 또는 별도 lookup token 후보로 제한한다.

`short_code`만으로 상품 원장, 주문 상세, 결제 상태 변경을 허용하지 않는다.

## 14. Rules 문서 초안에 반영할 claim helpers

실제 `firestore.rules` 파일은 만들지 않는다. 아래는 문서상 helper 후보만 정리한다.

| helper 후보 | 의미 |
| --- | --- |
| `isSuperAdmin()` | `request.auth.token.role == "SUPER_ADMIN"` |
| `isCompanyAdmin(companyId)` | role이 `COMPANY_ADMIN`이고 token `company_id` 일치 |
| `isNurseryAdmin(nurseryId)` | role이 `NURSERY_ADMIN`이고 token `nursery_id` 일치 |
| `isTabletDevice(nurseryId, roomId, tabletId)` | role이 `TABLET_DEVICE`이고 세 scope 모두 일치 |
| `isServerMediated()` | 클라이언트 Rules로 해결하지 않고 server action으로만 허용해야 하는 작업 |

guest token 검증, 금액 재계산, 재고 차감, 주문 생성, payment confirm은 Rules helper가 아니라 서버 로직으로 처리한다.

## 15. Batch 28 Custom Claims 검증 매트릭스

| 대상 | 허용 | 금지 | 검증 기준 |
| --- | --- | --- | --- |
| `SUPER_ADMIN` | 전체 운영 조회, 승인/반려/차단, 정산 검토 mock | 실제 PG 환불, 실제 지급, Secret 조회 | role, admin_level, C등급 gate |
| `COMPANY_ADMIN` | 자기 `company_id` 상품/옵션/주문상세/배송/정산 조회 | 타 회사 상품/정산/주문, 결제 원장 직접 수정 | `company_id` 일치 |
| `NURSERY_ADMIN` | 자기 `nursery_id` 객실/태블릿/QR/현장수령/주문 이력 | 타 조리원 QR/주문/객실, 결제 상태 변경 | `nursery_id` 일치 |
| `TABLET_DEVICE` | 자기 `tablet_id` cart/QR 생성 요청, 승인 상품 read | 주문 확정, 결제 승인, 재고 차감, 관리자 화면 | `nursery_id`, `room_id`, `tablet_id` 모두 일치 |
| `CUSTOMER_GUEST` | token 검증된 QR landing, 결제 전 확인, 자기 주문조회 | list query, 상품 원장 직접 조회, 결제/환불 상태 직접 변경 | `short_code`, `token_hash`, `expires_at`, one-time use |

## 16. Batch 29 CUSTOMER_GUEST 비회원 QR 흐름

| 항목 | 기준 |
| --- | --- |
| `short_code` | URL 노출용 짧은 코드. 단독 인증 수단 아님 |
| QR token | 고객 URL에 포함되는 원문 후보. 서버는 hash만 저장 |
| `token_hash` | Firestore 저장값. 원문 token 저장 금지 |
| `expires_at` | QR 만료 시각. 만료 후 결제/조회 차단 |
| `one_time_use` | `used_at` 또는 `status = used/paid` 이후 재사용 금지 |
| payer_info | 결제자 이름/연락처 입력은 mock 단계에서 최소화, 저장 시 masked/hash 후보 |
| 주문조회 | `order_no` + phone hash 또는 lookup token 후보. Auth 계정 생성 없음 |

고객이 결제 화면에서 입력한 금액, 상품명, 옵션명은 신뢰하지 않고 QR snapshot과 서버 재계산을 따른다.
