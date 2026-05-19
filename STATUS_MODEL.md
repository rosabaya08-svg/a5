# Status Model

작성일: 2026-05-19

## 1. 상품 상태

| 상태 | 의미 | 다음 상태 |
| --- | --- | --- |
| `draft` | 기업 Admin 임시저장 | `pending_approval`, `archived` |
| `pending_approval` | 승인요청 | `approved`, `rejected` |
| `approved` | 판매 가능 | `suspended`, `archived` |
| `rejected` | 승인 반려 | `draft` |
| `suspended` | 판매 중지 | `approved`, `archived` |
| `archived` | 보관 | 없음 |

## 2. QR 세션 상태

| 상태 | 의미 | 다음 상태 |
| --- | --- | --- |
| `active` | 결제 가능 시간 안의 1회성 QR | `paid`, `expired`, `cancelled` |
| `paid` | mock 결제 완료 | 없음 |
| `expired` | 2~3시간 만료 | 없음 |
| `cancelled` | 운영자 또는 태블릿 취소 | 없음 |

금지 상태 이동:

- `paid`에서 `active`로 되돌리기 금지
- `expired`에서 결제 진행 금지
- 동일 QR 세션 다중 결제 금지

## 3. 주문 상태

| 상태 | 의미 | 다음 상태 |
| --- | --- | --- |
| `pending_payment` | 결제 전 | `paid`, `cancelled` |
| `paid` | mock 결제 완료 | `preparing`, `refund_requested` |
| `preparing` | 입점사 처리 중 | `shipping`, `ready_for_pickup`, `refund_requested` |
| `shipping` | 택배 배송 중 | `delivered` |
| `ready_for_pickup` | 현장수령 준비 | `picked_up` |
| `delivered` | 배송 완료 | `refund_requested` |
| `picked_up` | 현장수령 완료 | `refund_requested` |
| `refund_requested` | 환불 요청 | `refund_reviewed`, `refund_rejected` |
| `refund_reviewed` | 검토 완료. 운영 환불 실행 전 | `refund_approved_mock`, `refund_rejected` |
| `refund_approved_mock` | mock 환불 승인 표시 | 없음 |
| `refund_rejected` | 환불 반려 | 없음 |
| `cancelled` | 결제 전 취소 | 없음 |

## 4. 결제 상태

| 상태 | 의미 |
| --- | --- |
| `ready` | mock 결제 준비 |
| `approved_mock` | mock 승인 |
| `failed_mock` | mock 실패 |
| `cancel_requested` | 취소 요청. 실제 PG 취소 아님 |
| `cancelled_mock` | mock 취소 표시 |

## 5. 정산 상태

| 상태 | 의미 |
| --- | --- |
| `draft` | 계산 초안 |
| `review` | 검산 중 |
| `confirmed_mock` | mock 확정 표시 |
| `payout_blocked` | 실제 지급 금지/사람 승인 필요 |

정산 지급 완료 처리는 C등급 금지 작업이다.
