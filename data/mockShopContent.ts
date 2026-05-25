export type MallBanner = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  href: string;
  imageUrl: string;
  tone: "dark" | "gold" | "rose" | "sage";
};

export type MallBrand = {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
  status: "featured" | "new" | "review";
};

export type MallProductProfile = {
  productId: string;
  brand: string;
  displayName: string;
  subtitle: string;
  category: string;
  imageUrl: string;
  gallery: string[];
  badges: string[];
  tags: string[];
  review: {
    rating: number;
    count: number;
    highlight: string;
  };
  detailTabs: {
    title: string;
    body: string;
  }[];
};

export type MarketingSlot = {
  id: string;
  title: string;
  placement: string;
  target: string;
  period: string;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  owner: string;
  performance: string;
};

export const mallHeroBanner: MallBanner = {
  id: "hero-hansan-sanho",
  title: "한국산후조리원연합회 공식 후원사 몰",
  subtitle: "산모와 아기를 위한 프리미엄 멤버십 전용 특가를 mock/test beta 화면으로 검증합니다.",
  eyebrow: "HANSANYEON EXCLUSIVE MEMBERSHIP ONLY",
  href: "/tablet/products",
  imageUrl: "https://mommy-a5.pages.dev/images/banners/hansan.jpg",
  tone: "gold",
};

export const mallPromoBanners: MallBanner[] = [
  {
    id: "promo-clearance-80",
    title: "최대 80% 할인",
    subtitle: "재고 정리 메가 핫딜",
    eyebrow: "TODAY'S MEGA DISCOUNT",
    href: "/tablet/products",
    imageUrl: "https://mommy-a5.pages.dev/images/banners/banner-80.jpg",
    tone: "dark",
  },
  {
    id: "promo-baby-50",
    title: "베이비 베스트 50%",
    subtitle: "수딩, 세라마이드, 베이비 케어",
    eyebrow: "BABY BEST HOT DEAL",
    href: "/tablet/products",
    imageUrl: "https://mommy-a5.pages.dev/images/banners/banner-50.jpg",
    tone: "rose",
  },
  {
    id: "promo-sanmo-35",
    title: "산모 케어 35% 할인",
    subtitle: "회복, 릴렉싱, 컨디션 케어",
    eyebrow: "SANMO CARE SPECIAL",
    href: "/tablet/products",
    imageUrl: "https://mommy-a5.pages.dev/images/banners/banner-35.jpg",
    tone: "sage",
  },
  {
    id: "promo-new-20",
    title: "신상품 20% 할인",
    subtitle: "신규 입점 브랜드 기획전",
    eyebrow: "NEW ARRIVALS",
    href: "/tablet/products",
    imageUrl: "https://mommy-a5.pages.dev/images/banners/banner-20.jpg",
    tone: "gold",
  },
];

export const mallBrands: MallBrand[] = [
  { id: "brand-mong", name: "몽쉘베베", logoUrl: "https://mommy-a5.pages.dev/images/logos/logo-mong.jpg", category: "베이비케어", status: "featured" },
  { id: "brand-zespa", name: "제스파", logoUrl: "https://mommy-a5.pages.dev/images/logos/logo-zespa.jpg", category: "산모케어", status: "featured" },
  { id: "brand-mili", name: "밀리맘", logoUrl: "https://mommy-a5.pages.dev/images/logos/logo-mili.jpg", category: "산모케어", status: "new" },
  { id: "brand-braun", name: "브라운", logoUrl: "https://mommy-a5.pages.dev/images/logos/logo-braun.jpg", category: "베이비용품", status: "featured" },
  { id: "brand-babyrock", name: "베이비락", logoUrl: "https://mommy-a5.pages.dev/images/logos/logo-babyrock.jpg", category: "영양", status: "review" },
  { id: "brand-nouhaus", name: "누하스", logoUrl: "https://mommy-a5.pages.dev/images/logos/logo-nouhaus.jpg", category: "리빙", status: "new" },
  { id: "brand-stenpot", name: "스텐팟", logoUrl: "https://mommy-a5.pages.dev/images/logos/logo-stenpot.jpg", category: "리빙", status: "featured" },
  { id: "brand-poled", name: "폴레드", logoUrl: "https://mommy-a5.pages.dev/images/logos/logo-poled.jpg", category: "외출", status: "featured" },
];

export const mallCategories = [
  { id: "best", label: "베스트", helper: "할인율 높은 상품" },
  { id: "new", label: "신상품", helper: "신규 입점 상품" },
  { id: "mom", label: "산모케어", helper: "회복과 릴렉싱" },
  { id: "baby", label: "베이비케어", helper: "아기 피부와 위생" },
  { id: "pickup", label: "현장수령", helper: "조리원 프론트 수령" },
  { id: "delivery", label: "택배배송", helper: "객실 외 배송" },
];

export const productProfiles: MallProductProfile[] = [
  {
    productId: "product-care-kit",
    brand: "몽쉘베베",
    displayName: "몽쉘베베 수딩앰플키트",
    subtitle: "침독, 태열 응급 처방템",
    category: "베이비케어",
    imageUrl: "https://mommy-a5.pages.dev/images/products/mong-ampoule.jpg",
    gallery: [
      "https://mommy-a5.pages.dev/images/products/mong-ampoule.jpg",
      "https://mommy-a5.pages.dev/images/products/mong-soothing.jpg",
      "https://mommy-a5.pages.dev/images/products/mong-cream.jpg",
    ],
    badges: ["50% 특가", "현장수령 가능"],
    tags: ["베스트", "수딩", "베이비"],
    review: { rating: 4.8, count: 128, highlight: "조리원 객실에서 바로 쓰기 좋은 구성" },
    detailTabs: [
      { title: "상품 상세", body: "산후조리원 객실에서 바로 확인할 수 있는 베이비 스킨케어 mock 상세 영역입니다." },
      { title: "배송/수령", body: "현장수령과 택배배송 모두 가능한 mock 정책입니다. 실제 배송조회 API는 연결하지 않습니다." },
      { title: "교환/반품", body: "운영 환불과 PG 취소는 blocker로 유지하며, 안내 문구만 표시합니다." },
    ],
  },
  {
    productId: "product-robe",
    brand: "밀리맘",
    displayName: "밀리맘 산모 릴렉스 로브",
    subtitle: "조리원 객실용 부드러운 착용감",
    category: "산모케어",
    imageUrl: "https://mommy-a5.pages.dev/images/products/mili-oilcream.jpg",
    gallery: [
      "https://mommy-a5.pages.dev/images/products/mili-oilcream.jpg",
      "https://mommy-a5.pages.dev/images/products/mili-lotion.jpg",
    ],
    badges: ["신상품", "옵션 재고 주의"],
    tags: ["산모", "의류", "신상품"],
    review: { rating: 4.6, count: 46, highlight: "가볍고 객실에서 착용하기 편한 mock 후기" },
    detailTabs: [
      { title: "상품 상세", body: "사이즈 옵션과 재고 상태를 확인하는 산모 의류 mock 상세입니다." },
      { title: "배송/수령", body: "택배배송 우선 상품으로 표시되며 실제 운송장 입력은 기업 Admin mock에서만 예약합니다." },
      { title: "교환/반품", body: "사이즈 교환 정책은 운영 전 승인 필요 항목입니다." },
    ],
  },
  {
    productId: "product-bag",
    brand: "폴레드",
    displayName: "폴레드 프리미엄 기저귀 백",
    subtitle: "외출 준비를 위한 수납형 프리미엄 백",
    category: "외출",
    imageUrl: "https://mommy-a5.pages.dev/images/products/braun-irt.jpg",
    gallery: [
      "https://mommy-a5.pages.dev/images/products/braun-irt.jpg",
      "https://mommy-a5.pages.dev/images/products/nouvo-o2.jpg",
    ],
    badges: ["브랜드관 추천", "택배배송"],
    tags: ["외출", "프리미엄", "브랜드관"],
    review: { rating: 4.7, count: 82, highlight: "수납 공간이 넉넉한 외출 준비 mock 후기" },
    detailTabs: [
      { title: "상품 상세", body: "브랜드관 노출과 기획전 연결을 고려한 프리미엄 상품 상세 mock입니다." },
      { title: "배송/수령", body: "택배배송 위주이며 실제 배송조회 API는 연결하지 않습니다." },
      { title: "교환/반품", body: "상품 훼손/사용 여부 판단은 운영 정책 승인 후 연결합니다." },
    ],
  },
  {
    productId: "product-snack",
    brand: "베이비락",
    displayName: "산모 영양 간식 세트",
    subtitle: "조리원 간식 추천 구성",
    category: "식품",
    imageUrl: "https://mommy-a5.pages.dev/images/products/mong-dishwash.jpg",
    gallery: ["https://mommy-a5.pages.dev/images/products/mong-dishwash.jpg"],
    badges: ["승인대기", "식품 고지 필요"],
    tags: ["식품", "영양", "간식"],
    review: { rating: 4.4, count: 31, highlight: "구성 확인이 필요한 식품 mock 상품" },
    detailTabs: [
      { title: "상품 상세", body: "식품 표시사항과 알레르기 안내가 필요한 mock 상세입니다." },
      { title: "배송/수령", body: "택배배송 mock이며 실제 식품 배송 정책은 미연동입니다." },
      { title: "교환/반품", body: "식품 환불 정책은 별도 승인 전까지 안내만 제공합니다." },
    ],
  },
  {
    productId: "product-tea",
    brand: "밀리맘",
    displayName: "산모 루이보스 티 세트",
    subtitle: "산후 회복 루틴을 위한 티 구성",
    category: "산모케어",
    imageUrl: "https://mommy-a5.pages.dev/images/products/mili-serum.jpg",
    gallery: ["https://mommy-a5.pages.dev/images/products/mili-serum.jpg"],
    badges: ["40% 특가", "택배배송"],
    tags: ["산모", "티", "회복"],
    review: { rating: 4.5, count: 57, highlight: "부담 없이 마시기 좋은 mock 후기" },
    detailTabs: [
      { title: "상품 상세", body: "원재료와 섭취 주의 문구를 표시해야 하는 산모 케어 mock 상세입니다." },
      { title: "배송/수령", body: "택배배송 mock으로 표시합니다." },
      { title: "교환/반품", body: "식품 교환 정책은 운영 전 승인 필요입니다." },
    ],
  },
  {
    productId: "product-pillow",
    brand: "누하스",
    displayName: "산모 자세 서포트 필로우",
    subtitle: "회복 자세를 돕는 리빙 케어",
    category: "리빙",
    imageUrl: "https://mommy-a5.pages.dev/images/products/santa-m.jpg",
    gallery: ["https://mommy-a5.pages.dev/images/products/santa-m.jpg"],
    badges: ["베스트", "현장수령 가능"],
    tags: ["산모", "리빙", "회복"],
    review: { rating: 4.9, count: 73, highlight: "객실에서 바로 체감되는 편안함 mock 후기" },
    detailTabs: [
      { title: "상품 상세", body: "객실 사용 이미지와 상세 설명을 배치할 mock 상세 영역입니다." },
      { title: "배송/수령", body: "현장수령과 택배배송 모두 표시합니다." },
      { title: "교환/반품", body: "사용 흔적 판단과 회수 정책은 운영 전 확인이 필요합니다." },
    ],
  },
  {
    productId: "product-blanket",
    brand: "몽쉘베베",
    displayName: "신생아 오가닉 블랭킷",
    subtitle: "부드러운 촉감의 베이비 리빙 상품",
    category: "베이비케어",
    imageUrl: "https://mommy-a5.pages.dev/images/products/mong-lotion.jpg",
    gallery: ["https://mommy-a5.pages.dev/images/products/mong-lotion.jpg"],
    badges: ["기획전", "재고 여유"],
    tags: ["베이비", "리빙", "선물"],
    review: { rating: 4.7, count: 64, highlight: "선물용으로 좋은 mock 후기" },
    detailTabs: [
      { title: "상품 상세", body: "소재, 크기, 세탁 안내를 담는 mock 상세 영역입니다." },
      { title: "배송/수령", body: "택배배송과 현장수령 모두 mock으로 표시합니다." },
      { title: "교환/반품", body: "교환/반품 안내는 정적 문구이며 실제 처리와 연결하지 않습니다." },
    ],
  },
];

export const productProfileById = Object.fromEntries(
  productProfiles.map((profile) => [profile.productId, profile]),
) as Record<string, MallProductProfile>;

export const marketingSlots: MarketingSlot[] = [
  {
    id: "slot-main-hero",
    title: "메인 히어로 배너",
    placement: "tablet home hero",
    target: "전체 조리원",
    period: "2026-05-22 ~ 2026-06-15",
    status: "approved",
    owner: "SUPER_ADMIN",
    performance: "노출 12,480 / 클릭 842 mock",
  },
  {
    id: "slot-promo-video",
    title: "산모케어 영상 광고",
    placement: "home video strip",
    target: "701~706 객실",
    period: "승인 전",
    status: "pending_approval",
    owner: "COMPANY_ADMIN",
    performance: "Storage Blaze 보류로 placeholder",
  },
  {
    id: "slot-brand-grid",
    title: "브랜드 로고 그리드",
    placement: "official brand partners",
    target: "전체 고객",
    period: "상시",
    status: "approved",
    owner: "SUPER_ADMIN",
    performance: "브랜드관 연결 mock",
  },
  {
    id: "slot-popup",
    title: "퇴실 전 픽업 안내 팝업",
    placement: "cart and QR",
    target: "현장수령 선택 고객",
    period: "운영정책 승인 전",
    status: "draft",
    owner: "NURSERY_ADMIN",
    performance: "알림톡 미연동 blocker",
  },
];
