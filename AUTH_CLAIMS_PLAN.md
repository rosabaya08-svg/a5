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
