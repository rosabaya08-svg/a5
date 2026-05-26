import type { QrPaymentSession } from "@/types/commerce";

export const mockQrSessions: QrPaymentSession[] = [
  {
    id: "qr-001",
    shortCode: "SANHO701",
    type: "purchase",
    status: "active",
    nurseryId: "nursery-test-1004",
    roomId: "room-701",
    tabletId: "tablet-701-a",
    cartId: "cart-nursery-test-1004-room-701-tablet-701-a",
    createdAt: "2026-05-19T15:12:00+09:00",
    expiresAt: "2026-05-19T18:12:00+09:00",
    deliveryMethod: "pickup",
    totalAmount: 127000,
    pickupLocation: {
      nurseryName: "A5 테스트 산후조리원",
      nurseryAddress: "서울시 강남구 테스트로 1004",
      roomId: "room-701",
      roomName: "701호",
    },
    items: [
      {
        productId: "product-care-kit",
        productName: "산모 회복 케어 키트",
        optionName: "기본 구성",
        unitPrice: 69000,
        quantity: 1,
        companyId: "company-test-1004",
      },
      {
        productId: "product-pillow",
        productName: "수유 자세 서포트 필로우",
        optionName: "단품",
        unitPrice: 58000,
        quantity: 1,
        companyId: "company-test-1004",
      },
    ],
  },
];
