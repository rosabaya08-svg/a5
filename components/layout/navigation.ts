export type NavItem = {
  href: string;
  label: string;
  badge?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const adminNavItems: NavSection[] = [
  {
    title: "대시보드",
    items: [
      { href: "/admin/dashboard", label: "통합 대시보드" },
      { href: "/admin/feature-status", label: "기능 현황" },
    ],
  },
  {
    title: "입점사/계정",
    items: [
      { href: "/admin/companies", label: "입점사 관리" },
      { href: "/admin/permissions", label: "권한/계정" },
    ],
  },
  {
    title: "조리원/시설",
    items: [
      { href: "/admin/nurseries", label: "조리원 관리" },
      { href: "/admin/rooms", label: "객실 관리" },
      { href: "/admin/tablets", label: "태블릿 관리" },
    ],
  },
  {
    title: "상품/콘텐츠",
    items: [
      { href: "/admin/products", label: "상품 승인" },
      { href: "/admin/home-editor", label: "홈 편집" },
      { href: "/admin/marketing/banners", label: "배너/광고" },
      { href: "/admin/marketing/videos", label: "영상/GIF" },
      { href: "/admin/brands", label: "브랜드관" },
      { href: "/admin/exhibitions", label: "기획전" },
    ],
  },
  {
    title: "주문/결제/정산",
    items: [
      { href: "/admin/orders", label: "주문 관리" },
      { href: "/admin/payments", label: "결제 관리" },
      { href: "/admin/pg-settings", label: "인피니 PG 설정" },
      { href: "/admin/settlements", label: "정산 검토" },
    ],
  },
  {
    title: "외부 연동",
    items: [
      { href: "/admin/integrations", label: "외부 연동 센터" },
      { href: "/admin/public-api-docs", label: "A5 공개 API 문서" },
    ],
  },
  {
    title: "시스템/감사",
    items: [{ href: "/admin/audit-logs", label: "감사 로그" }],
  },
];

export const companyNavItems: NavSection[] = [
  {
    title: "대시보드",
    items: [
      { href: "/company/dashboard", label: "기업 대시보드" },
      { href: "/company/onboarding", label: "입점 신청 상태" },
    ],
  },
  {
    title: "상품 관리",
    items: [
      { href: "/company/products", label: "상품 목록" },
      { href: "/company/products/new", label: "상품 등록" },
      { href: "/company/products/preview", label: "상품 상세 미리보기" },
    ],
  },
  {
    title: "재고 관리",
    items: [{ href: "/company/inventory", label: "재고 현황" }],
  },
  {
    title: "주문 관리",
    items: [{ href: "/company/orders", label: "주문 목록" }],
  },
  {
    title: "엑셀 연동",
    items: [{ href: "/company/excel", label: "사방넷 엑셀 다운로드" }],
  },
  {
    title: "API 연동",
    items: [{ href: "/company/api-integration", label: "API 요청/다운로드" }],
  },
  {
    title: "배송/수령",
    items: [{ href: "/company/deliveries", label: "배송/현장수령" }],
  },
  {
    title: "매출/정산",
    items: [
      { href: "/company/sales", label: "매출 현황" },
      { href: "/company/payouts", label: "입금 예정" },
    ],
  },
  {
    title: "광고/브랜드",
    items: [
      { href: "/company/ads/banners", label: "배너 광고" },
      { href: "/company/ads/videos", label: "영상 광고" },
      { href: "/company/brand", label: "브랜드관" },
      { href: "/company/exhibitions", label: "기획전 참여" },
    ],
  },
];

export const nurseryNavItems: NavSection[] = [
  {
    title: "대시보드",
    items: [{ href: "/nursery/dashboard", label: "조리원 대시보드" }],
  },
  {
    title: "객실/태블릿",
    items: [
      { href: "/nursery/rooms", label: "객실 관리" },
      { href: "/nursery/tablets", label: "태블릿 관리" },
    ],
  },
  {
    title: "QR/주문",
    items: [
      { href: "/nursery/qr-history", label: "QR 이력" },
      { href: "/nursery/orders", label: "주문 이력" },
    ],
  },
  {
    title: "현장수령",
    items: [{ href: "/nursery/pickups", label: "현장수령 관리" }],
  },
];
