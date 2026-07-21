export type MallBanner = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  href: string;
  imageUrl: string;
  tone: "dark" | "gold" | "rose" | "sage";
  overlayEnabled?: boolean;
  textOverlayEnabled?: boolean;
  badgeEnabled?: boolean;
  autoDiscountCopyEnabled?: boolean;
};

export type MallBrand = {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
  status: "featured" | "new" | "review";
  companyId?: string;
  businessNo?: string;
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
    id?: string;
    type?: string;
    title: string;
    body: string;
    assetUrl?: string;
    assetPath?: string;
    assetFileName?: string;
    sortOrder?: number;
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
  assetUrl?: string;
  assetType?: string;
  body?: string;
  href?: string;
  videoActionType?: string;
  videoActionTarget?: string;
  videoCtaText?: string;
  videoCtaColor?: string;
  videoCtaFont?: string;
  videoCtaPosition?: string;
  videoCtaMotion?: string;
  videoCtaStartSeconds?: number;
  videoCtaDurationSeconds?: number;
  displayOrder?: number;
};
