# Sabangnet Excel Export Plan

## Recommendation
A5 should start with a free/semi-manual integration before paid API work.

1. Clean A5 product DB.
2. Clean A5 order DB.
3. Export order Excel from A5 admin/company admin.
4. Join Sabangnet or Sabangnet Mini.
5. Confirm Sabangnet's required order upload template.
6. Match the A5 export template to that required format.
7. Test manual upload.
8. Operate order/invoice processing manually if it works.
9. Review paid API integration after order volume grows.

## Implemented Beta Export
- Company admin product page: product Excel CSV download.
- Company admin order page: order Excel CSV download.
- Company admin order page: invoice upload template CSV download.
- Format: UTF-8 BOM CSV for Excel compatibility.
- No paid API, no external upload, no Sabangnet credential, and no secret is used.

## A5 Order Export Fields
- 주문번호
- 주문일시
- 결제일시
- 주문상태
- 구매자명
- 연락처
- 이메일
- 수령자명
- 수령자 연락처
- 우편번호
- 주소
- 상세주소
- 상품코드
- 상품명
- 옵션명
- 수량
- 판매가
- 상품금액
- 배송비
- 총결제금액
- 결제수단
- 택배사
- 송장번호
- 배송메모
- 입점사ID
- 공급사명
- 정산상태

## Required A5-Specific Fields
- `입점사ID`
- `공급사명`
- `정산상태`
- `A5 상품코드`
- `사방넷 상품코드`

These fields are required because A5 is a closed mall with multiple companies and later needs order, shipment, settlement, and supplier separation.

## Not Implemented Yet
- Official Sabangnet Mini upload template confirmation.
- Direct Sabangnet API integration.
- Real invoice upload parsing and order update.
- Bulk order status mutation.
- Production shipping carrier API integration.

## Next
After Sabangnet template confirmation, rename/reorder the CSV headers to match the official format and add an import parser for invoice CSV upload.
