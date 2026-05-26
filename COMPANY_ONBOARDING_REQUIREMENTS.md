# Company Onboarding Requirements

## Required Before Seller Activation

- Business registration certificate upload mock.
- Bankbook copy upload mock for settlement account review.
- 상호, 대표자명, 사업자등록번호, 통신판매업 신고번호.
- 사업장 주소, 대표 전화번호, 이메일.
- 고객 응대 연락처 and return address.
- Product category and certification responsibility confirmation.
- Restricted-product and legal notice agreement.

## Account Creation

- Do not issue or store plain passwords.
- Use Firebase Auth invite or password reset link.
- Apply `COMPANY_ADMIN` custom claim with `company_id`.
- Log invite, claim assignment, and account status changes to audit logs before production.

## Product Registration Gate

Company product approval request requires:
- Seller disclosure completed.
- Product notice completed.
- Shipping/exchange/refund/A/S notice completed.
- Prohibited product checklist passed.
- KC target status selected.
- KC number and evidence uploaded when applicable.
- Admin approval before sale.

## Upload Mock Slots

- `company-documents/{company_id}/business-registration`
- `company-documents/{company_id}/settlement-bankbook`
- `product-certifications/{company_id}/{product_id}/kc`
- `product-certifications/{company_id}/{product_id}/test-report`
- `product-certifications/{company_id}/{product_id}/brand-import`
- `product-media/{company_id}/{product_id}/detail-assets`

## Admin Review

The admin approval screen must show:
- Seller disclosure summary.
- Product notice summary.
- Restricted product red flags.
- KC/certification summary.
- Return/exchange/refund/A/S responsibility summary.
- Expert review required marker.

## Blockers

- Real file upload, malware scanning, file retention, and Storage lifecycle policy.
- Settlement account verification.
- Legal review of restricted categories and product-specific notice wording.
- KC certification validity check against official systems.
- Production refund, settlement payout, Alimtalk, delivery tracking, and external inventory APIs.
