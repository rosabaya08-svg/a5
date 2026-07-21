import { readBackendStorefrontProducts } from "@/lib/firebase/liveShopBackend";
import { normalizeSharedClosedMallProducts } from "@/lib/storefront/sharedClosedMallCatalog";

export async function readSharedClosedMallProducts() {
  const result = await readBackendStorefrontProducts();
  return result.ok ? normalizeSharedClosedMallProducts(result.data.products) : [];
}