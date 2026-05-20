import type {
  StorefrontBanner,
  StorefrontBenefit,
  StorefrontCategory,
  StorefrontPriceLayer,
} from "@/types/mockStorefrontView";

export const storefrontBanner: StorefrontBanner = {
  id: "storefront-banner-san-ho-701",
  eyebrow: "Closed mall for room guests",
  title: "Room 701 private shopping session",
  description:
    "A tablet-first closed mall preview with nursery context, QR expiration, member-only pricing, and mock-only checkout.",
  nurseryName: "Sanho Postpartum Care",
  roomName: "Room 701",
  expiresAt: "2026-05-20 23:10",
  riskStatuses: ["mock_only", "integration_pending"],
};

export const storefrontCategories: StorefrontCategory[] = [
  {
    id: "recovery",
    label: "Recovery",
    itemCount: 8,
    helper: "Care kits, comfort items, and room essentials.",
  },
  {
    id: "gift",
    label: "Gift",
    itemCount: 6,
    helper: "Visitor gifts and newborn celebration bundles.",
  },
  {
    id: "pickup",
    label: "Pickup",
    itemCount: 7,
    helper: "Products that can be handed over at the nursery desk.",
  },
  {
    id: "delivery",
    label: "Delivery",
    itemCount: 14,
    helper: "Mock delivery products with no carrier API call.",
  },
];

export const storefrontBenefits: StorefrontBenefit[] = [
  {
    id: "benefit-price",
    title: "Closed mall price",
    description: "Normal price, mock lowest price, and closed mall price are displayed together.",
    riskStatuses: ["mock_only"],
  },
  {
    id: "benefit-qr",
    title: "QR payment handoff",
    description: "Tablet cart can hand off a mock QR link to a mobile payer.",
    riskStatuses: ["integration_pending"],
  },
  {
    id: "benefit-pickup",
    title: "Pickup or delivery",
    description: "Fulfillment labels are previewed without delivery tracking integration.",
    riskStatuses: ["mock_only"],
  },
];

export const storefrontPriceLayers: StorefrontPriceLayer[] = [
  {
    id: "layer-price",
    title: "Price comparison layer",
    normalPriceLabel: "Normal price",
    closedMallPriceLabel: "Closed mall price",
    comparisonLabel: "Mock platform-lowest comparison",
    disclaimer: "This is not AI analysis and does not call an external price API.",
  },
  {
    id: "layer-session",
    title: "Session safety layer",
    normalPriceLabel: "Room and tablet source",
    closedMallPriceLabel: "QR expiration",
    comparisonLabel: "One-time mock payment entry",
    disclaimer: "Actual server-side validation is blocked until Firebase and PG approval.",
  },
];

