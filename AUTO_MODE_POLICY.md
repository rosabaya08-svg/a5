# Auto Mode Policy

작성일: 2026-05-19

## 1. 자동화 등급

| 등급 | 의미 | 허용 범위 | 중단 기준 |
| --- | --- | --- | --- |
| A | 자동 생성 가능 | 문서, 타입, mock 데이터, UI, 기본 mock API, 테스트 초안 | 결제/정산/보안/운영키/운영 DB 진입 |
| B | 부분 자동 | QR 세션 초안, 권한 모델 초안, PG/알림/배송/재고 mock adapter, 정산 계산 초안 | 공식 문서/키/정책 불명확, deep fix 필요 |
| C | 자동 실행 금지 | PG 운영키, 실결제, 운영 환불/부분취소, 정산 지급, 운영 배포, 개인정보/약관 최종 판단 | 항상 사람 승인 필요 |

## 2. 오늘 밤 허용 범위

허용:

- `PROJECT_RULES.md`, `DB_SCHEMA.md`, `STATUS_MODEL.md`, `SECURITY_POLICY.md`, `AUTO_MODE_POLICY.md`
- `types/**`
- `data/**`
- `lib/mock/**`
- `lib/adapters/*Mock.ts`
- `components/**`
- `app/admin/**`
- `app/company/**`
- `app/nursery/**`
- `app/tablet/**`
- `app/q/**`
- `app/orders/guest/**`
- `AUTO_REPORT.md`, `NEXT_TASKS.md`, `BLOCKERS.md`

## 3. 자동 수정 규칙

- lint/build 실패 시 안전 영역 오류만 최대 2회 수정한다.
- 실패 원인이 실제 Firebase, 실제 PG, Secret, 운영 배포, 정산 지급 처리라면 수정하지 않고 `BLOCKERS.md`에 기록한다.
- 외부 패키지 설치가 필요하면 설치하지 않고 `BLOCKERS.md`에 기록한다.

## 4. 보고 규칙

큰 단계 종료 시 다음을 기록한다.

- 수정/추가 파일
- 실행한 명령
- 성공/실패 결과
- 자동 수정 횟수
- 중단 항목
- 다음 작업
