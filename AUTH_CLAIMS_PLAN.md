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

## 7. 2026-05-25 계정 발급 보강

최고관리자가 기업 Admin 아이디/비밀번호를 “직접 발급”하는 UI를 만들더라도 비밀번호 평문을 저장하거나 전달하지 않는다.

권장 흐름:

1. 최고관리자가 기업 이메일과 `company_id`를 등록한다.
2. 서버가 Firebase Auth 사용자를 초대하거나 password reset link를 발급한다.
3. 서버가 Custom Claims를 설정한다.
4. 사용자가 직접 비밀번호를 설정한다.
5. claims 변경과 초대 발송을 `audit_logs`에 남긴다.

필수 claims:

| 역할 | 필수 claims |
| --- | --- |
| `SUPER_ADMIN` | `role` |
| `COMPANY_ADMIN` | `role`, `company_id` |
| `NURSERY_ADMIN` | `role`, `nursery_id` |
| `TABLET_DEVICE` | `role`, `nursery_id`, `room_id`, `tablet_id` |

고객/보호자는 Auth 계정을 만들지 않고 QR token, 주문번호, 휴대폰 hash 기반 비회원 흐름을 유지한다.
# 2026-05-25 Implementation Update

Repo additions:
- `types/authClaims.ts`
- `functions/src/auth/verifyClaims.ts`
- `functions/src/auth/setCustomClaims.ts`
- `functions/src/auth/inviteAdminUser.ts`
- `components/admin/AdminInvitePanel.tsx`
- `app/admin/permissions/page.tsx`

Claim structure:
- `role`: `SUPER_ADMIN | COMPANY_ADMIN | NURSERY_ADMIN | TABLET_DEVICE | CUSTOMER_GUEST | seed_admin`
- `company_id`: company admin scope.
- `nursery_id`: nursery admin and tablet scope.
- `room_id`: tablet room scope.
- `tablet_id`: tablet device scope.
- `seed_admin`: initial seed/admin write helper flag.

Account rule:
- Do not store plain passwords.
- Invite/reset links are the intended Firebase Auth flow.
- Bulk user creation remains blocked until owner review.

# 2026-05-26 Auth/RBAC Implementation Skeleton

This pass keeps Firebase Admin private keys out of the repo and prepares the role contract for a trusted Firebase Functions runtime.

## Roles

| Role | Purpose | Required scope |
| --- | --- | --- |
| `SUPER_ADMIN` | A5 operator with global admin/seed write authority | none |
| `COMPANY_ADMIN` | Seller company operator | `company_id` |
| `NURSERY_ADMIN` | Nursery operator | `nursery_id` |
| `TABLET_DEVICE` | Room tablet/device scoped storefront access | `nursery_id`, `room_id`, `tablet_id` |
| `CUSTOMER_GUEST` | Non-login QR payer/order lookup flow | no Firebase Auth account |
| `seed_admin` | Temporary beta seed/admin write role | none, but must be audited and removed before production |

## Added Contracts

- `types/authClaims.ts` now defines shared frontend/documentation types and helpers:
  - `A5AuthRole`
  - `A5AssignableAuthRole`
  - `A5RoleScope`
  - `A5AuthClaims`
  - `canSeedOrAdminWrite`
  - `canAccessCompany`
  - `canAccessNursery`
  - `canAccessTablet`
  - `canAccessScopedResource`
  - `validateClaimsForRole`
  - `buildAssignableClaims`
- `functions/src/auth/verifyClaims.ts` mirrors the trusted runtime validation helpers for Functions.
- `functions/src/auth/setCustomClaims.ts` validates requester and target claims before calling `setCustomUserClaims`.
- `functions/src/auth/inviteAdminUser.ts` prepares the invitation/password reset contract and explicitly marks `plainPasswordStored: false` and `bulkUserCreation: false`.
- `components/admin/AdminInvitePanel.tsx` shows the role matrix, required scopes, invite flow, and blocked guest/password practices in `/admin/permissions`.

## Access Rules Prepared for Firestore/Functions

1. `seed_admin` and `SUPER_ADMIN` may perform seed/admin write after server verification.
2. `COMPANY_ADMIN` may access only resources where `company_id` matches its claim.
3. `NURSERY_ADMIN` may access only resources where `nursery_id` matches its claim.
4. `TABLET_DEVICE` may access only resources where `nursery_id`, `room_id`, and `tablet_id` all match.
5. `CUSTOMER_GUEST` is not assignable as a Firebase Auth custom claim in this beta skeleton. Guest access remains QR/session/order verification based.

## Explicitly Still Blocked

- Creating or committing Firebase Admin private keys.
- Creating `.env.local` values in Git.
- Bulk user creation.
- Plain text password issuance or storage.
- Production role assignment without audit log, owner approval, and account recovery policy.
