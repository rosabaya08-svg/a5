import type { Product } from "@/types/commerce";

export function brandNameKey(brandName: string) {
  return brandName.trim().toLowerCase().replace(/\s+/g, " ");
}

function safeSegmentPart(value: string) {
  const normalized = value.trim().toLowerCase();
  const encoded = Array.from(normalized)
    .map((char) => {
      if (/^[a-z0-9]$/.test(char)) return char;
      if (char === " " || char === "-" || char === "_") return "-";
      return `u${char.codePointAt(0)?.toString(36) ?? "0"}`;
    })
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return encoded || "brand";
}

export function brandIdForProductBrand(brandName: string, companyId = "company") {
  return `brand-${safeSegmentPart(companyId)}-${safeSegmentPart(brandName)}`;
}

export function productBrandName(product: Product) {
  return product.brand?.trim() || product.companyId;
}

export function isRegisteredProductForBrandPage(product: Product) {
  return Boolean(product.source) || product.id === "product-test-1004";
}
