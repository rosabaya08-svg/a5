# Blockers

작성일: 2026-05-19

## 1. 현재 중단/확인 필요 항목

| ID | Blocker | 현재 상태 | 필요 조치 |
| --- | --- | --- | --- |
| B-001 | 프로젝트 루트 경로 불일치 | 사용자 요청 경로 `C:\Users\djfh\Desktop\my-app`는 존재하지 않고, 실제 workspace는 `C:\Users\djfhl\Desktop\my-app` | 이후 작업 기준 경로를 명확히 확정 |
| B-002 | Firebase 기존/신규 프로젝트 판단 불가 | `firebase.json`, `.firebaserc`, rules, env, Firebase dependency 없음 | Firebase decision 보고서 작성 및 사람 승인 |
| B-003 | 운영 Firebase 연결 금지 상태 | owner/IAM/환경 분리/운영 데이터 여부 확인 불가 | 개발/스테이징/운영 분리 정책 확정 전 연결 금지 |
| B-004 | PG 공식 문서/테스트 MID/운영 MID 없음 | 현재 프로젝트에 결제 설정 없음 | mock/test adapter 외 실제 PG 구현 금지 |
| B-005 | 카카오 알림톡 발송사/템플릿 승인 정보 없음 | 관련 설정 없음 | mock adapter 또는 템플릿 체크리스트까지만 허용 |
| B-006 | 배송조회 API 또는 택배사 URL 방식 미결정 | 관련 설정 없음 | 공식 API/계약 문서 확보 전 mock/URL 초안만 허용 |
| B-007 | 외부 명품쇼핑몰 재고 API 규격 없음 | 관련 설정 없음 | external stock mock adapter까지만 허용 |
| B-008 | 정산 정책 미확정 | 수수료율, 환불 차감, 배송비, 지급 기준 없음 | 정산 계산 초안/검산표 외 지급 처리 금지 |
| B-009 | 비회원 주문조회 인증 정책 미확정 | 개인정보 노출 기준 없음 | 주문번호/휴대폰 등 정책 확정 필요 |
| B-010 | Gate 0 정책 문서 부족 | `PROJECT_RULES.md`, `DB_SCHEMA.md`, `STATUS_MODEL.md`, `SECURITY_POLICY.md`, `AUTO_MODE_POLICY.md` 없음 | 구현 전 정책 문서 작성/승인 |
| B-011 | Next.js 16.2.6 변경사항 확인 필요 | `AGENTS.md`가 bundled docs 확인을 요구 | 구현 전 관련 `node_modules/next/dist/docs/` 문서 확인 |
| B-012 | npm PowerShell 실행 정책 차단 | `npm.ps1` 직접 실행 실패, `npm.cmd`는 가능 | 명령 실행 시 `npm.cmd` 사용 또는 정책 확인 |

## 2. 현재 허용 가능한 작업

현재 단계에서 허용 가능한 작업은 분석, 문서 작성, 보고서 정리, mock/test 설계 초안 작성까지다.

허용:

- 파일 인벤토리
- 설치 상태 보고
- gap 분석
- risk register
- Firebase decision 초안
- architecture map 초안
- 정책 문서 초안

금지:

- 코드 구현
- 기존 파일 삭제
- 대량 덮어쓰기
- Firebase 연결
- `.env` 또는 Secret Key 생성
- PG, 환불, 정산, 운영 배포
- 실결제 관련 구현

## 3. 다음 승인 필요 후보

1. 실제 프로젝트 루트 경로 확정
2. Firebase 기존 프로젝트 사용 여부 또는 신규 프로젝트 생성 여부 결정
3. `a5-learning` 문서 중 어떤 파일명을 최종 기준으로 삼을지 확정
4. Gate 0 정책 문서 작성 승인
5. 구현 시작 전 A/B/C 자동화 등급 적용 방식 승인
