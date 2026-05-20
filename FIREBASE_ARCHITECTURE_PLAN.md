# Firebase Architecture Plan

작성일: 2026-05-20

## 1. 목표

`a5-closed-mall` Firebase 프로젝트를 산후조리원 폐쇄몰 기반 기업입점형 QR 결제 쇼핑몰의 인증, 데이터, 파일, 서버 로직, 감사 로그 기반으로 설계한다. 현재는 설계 단계이며 실제 Firebase 연결 코드는 만들지 않는다.

## 2. 전체 구조

```text
Next.js App Router mock/test beta
  ├─ Firebase Auth 계획
  │   └─ 관리자/기업/조리원/태블릿 권한 claims
  ├─ Firestore 계획
  │   └─ 상품, 장바구니, QR, 주문, 결제, 정산, 알림, 감사 원장
  ├─ Storage 계획
  │   └─ 상품 이미지/GIF, 증빙 파일, 정산 파일
  ├─ Cloud Functions 계획
  │   └─ QR 생성/만료, 결제 prepare/approve mock-to-real boundary, 알림 로그
  ├─ Cloud Run 후보
  │   └─ 정산 배치, 외부 재고 동기화, 대량 리포트
  └─ Secret Manager 계획
      └─ PG, 알림톡, 배송조회, 외부 재고 API 키
```

## 3. Firebase 서비스별 역할

| 서비스 | 역할 | 현재 상태 |
| --- | --- | --- |
| Firebase Auth | 관리자/기업/조리원/태블릿 권한 식별 | 설계만, 미연결 |
| Firestore | 커머스 원장 저장 | 설계만, 미연결 |
| Storage | 이미지/GIF/증빙/정산 파일 저장 | 설계만, 미연결 |
| Cloud Functions | 결제/QR/알림/웹훅 등 서버 경계 | 설계만, 미배포 |
| Cloud Run | 정산/외부 API/대량 작업 후보 | 후보만, 미배포 |
| Secret Manager | 운영키 보관 | 목록만, Secret 생성 금지 |

## 4. Next.js와 Firebase 경계

- Server Component: 목록/상세 조회 중심
- Client Component: 필터, 장바구니 조작, 폼 상태
- Server Action 후보: 상품 등록, 승인 요청, 송장 입력, QR 생성 요청
- Route Handler 후보: PG callback, 알림톡 callback, 배송조회 adapter, 외부 재고 sync
- Cloud Functions 후보: QR/결제/알림처럼 신뢰 경계가 필요한 서버 로직

## 5. Cloud Run이 필요한 후보

Cloud Functions로 충분하지 않을 수 있는 후보:

- 입점사별 월 정산 계산 배치
- 대량 주문/정산 CSV 또는 PDF 리포트 생성
- 외부 명품쇼핑몰 재고 API 대량 동기화
- 장기 실행 배송 상태 동기화
- 대시보드 summary 재계산
- 감사 로그 장기 보관/검색 인덱싱

## 6. dev/prod 분리 필요 시점

다음 중 하나라도 시작되면 dev/prod 분리가 필요하다.

- 실제 고객 개인정보 저장
- 실제 PG 테스트 MID/운영 MID 연결
- 실제 주문/결제/환불 원장 저장
- 카카오 알림톡 실제 발송
- 외부 재고 API 실제 호출
- 산후조리원/입점사 실계정 초대
- 운영 도메인 연결

## 7. 전환 로드맵

1. 현재 mock 데이터 구조와 Firestore schema plan 대조
2. Auth Custom Claims와 화면별 권한 매트릭스 확정
3. Firestore Rules 초안 작성
4. Storage Rules 초안 작성
5. Functions server logic plan 승인
6. Secret Manager에 넣을 값 목록 확정
7. dev Firebase 프로젝트만 연결
8. mock adapter와 dev adapter 병렬 유지
9. dev QA 후 prod 분리/운영 승인

## 8. 현재 금지

Firebase SDK 설치, config 삽입, `.env` 생성, deploy, service account 생성은 이번 단계에서 금지한다.
