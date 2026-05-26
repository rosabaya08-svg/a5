import type {
  StorefrontBanner,
  StorefrontBenefit,
  StorefrontCategory,
  StorefrontPriceLayer,
} from "@/types/mockStorefrontView";

export const storefrontBanner: StorefrontBanner = {
  id: "storefront-banner-san-ho-701",
  eyebrow: "객실 고객 전용 산후조리원 핫딜",
  title: "701호 전용 쇼핑 세션",
  description:
    "조리원 정보, QR 만료, 회원 전용 가격, 모의 결제 흐름을 갖춘 태블릿 우선 산후조리원 핫딜 미리보기입니다.",
  nurseryName: "산호 산후조리원",
  roomName: "701호",
  expiresAt: "2026-05-20 23:10",
  riskStatuses: ["mock_only", "integration_pending"],
};

export const storefrontCategories: StorefrontCategory[] = [
  {
    id: "recovery",
    label: "회복",
    itemCount: 8,
    helper: "케어 키트, 편의용품, 객실 필수품",
  },
  {
    id: "gift",
    label: "선물",
    itemCount: 6,
    helper: "방문 선물과 신생아 축하 구성",
  },
  {
    id: "pickup",
    label: "현장수령",
    itemCount: 7,
    helper: "조리원 데스크에서 전달 가능한 상품",
  },
  {
    id: "delivery",
    label: "택배배송",
    itemCount: 14,
    helper: "택배사 API 호출 없는 모의 배송 상품",
  },
];

export const storefrontBenefits: StorefrontBenefit[] = [
  {
    id: "benefit-price",
    title: "산후조리원 핫딜 전용가",
    description: "정상가, 모의 최저가, 산후조리원 핫딜가를 함께 표시합니다.",
    riskStatuses: ["mock_only"],
  },
  {
    id: "benefit-qr",
    title: "QR 결제 전달",
    description: "태블릿 장바구니에서 모바일 결제자에게 모의 QR 링크를 전달합니다.",
    riskStatuses: ["integration_pending"],
  },
  {
    id: "benefit-pickup",
    title: "현장수령 또는 택배",
    description: "배송조회 연동 없이 수령 방식 라벨을 미리봅니다.",
    riskStatuses: ["mock_only"],
  },
];

export const storefrontPriceLayers: StorefrontPriceLayer[] = [
  {
    id: "layer-price",
    title: "가격 비교 레이어",
    normalPriceLabel: "정상가",
    closedMallPriceLabel: "산후조리원 핫딜가",
    comparisonLabel: "플랫폼 최저가 모의 비교",
    disclaimer: "AI 분석이 아니며 외부 가격 API를 호출하지 않습니다.",
  },
  {
    id: "layer-session",
    title: "세션 안전 레이어",
    normalPriceLabel: "객실과 태블릿 출처",
    closedMallPriceLabel: "QR 만료 시간",
    comparisonLabel: "1회용 모의 결제 진입",
    disclaimer: "Firebase와 PG 승인 전까지 실제 서버 검증은 차단됩니다.",
  },
];
