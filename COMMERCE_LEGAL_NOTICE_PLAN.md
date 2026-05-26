# Commerce Legal Notice Plan

## Scope

This document defines the A5 closed-mall beta compliance gate for company product registration and admin approval. It is an implementation checklist, not a final legal opinion.

## Required Seller Disclosure

Required before product approval:
- 상호
- 대표자명
- 사업자등록번호
- 통신판매업 신고번호
- 사업장 주소
- 대표 전화번호
- 이메일
- 고객 응대 연락처
- 반품지 주소

## Required Product Notice

Required before product approval:
- 상품명
- 모델명
- 제조사/수입사
- 제조국
- 제조연월 또는 사용기한
- 품질보증기준
- A/S 책임자 및 연락처

## Shipping, Exchange, Refund, A/S

Required before product approval:
- 배송비
- 도서산간 추가비
- 발송 예정일
- 교환/반품 가능 기간
- 교환/반품 제한 사유
- 파손/오배송 처리 기준
- 환불 처리 기준

## KC / Certification Gate

Required when applicable:
- KC 인증 대상 여부
- KC 인증번호
- 안전인증 / 안전확인 / 공급자적합성확인 구분
- 어린이제품 여부
- 전기용품/생활용품 여부
- 식품/건기식/화장품/의료기기 여부
- 인증서류 업로드 mock 상태

If a product is marked as KC-targeted, approval request is blocked until KC number and evidence status are present.

## Prohibited / Restricted Product Guard

Approval request must be blocked for:
- 총포
- 도검
- 화약류
- 폭발물
- 마약류
- 향정신성의약품
- 불법 의약품
- 미인증 전기용품
- 미인증 어린이제품
- 허위/과장 인증 상품
- 위조상품
- 불법 수입품
- 개인정보 침해 상품
- 사행성/불법 도박 관련 상품
- 법령상 판매 제한 품목

## Implemented Beta Files

- `types/compliance.ts`
- `data/legalCompliance.ts`
- `components/company/LegalNoticeChecklist.tsx`
- `components/company/ProductComplianceForm.tsx`
- `components/company/SellerDisclosureForm.tsx`
- `components/company/CertificationEvidenceUploader.tsx`
- `components/company/ReturnPolicyForm.tsx`
- `components/admin/ComplianceSummaryPanel.tsx`

## Approval Gate Logic

Approval request is enabled only when:
- No restricted product item is selected.
- Seller disclosure is complete.
- Product notice is complete.
- Return/exchange/refund/A/S notice is complete.
- The company confirms the product is not prohibited.
- KC target products have KC number and evidence status.

## Official Review Sources

- Fair Trade Commission e-commerce seller disclosure reference: https://www.ftc.go.kr/www/selectBbsNttView.do?bordCd=1&key=5&nttSn=32961
- KATS electric product safety marking reference: https://kats.go.kr/content.do?cmsid=227
- KATS children product safety certification reference: https://www.kats.go.kr/content.do?cmsid=496

## Blocker

The app can enforce checklist completeness and obvious red flags, but final legal judgment, product-category interpretation, certification validity, and wording approval require expert/legal review before production operation.
