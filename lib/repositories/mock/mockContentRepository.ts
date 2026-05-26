import {
  mallBrands,
  mallCategories,
  mallHeroBanner,
  mallPromoBanners,
  marketingSlots,
  productProfileById,
  productProfiles,
} from "@/data/mockShopContent";
import type { ContentRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

export const mockContentRepository: ContentRepository = {
  async getStorefrontContent() {
    return repositoryOk({
      heroBanner: mallHeroBanner,
      promoBanners: mallPromoBanners,
      brands: mallBrands,
      categories: mallCategories,
      productProfiles,
      marketingSlots,
    });
  },

  async getProductProfileById(productId) {
    const profile = productProfileById[productId];

    if (!profile) {
      return repositoryError("NOT_FOUND", "Product content profile not found", productId);
    }

    return repositoryOk(profile);
  },

  async listMarketingSlots(filters) {
    return repositoryOk(
      marketingSlots.filter((slot) => {
        if (filters?.type === "video") return slot.title.includes("video") || slot.title.includes("영상") || slot.title.includes("?곸긽");
        if (filters?.type === "banner") return slot.title.includes("banner") || slot.title.includes("배너") || slot.title.includes("諛곕꼫") || slot.placement.includes("hero");
        return true;
      }),
    );
  },
};
