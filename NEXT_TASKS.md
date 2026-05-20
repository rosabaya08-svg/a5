# Next Tasks

작성일: 2026-05-20

## 1. 현재 진행 작업

- mock/test 베타 생성
- 실제 Firebase/PG/Secret/운영 배포 제외
- App Router 기반 화면과 mock adapter 우선
- Firebase Console 상태 문서 반영: Web App 등록, Firestore Database 생성, Auth 이메일/비밀번호 활성화 완료
- Firestore Rules는 프로덕션 모드 잠금 상태이며 실제 연결 전 권한 설계 필요
- Storage는 Spark 요금제 제약으로 보류하며 상품 이미지/GIF는 mock placeholder 유지
- 고객은 비회원 QR 흐름 유지, 고객 로그인은 아직 만들지 않음

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
| 1 | Firestore Rules 권한 설계 | A | 관리자/기업/조리원/태블릿/고객 QR 읽기·쓰기 범위 문서화 |
| 2 | Auth 계정/claims 매트릭스 정리 | A | 이메일/비밀번호 계정은 관리자/기업/조리원용으로 한정하고 고객 로그인 제외 |
| 3 | Firebase Web App config 보관 방식 결정 | A | 코드 삽입 없이 config 관리 방식과 승인 절차만 문서화 |
| 4 | Storage 보류 정책 유지 | A | Blaze 업그레이드 전까지 mock placeholder 사용, 실제 Storage 연동 승인 기준 정리 |
| 5 | 입점사 상품 등록 전 Storage 승인 체크포인트 | B | 이미지/GIF 업로드가 필요한 시점과 별도 승인 항목 정리 |
| 6 | QR 상태 전이 테스트 초안 | B | active/paid/expired/cancelled 재사용 차단 케이스 정리 |
| 7 | 비회원 주문조회 인증 정책 초안 | C | 주문번호/휴대폰번호/개인정보 노출 범위 사람 승인용 문서화 |

## 5. 후속 개발 후보

| 우선순위 | 작업 | 등급 | 메모 |
| --- | --- | --- | --- |
| 1 | Browser smoke test 확대 | A | 주요 라우트 desktop/mobile 확인 |
| 2 | mock adapter 테스트 파일 추가 | A | 외부 패키지 없이 순수 함수 검증 방식 검토 |
| 3 | Firebase 연결 전 권한 설계 보강 | B | Firestore Rules, Auth Claims, config 보관 방식 문서만 |
| 4 | QR 상태 전이 테스트 초안 | B | paid/expired/cancelled 재사용 차단 케이스 |
| 5 | 비회원 주문조회 인증 정책 확정 | C | 사람 승인 필요 |
| 6 | Browser 런타임 경로 오류 확인 | A | 현재 HTTP smoke는 성공, in-app Browser 런타임은 내부 자산 경로 오류 |

## 3. 이후 사람 확인 필요

- 실제 프로젝트 루트 경로 표기 통일
- Firebase Web App config 보관 방식 결정
- Firestore Rules 권한 설계 승인
- Auth 이메일/비밀번호 계정 생성 범위와 Custom Claims 정책 승인
- Storage Blaze 요금제 전환 여부는 입점사 상품 등록 전 별도 승인
- PG 계약사/테스트 MID/공식 문서
- 카카오 알림톡 발송사/템플릿 승인
- 배송조회 API 또는 URL 방식 결정
- 외부 재고 API 공식 규격서
- 정산 수수료/차감/지급 정책
- 비회원 주문조회 인증 정책
