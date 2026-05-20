# Firebase Decision Report

작성일: 2026-05-20

## 1. 결정 요약

| 항목 | 결정 |
| --- | --- |
| Firebase 프로젝트 | 신규 프로젝트 `a5-closed-mall` 사용 |
| 기존 프로젝트 `signage-partner` | 사용하지 않음 |
| 주 관리 계정 | `rosabaya08@gmail.com` |
| 공동 관리자/백업 계정 | `ha2ru860901@gmail.com` 추가 필요 |
| 현재 단계 | 설계 보고서 작성 단계 |
| 실제 연결 | 금지. Firebase config, `.env`, service account, deploy 없음 |

## 2. 기존 `signage-partner`를 사용하지 않는 이유

`signage-partner`는 이름과 맥락상 기존 signage/partner 목적의 프로젝트로 보이며, 산후조리원 폐쇄몰 기반 기업입점형 QR 결제 쇼핑몰의 데이터, 권한, 결제, 정산, 알림, 감사 로그를 함께 담기에는 경계가 불명확하다.

신규 `a5-closed-mall`을 쓰는 이유:

- 폐쇄몰 커머스 전용 데이터와 기존 signage 데이터를 분리한다.
- 결제/주문/정산/QR/고객 개인정보성 데이터가 다른 프로젝트와 섞이는 것을 막는다.
- Firestore Rules, Auth Custom Claims, Storage Rules, Functions 권한을 A5 커머스 목적에 맞춰 설계할 수 있다.
- 운영 사고가 발생해도 기존 signage/partner 시스템으로 영향이 번지는 것을 줄인다.
- dev/prod 분리와 IAM 권한 설계를 처음부터 커머스 기준으로 잡을 수 있다.

## 3. `rosabaya08@gmail.com`으로 통합 관리하는 이유

`rosabaya08@gmail.com`을 주 관리 계정으로 두면 GitHub remote, 개발 산출물, Firebase Console 권한, 향후 GCP 리소스 관리를 한 계정 흐름으로 정리할 수 있다.

기대 효과:

- 프로젝트 소유권과 책임 계정이 명확하다.
- GitHub 저장소와 Firebase 프로젝트의 운영 주체를 맞출 수 있다.
- API Key, IAM, Billing, Functions, Cloud Run, Secret Manager 변경 이력을 추적하기 쉽다.
- 개발자/운영자 계정 추가와 회수를 한 곳에서 관리할 수 있다.

## 4. `ha2ru860901@gmail.com` 공동 관리자/백업 계정 추가 이유

단일 계정만 Owner/Admin이면 계정 잠김, 2FA 분실, 결제/권한 이슈가 생겼을 때 프로젝트 접근이 막힐 수 있다. `ha2ru860901@gmail.com`은 공동 관리자 또는 백업 계정으로 추가해 복구 경로를 확보해야 한다.

권장:

- 최소 역할: Firebase Admin 또는 GCP IAM의 적정 관리자 역할
- 운영 전 Owner/결제 관리자/보안 관리자 역할은 실제 책임자 기준으로 분리 검토
- 비밀번호/2FA/복구 이메일을 별도 확인
- 공동 관리자 추가 후 불필요한 외부 계정은 제거

## 5. 현재 결정값

결정값: `CREATE_NEW_DEV_AND_PROD`

단, 현재 즉시 dev/prod 두 프로젝트를 모두 연결하지 않는다. 우선 `a5-closed-mall`은 개발/검증 기준의 Firebase 설계 대상으로 보고, 실사용 데이터와 결제가 붙기 전 별도 prod 분리 시점을 다시 판단한다.

## 6. 금지 유지

- Firebase config 코드 삽입 금지
- `.env` 생성 금지
- Secret Key 생성 금지
- service account 생성 금지
- Firestore 실제 연결 금지
- deploy 금지
