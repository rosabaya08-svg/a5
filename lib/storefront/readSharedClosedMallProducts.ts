import { readStorefrontApprovedProductsSnapshot } from "@/lib/storefront/storefrontSnapshot";

export async function readSharedClosedMallProducts() {
  return readStorefrontApprovedProductsSnapshot();
}
