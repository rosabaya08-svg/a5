import type { CartItemInput, ShippingFeePolicy } from "./types";

type ShippingAreaType = "standard" | "remote" | "island";

export type ShippingFeeBreakdown = {
  productSubtotal: number;
  baseFee: number;
  remoteAreaFee: number;
  totalFee: number;
  areaType: ShippingAreaType;
};

const remoteKeywords = [
  "\uc81c\uc8fc",
  "\uc6b8\ub989",
  "\ub3c5\ub3c4",
  "\ubc31\ub839",
  "\ub300\uccad",
  "\uc18c\uccad",
  "\ud751\uc0b0",
  "\ud64d\ub3c4",
  "\ucd94\uc790",
  "\uac70\ubb38",
  "\uc644\ub3c4",
  "\uc9c4\ub3c4",
  "\uc2e0\uc548",
  "\uc639\uc9c4",
  "\ub3c4\uc11c",
  "\uc0b0\uac04",
];

const islandKeywords = [
  "\uc6b8\ub989",
  "\ub3c5\ub3c4",
  "\ubc31\ub839",
  "\ub300\uccad",
  "\uc18c\uccad",
  "\ud751\uc0b0",
  "\ud64d\ub3c4",
  "\ucd94\uc790",
  "\uac70\ubb38",
  "\ub3c4\uc11c",
];

export const defaultShippingFeePolicy: ShippingFeePolicy = {
  mode: "free",
  baseFee: 0,
  freeThreshold: 0,
  remoteAreaEnabled: true,
  remoteAreaFee: 3000,
  islandAreaEnabled: true,
  islandAreaFee: 5000,
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9]/g, "");
    if (normalized) return Math.max(0, Number(normalized));
  }
  return fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function normalizeShippingFeePolicy(value: unknown): ShippingFeePolicy {
  const record = asRecord(value);
  const mode = record.mode === "paid" ? "paid" : "free";

  return {
    mode,
    baseFee: toNumber(record.baseFee ?? record.base_fee, defaultShippingFeePolicy.baseFee),
    freeThreshold: toNumber(record.freeThreshold ?? record.free_threshold, defaultShippingFeePolicy.freeThreshold),
    remoteAreaEnabled: toBoolean(record.remoteAreaEnabled ?? record.remote_area_enabled, true),
    remoteAreaFee: toNumber(record.remoteAreaFee ?? record.remote_area_fee, defaultShippingFeePolicy.remoteAreaFee),
    islandAreaEnabled: toBoolean(record.islandAreaEnabled ?? record.island_area_enabled, true),
    islandAreaFee: toNumber(record.islandAreaFee ?? record.island_area_fee, defaultShippingFeePolicy.islandAreaFee),
  };
}

export function detectShippingArea(address: string): ShippingAreaType {
  const target = address.replace(/\s/g, "");
  if (!target) return "standard";
  if (islandKeywords.some((keyword) => target.includes(keyword))) return "island";
  if (remoteKeywords.some((keyword) => target.includes(keyword))) return "remote";
  return "standard";
}

export function calculateCartShippingFee(
  items: Pick<CartItemInput, "unitPrice" | "quantity" | "shippingFeePolicy">[],
  input: { deliveryMethod?: "delivery" | "pickup"; address?: string },
): ShippingFeeBreakdown {
  const productSubtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const areaType = input.deliveryMethod === "delivery" ? detectShippingArea(input.address ?? "") : "standard";

  if (input.deliveryMethod !== "delivery" || items.length === 0) {
    return { productSubtotal, baseFee: 0, remoteAreaFee: 0, totalFee: 0, areaType };
  }

  let baseFee = 0;
  let remoteAreaFee = 0;

  for (const item of items) {
    const policy = normalizeShippingFeePolicy(item.shippingFeePolicy);
    const baseApplies = policy.mode === "paid" && !(policy.freeThreshold > 0 && productSubtotal >= policy.freeThreshold);

    if (baseApplies) baseFee = Math.max(baseFee, policy.baseFee);
    if (areaType === "island" && policy.islandAreaEnabled) remoteAreaFee = Math.max(remoteAreaFee, policy.islandAreaFee);
    if (areaType === "remote" && policy.remoteAreaEnabled) remoteAreaFee = Math.max(remoteAreaFee, policy.remoteAreaFee);
  }

  return {
    productSubtotal,
    baseFee,
    remoteAreaFee,
    totalFee: baseFee + remoteAreaFee,
    areaType,
  };
}
