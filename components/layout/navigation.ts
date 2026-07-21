export type NavItem = {
  href: string;
  label: string;
  badge?: string;
  children?: NavItem[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const adminNavItems: NavSection[] = [
  {
    title: "메인",
    items: [{ href: "/admin/dashboard", label: "운영 대시보드" }],
  },
  {
    title: "입점사 관리",
    items: [
      { href: "/admin/companies/list", label: "입점사 목록" },
      { href: "/admin/companies", label: "가입 요청" },
      { href: "/admin/permissions", label: "권한 및 계정" },
    ],
  },
  {
    title: "PG 관리",
    items: [
      { href: "/admin/pg-settings/a5mall", label: "산후조리원 폐쇄몰" },
      { href: "/admin/pg-settings/a5s", label: "산지바로" },
      { href: "/admin/pg-settings/a5ws", label: "홀세일 폐쇄몰" },
      { href: "/admin/pg-settings/a5ls", label: "루쏘 부티끄" },
      { href: "/admin/pg-payment-logs", label: "결제 기록" },
    ],
  },
  {
    title: "상품 관리",
    items: [
      { href: "/admin/products/list", label: "상품 목록" },
      { href: "/admin/products", label: "판매중지 및 복구" },
    ],
  },
  {
    title: "홈 및 콘텐츠",
    items: [
      { href: "/admin/home-editor", label: "홈 편집" },
      { href: "/admin/marketing/banners", label: "배너 관리" },
      { href: "/admin/marketing/videos", label: "영상 관리" },
      { href: "/admin/company-ads", label: "기업 광고" },
      { href: "/admin/exhibitions", label: "기획전" },
      { href: "/admin/brands", label: "브랜드관" },
    ],
  },
  {
    title: "주문 및 매출",
    items: [
      { href: "/admin/orders", label: "주문 목록" },
      { href: "/admin/payments", label: "결제 내역" },
      { href: "/admin/settlements", label: "매출 대조" },
    ],
  },
  {
    title: "고객 관리",
    items: [
      { href: "/admin/customers/guests", label: "비회원 고객" },
      { href: "/admin/customers/visitors", label: "방문자 현황" },
      { href: "/admin/customers/orders", label: "고객 주문" },
    ],
  },
  {
    title: "조리원 관리",
    items: [
      { href: "/admin/nurseries", label: "조리원 목록" },
      { href: "/admin/rooms", label: "객실 현황" },
      { href: "/admin/tablets", label: "태블릿 현황" },
    ],
  },
  {
    title: "연동 및 시스템",
    items: [
      { href: "/admin/a5s", label: "A5S 운영 현황" },
      { href: "/admin/integrations", label: "외부 연동" },
      { href: "/admin/public-api-docs", label: "기업 API" },
      { href: "/admin/audit-logs", label: "감사 기록" },
      { href: "/admin/feature-status", label: "운영 점검" },
    ],
  },
];

export const companyNavItems: NavSection[] = [
  {
    title: "메인",
    items: [{ href: "/company/dashboard", label: "판매 현황" }],
  },
  {
    title: "상품 관리",
    items: [
      { href: "/company/products/dashboard", label: "상품 현황" },
      { href: "/company/products/list", label: "상품 목록" },
      { href: "/company/products/new", label: "상품 등록" },
      { href: "/company/excel", label: "엑셀 상품등록" },
      { href: "/company/inventory", label: "재고 현황" },
    ],
  },
  {
    title: "주문 및 배송",
    items: [
      { href: "/company/orders", label: "주문 목록" },
      { href: "/company/deliveries", label: "배송 및 현장수령" },
    ],
  },
  {
    title: "브랜드 및 홍보",
    items: [
      { href: "/company/brand-page", label: "브랜드관 편집" },
      { href: "/company/brand-events", label: "이벤트 및 공지" },
      { href: "/company/brand-messages", label: "고객 소통" },
      { href: "/company/ads", label: "기업 광고" },
    ],
  },
  {
    title: "매출 관리",
    items: [{ href: "/company/sales", label: "매출 현황" }],
  },
  {
    title: "계정",
    items: [{ href: "/company/account", label: "계정 및 보안" }],
  },
];

export const nurseryNavItems: NavSection[] = [
  {
    title: "메인",
    items: [{ href: "/nursery/dashboard", label: "운영 현황" }],
  },
  {
    title: "객실 및 태블릿",
    items: [
      { href: "/nursery/rooms", label: "객실 관리" },
      { href: "/nursery/tablets", label: "태블릿 관리" },
    ],
  },
  {
    title: "주문 및 결제",
    items: [
      { href: "/nursery/qr-history", label: "QR 주문 기록" },
      { href: "/nursery/orders", label: "주문 내역" },
    ],
  },
  {
    title: "현장수령",
    items: [{ href: "/nursery/pickups", label: "현장수령 관리" }],
  },
];
