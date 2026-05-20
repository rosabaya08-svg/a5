# Next Tasks

작성일: 2026-05-20

## 1. 현재 진행 작업

- mock/test 베타 생성
- 실제 Firebase/PG/Secret/운영 배포 제외
- App Router 기반 화면과 mock adapter 우선

## 2. 다음 작업 후보

| 우선순위 | 작업 | 등급 | 상태 |
| --- | --- | --- | --- |
| 1 | 공통 타입/상태/역할 정의 | A | 완료 |
| 2 | mock 데이터 원장 생성 | A | 완료 |
| 3 | mock API 집계 함수 생성 | A | 완료 |
| 4 | 공통 UI 컴포넌트 생성 | A | 완료 |
| 5 | 최고관리자 mock UI | A | 완료 |
| 6 | 기업 Admin mock UI | A | 완료 |
| 7 | 산후조리원 Admin mock UI | A | 완료 |
| 8 | 태블릿 폐쇄몰 mock UI | A | 완료 |
| 9 | 고객 QR/비회원 주문조회 mock UI | A | 완료 |
| 10 | PG/알림/배송/재고 mock adapter | B | 완료 |

## 4. 내일 우선순위

| 우선순위 | 작업 | 등급 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | 고객 폐쇄몰 UI 모바일/태블릿 시각 점검 | A | `/tablet/products`, `/tablet/cart`, `/q/SANHO701`, `/orders/guest/A5-20260519-001` 화면 겹침 확인 |
| 2 | QR 상태 전이 테스트 초안 | B | active/paid/expired/cancelled 재사용 차단 케이스 정리 |
| 3 | 비회원 주문조회 인증 정책 초안 | C | 주문번호/휴대폰번호/개인정보 노출 범위 사람 승인용 문서화 |
| 4 | Firebase decision 보고서 작성 | B | 실제 연결 없이 기존/신규/dev-prod 분리 판단 문서화 |
| 5 | mock adapter 순수 함수 테스트 초안 | A | 외부 패키지 설치 없이 payment/notification/delivery/inventory mock 함수 검증 |
| 6 | 정산 정책 확인표 작성 | C | 수수료, 환불 차감, 지급일, 증빙 항목 승인 대기 문서화 |
| 7 | 관리자/기업/조리원 UI와 고객 UI 톤 통일 | A | 운영자 화면은 업무형, 고객 화면은 쇼핑몰형으로 유지 |

## 5. 후속 개발 후보

| 우선순위 | 작업 | 등급 | 메모 |
| --- | --- | --- | --- |
| 1 | Browser smoke test 확대 | A | 주요 라우트 desktop/mobile 확인 |
| 2 | mock adapter 테스트 파일 추가 | A | 외부 패키지 없이 순수 함수 검증 방식 검토 |
| 3 | Firebase decision 보고서 작성 | B | 실제 연결 없이 기존/신규 판단 문서만 |
| 4 | QR 상태 전이 테스트 초안 | B | paid/expired/cancelled 재사용 차단 케이스 |
| 5 | 비회원 주문조회 인증 정책 확정 | C | 사람 승인 필요 |
| 6 | Browser 런타임 경로 오류 확인 | A | 현재 HTTP smoke는 성공, in-app Browser 런타임은 내부 자산 경로 오류 |

## 3. 이후 사람 확인 필요

- 실제 프로젝트 루트 경로 표기 통일
- Firebase 기존/신규 프로젝트 결정
- PG 계약사/테스트 MID/공식 문서
- 카카오 알림톡 발송사/템플릿 승인
- 배송조회 API 또는 URL 방식 결정
- 외부 재고 API 공식 규격서
- 정산 수수료/차감/지급 정책
- 비회원 주문조회 인증 정책
