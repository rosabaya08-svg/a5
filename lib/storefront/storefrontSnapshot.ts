import { cache } from "react";
import { getLiveStorefrontRuntimeSnapshot } from "@/lib/repositories/liveCommerceRepository";
import type { StorefrontContent } from "@/lib/repositories/types";
import { normalizeSharedClosedMallProducts } from "@/lib/storefront/sharedClosedMallCatalog";
import type { Product } from "@/types/commerce";

const emptyContent: StorefrontContent = {
  heroBanner: {
    id: "empty",
    title: "",
    subtitle: "",
    eyebrow: "",
    href: "/tablet/products/",
    imageUrl: "",
    tone: "rose",
  },
  promoBanners: [],
  brands: [],
  categories: [],
  productProfiles: [],
  marketingSlots: [],
};

export const readStorefrontRuntimeBundle = cache(
  async (): Promise<{ products: Product[]; content: StorefrontContent }> => {
    const read = await getLiveStorefrontRuntimeSnapshot();

    return {
      products: normalizeSharedClosedMallProducts(read.data.products ?? []),
      content: read.data.content ?? emptyContent,
    };
  },
);

export async function readStorefrontApprovedProductsSnapshot(): Promise<Product[]> {
  return (await readStorefrontRuntimeBundle()).products;
}

export async function readStorefrontContentSnapshot(): Promise<StorefrontContent> {
  return (await readStorefrontRuntimeBundle()).content;
}
