# Storage Rules Plan

작성일: 2026-05-20

## 1. 목적

상품 이미지/GIF, 증빙 파일, 정산 파일을 Firebase Storage에 저장하기 전 경로 구조와 접근 원칙을 정리한다. 현재는 설계 단계이며 Storage bucket 연결이나 rules 파일은 만들지 않는다.

## 1-1. 2026-05-20 상태 업데이트

- Firebase 프로젝트 `a5-closed-mall`에서 Storage는 Spark 요금제 사용 불가 안내가 표시되어 현재 보류한다.
- Blaze 요금제 업그레이드는 이번 단계에서 지시하지 않는다.
- 상품 이미지/GIF는 실제 Storage가 아니라 현재 mock placeholder를 계속 사용한다.
- 실제 Storage 연동은 입점사 상품 등록 기능 구현 전 별도 승인 이후에만 검토한다.
- Storage SDK 연결, bucket 설정, `storage.rules` 생성, 실제 파일 업로드는 아직 하지 않는다.

## 2. 경로 구조 초안

```text
storage
├─ companies/{companyId}/products/{productId}/images/{fileName}
├─ companies/{companyId}/products/{productId}/gifs/{fileName}
├─ companies/{companyId}/orders/{orderId}/attachments/{fileName}
├─ nurseries/{nurseryId}/rooms/{roomId}/tablet-proofs/{fileName}
├─ settlements/{period}/{companyId}/{fileName}
├─ payouts/{period}/{companyId}/{fileName}
├─ policies/{policyId}/{fileName}
└─ audit-exports/{yyyy}/{mm}/{fileName}
```

## 3. 접근 원칙

| 경로 | 읽기 | 쓰기 |
| --- | --- | --- |
| `companies/{companyId}/products/**` | SUPER_ADMIN, 해당 COMPANY_ADMIN, 승인 상품은 tablet/customer read 후보 | 해당 COMPANY_ADMIN, SUPER_ADMIN |
| `companies/{companyId}/orders/**` | SUPER_ADMIN, 해당 COMPANY_ADMIN | 해당 COMPANY_ADMIN, server |
| `nurseries/{nurseryId}/rooms/**` | SUPER_ADMIN, 해당 NURSERY_ADMIN | 해당 NURSERY_ADMIN, server |
| `settlements/**` | SUPER_ADMIN, 해당 COMPANY_ADMIN scoped read | server, SUPER_ADMIN |
| `payouts/**` | SUPER_ADMIN only, 해당 COMPANY_ADMIN 제한 read 후보 | server, SUPER_ADMIN |
| `audit-exports/**` | SUPER_ADMIN only | server only |

## 4. 파일 검증 원칙

- 이미지: jpg, png, webp
- GIF: gif, 용량 제한 필요
- 증빙: pdf, jpg, png
- 정산 파일: pdf, csv, xlsx 후보
- 업로드 최대 용량은 정책 문서로 확정
- 파일명은 사용자 입력 그대로 쓰지 않고 서버에서 안전한 이름으로 재생성
- 업로드/삭제/교체는 `audit_logs` 기록

## 5. 운영 전 확인할 항목

- 상품 이미지/GIF 용량 제한
- mock placeholder에서 실제 Storage 이미지/GIF로 전환할 승인 시점
- 입점사 상품 등록 기능에서 업로드를 허용할 범위
- 정산/입금 파일 접근 권한
- 개인정보 포함 파일 암호화/보관 기간
- 삭제 정책과 법적 보존 기간
- signed URL 사용 여부

## 6. 현재 금지

Storage Rules 파일 생성, Firebase Storage SDK 연결, bucket 설정, 실제 파일 업로드, Storage Blaze 업그레이드 지시는 금지한다. 상품 이미지/GIF는 mock placeholder 상태를 유지한다.
