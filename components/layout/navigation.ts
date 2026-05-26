export type NavItem = {
  href: string;
  label: string;
  badge?: string;
};

export const adminNavItems: NavItem[] = [
  { href: "/admin/login", label: "최고관리자 로그인", badge: "Google" },
  { href: "/admin/dashboard", label: "대시보드" },
  { href: "/admin/companies", label: "입점사" },
  { href: "/admin/permissions", label: "권한/계정" },
  { href: "/admin/nurseries", label: "조리원" },
  { href: "/admin/rooms", label: "객실" },
  { href: "/admin/tablets", label: "태블릿" },
  { href: "/admin/products", label: "상품 승인" },
  { href: "/admin/marketing/banners", label: "배너/광고" },
  { href: "/admin/marketing/videos", label: "영상/GIF" },
  { href: "/admin/home-editor", label: "홈 편집" },
  { href: "/admin/brands", label: "브랜드관" },
  { href: "/admin/exhibitions", label: "기획전" },
  { href: "/admin/orders", label: "주문" },
  { href: "/admin/integrations", label: "외부 연동" },
  { href: "/admin/payments", label: "결제" },
  { href: "/admin/pg-settings", label: "PG 설정" },
  { href: "/admin/settlements", label: "정산 검토" },
  { href: "/admin/audit-logs", label: "감사 로그" },
];

export const companyNavItems: NavItem[] = [
  { href: "/company/login", label: "기업 로그인" },
  { href: "/company/dashboard", label: "대시보드" },
  { href: "/company/onboarding", label: "입점 신청" },
  { href: "/company/products", label: "상품" },
  { href: "/company/products/new", label: "상품 등록" },
  { href: "/company/products/preview", label: "상세 확인" },
  { href: "/company/ads/banners", label: "배너 광고" },
  { href: "/company/ads/videos", label: "영상 광고" },
  { href: "/company/brand", label: "브랜드관" },
  { href: "/company/exhibitions", label: "기획전 참여" },
  { href: "/company/orders", label: "주문" },
  { href: "/company/inventory", label: "재고" },
  { href: "/company/deliveries", label: "배송/수령" },
  { href: "/company/sales", label: "매출" },
  { href: "/company/payouts", label: "입금" },
];

export const nurseryNavItems: NavItem[] = [
  { href: "/nursery/login", label: "조리원 로그인" },
  { href: "/nursery/dashboard", label: "대시보드" },
  { href: "/nursery/rooms", label: "객실" },
  { href: "/nursery/tablets", label: "태블릿" },
  { href: "/nursery/pickups", label: "현장수령" },
  { href: "/nursery/qr-history", label: "QR 이력" },
  { href: "/nursery/orders", label: "주문 이력" },
];
