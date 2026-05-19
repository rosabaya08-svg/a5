# A Project Risk Register

작성일: 2026-05-19

## 1. 범위

이 문서는 현재 프로젝트 스캔과 `a5-learning` 문서 기준으로 확인된 구현 전 리스크를 정리한 초안이다. 실제 코드 구현, Firebase 연결, PG/환불/정산/운영 배포 작업은 수행하지 않았다.

## 2. 리스크 목록

| ID | 리스크 | 영향 | 가능성 | 등급 | 대응 |
| --- | --- | --- | --- | --- | --- |
| R-001 | 사용자 요청 루트 `C:\Users\djfh\Desktop\my-app`와 실제 workspace `C:\Users\djfhl\Desktop\my-app` 불일치 | 잘못된 폴더 기준 작업 위험 | 중 | 높음 | 실제 루트 확인 후 이후 작업 지시 경로 통일 |
| R-002 | 현재 프로젝트가 기본 Next.js 골격이라 요구사항 구현이 거의 없음 | 일정/범위 오판 위험 | 높음 | 높음 | 구현 전 gap/architecture/Firebase 보고서 확정 |
| R-003 | Firebase 파일이 없고 기존/신규 프로젝트 판단 근거가 없음 | 인증/DB/보안 구조 지연 | 높음 | 높음 | Firebase decision 보고서 별도 작성 |
| R-004 | PG/알림톡/배송조회/외부 재고 API 공식 문서와 키 없음 | 추측 구현 또는 운영 사고 위험 | 높음 | 높음 | mock/test adapter만 허용하고 BLOCKERS 기록 |
| R-005 | 결제 금액을 프론트 값으로 처리할 경우 위변조 가능 | 금전 사고 | 높음 | 높음 | 서버 snapshot/정책 기준 재계산 필수 |
| R-006 | QR 만료/재사용/동시 결제 차단 미흡 | 중복 결제 또는 링크 악용 | 높음 | 높음 | QR 상태 전이, token hash, transaction 설계 필요 |
| R-007 | 입점사/조리원 권한 격리 누락 | 타사 주문/정산 데이터 노출 | 높음 | 높음 | `company_id`, `nursery_id`, role 검증 필수 |
| R-008 | 정산을 `orders` 총액 기준으로 구현 | 입점사별 금액 불일치 | 높음 | 높음 | `order_items` 기준 정산 원장 설계 |
| R-009 | Secret Key 또는 service account가 repo/.env에 생성됨 | 키 유출 | 높음 | 중 | Secret 생성 금지, Secret Manager/IAM 설계 후 진행 |
| R-010 | Next.js 16.2.6 문서를 확인하지 않고 과거 지식으로 구현 | API/구조 불일치 | 중 | 중 | 관련 작업 전 `node_modules/next/dist/docs/` 확인 |
| R-011 | `npm.ps1` 실행 정책 차단 | npm 명령 혼선 | 중 | 중 | PowerShell에서는 `npm.cmd` 사용 또는 정책 별도 확인 |
| R-012 | `npm ls`에서 extraneous 패키지 표시 | dependency 상태 혼선 | 낮음 | 중 | build/lint 전 원인 확인 |
| R-013 | `.next/` 산출물이 존재 | 현재 실행 상태 오판 | 낮음 | 중 | clean build 여부 별도 확인 |
| R-014 | 정책 문서 없이 바로 UI 구현 | 도메인/권한/결제 경계 이탈 | 높음 | 높음 | Gate 0 문서 확정 전 QR/PG/정산 개발 금지 |
| R-015 | mock adapter를 운영 연동처럼 보고 | 의사결정 오류 | 중 | 중 | mock/test/production 상태를 보고서에 명확히 표시 |

## 3. 현재 최고 리스크

가장 큰 리스크는 "기본 Next.js 프로젝트"를 실제 A 프로젝트 원본이 이미 구현된 프로젝트로 오해하는 것이다. 현재 기준으로는 구현 산출물보다 문서팩과 기본 설치 상태가 중심이며, Firebase/권한/원장/QR/결제/정산 구조는 별도 설계와 승인 후에 시작해야 한다.

## 4. 즉시 차단해야 할 작업

- 실결제 구현
- 운영 PG 키 등록
- 운영 환불/부분취소 구현
- 정산 지급 완료 처리
- 운영 배포
- `.env` 또는 Secret Key 생성
- Firebase 운영 프로젝트 연결
- 기존 파일 삭제 또는 대량 덮어쓰기

## 5. 권장 완화 순서

1. 실제 프로젝트 루트 경로를 확정한다.
2. Firebase 기존/신규 사용 여부를 별도 보고서로 결정한다.
3. `PROJECT_RULES.md`, `DB_SCHEMA.md`, `STATUS_MODEL.md`, `SECURITY_POLICY.md`, `AUTO_MODE_POLICY.md`를 먼저 작성한다.
4. App Router 영역 구조와 데이터 원장 설계를 확정한다.
5. 구현은 A등급 문서/UI/mock부터 시작하고, B/C등급은 보고서와 승인 절차로 분리한다.
