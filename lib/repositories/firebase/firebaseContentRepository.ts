import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { ContentRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { MarketingSlot } from "@/data/mockShopContent";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asMarketingStatus(value: unknown): MarketingSlot["status"] {
  if (value === "draft" || value === "pending_approval" || value === "rejected") return value;
  return "approved";
}

function mapMarketingSlot(collectionName: "marketing_banners" | "marketing_videos", id: string, data: Record<string, unknown>): MarketingSlot {
  const isVideo = collectionName === "marketing_videos";

  return {
    id,
    title: asString(data.title, isVideo ? "Video CMS item" : "Banner CMS item"),
    placement: asString(data.placement, isVideo ? "home_video_strip" : "shopping_home_top"),
    target: asString(data.target, "all_nurseries"),
    period: `${asString(data.visible_from, "start unset")} ~ ${asString(data.visible_to, "end unset")}`,
    status: asMarketingStatus(data.status ?? data.approval_status),
    owner: asString(data.company_id ?? data.companyId, "company-unknown"),
    performance: isVideo ? "video beta" : "banner beta",
  };
}

async function readMarketingSlots(type?: "banner" | "video") {
  const db = getFirebaseDb();

  if (!db) {
    return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
  }

  try {
    const slots: MarketingSlot[] = [];
    const shouldReadBanners = !type || type === "banner";
    const shouldReadVideos = !type || type === "video";

    if (shouldReadBanners) {
      const bannerSnapshot = await getDocs(query(collection(db, "marketing_banners"), where("status", "in", ["active", "published"])));
      slots.push(...bannerSnapshot.docs.map((item) => mapMarketingSlot("marketing_banners", item.id, item.data())));
    }

    if (shouldReadVideos) {
      const videoSnapshot = await getDocs(query(collection(db, "marketing_videos"), where("status", "in", ["active", "published"])));
      slots.push(...videoSnapshot.docs.map((item) => mapMarketingSlot("marketing_videos", item.id, item.data())));
    }

    return repositoryOk(slots);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firestore content read error.";
    return repositoryError("EXTERNAL_BLOCKED", `Firestore CMS read failed. ${message}`);
  }
}

export const firebaseContentRepository: ContentRepository = {
  async getStorefrontContent() {
    return repositoryError("NOT_IMPLEMENTED", "Firestore storefront content composition is not fully mapped yet. Using mock content fallback.");
  },

  async getProductProfileById(productId) {
    return repositoryError("NOT_IMPLEMENTED", "Firestore product detail profile is not fully mapped yet. Using mock content fallback.", productId);
  },

  async listMarketingSlots(filters) {
    return readMarketingSlots(filters?.type);
  },
};
