# mock 데이터 확장 계획

## 목적

운영 연동 없이도 화면 품질과 상태 처리를 검증할 수 있도록 mock 데이터의 상태 폭을 넓힌다.

## 상품 데이터

추가할 상태:

- 판매중
- 승인 대기
- 반려
- 품절
- 재고 부족
- 판매 중지
- 현장수령 전용
- 배송 전용
- 배송/현장수령 모두 가능

추가 필드 후보:

- `comparePrice`
- `closedMallPrice`
- `discountRate`
- `stockStatus`
- `pickupAvailable`
- `deliveryAvailable`
- `approvalStatus`
- `riskFlags`
- `priceInsightLabel`

## 주문 데이터

추가할 상태:

- 주문 생성
- 결제 대기
- mock 결제 성공
- mock 결제 실패
- 배송 준비
- 배송중
- 배송완료
- 현장수령 대기
- 현장수령 완료
- 환불 요청
- 환불 보류
- 취소 완료

추가 필드 후보:

- `orderNo`
- `guestPhoneMasked`
- `roomNumber`
- `nurseryId`
- `companyId`
- `paymentStatus`
- `fulfillmentType`
- `fulfillmentStatus`
- `settlementStatus`
- `itemSnapshots`
- `auditTrail`

## QR 세션 데이터

추가할 상태:

- 활성
- 만료
- 사용완료
- 취소
- 결제 실패 후 재시도 가능
- 이미 사용된 QR

추가 필드 후보:

- `shortCode`
- `qrSessionId`
- `expiresAt`
- `tabletId`
- `roomId`
- `nurseryId`
- `cartSnapshot`
- `payerIntent`
- `riskFlags`

## 운영 연동 금지 유지

- Firebase에 seed하지 않음
- 실제 Firestore 컬렉션 생성하지 않음
- 실제 PG 결제 데이터 생성하지 않음
- 실제 고객 개인정보 저장하지 않음
- 모든 값은 화면 검증용 mock/test 데이터로만 사용

