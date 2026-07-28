import { MobileGuestShopDynamicPage } from "@/components/storefront/MobileGuestShopDynamicPage";
import { readSharedClosedMallProducts } from "@/lib/storefront/readSharedClosedMallProducts";
import { readStorefrontContentSnapshot } from "@/lib/storefront/storefrontSnapshot";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [products, content] = await Promise.all([
    readSharedClosedMallProducts(),
    readStorefrontContentSnapshot(),
  ]);

  return <MobileGuestShopDynamicPage initialProducts={products} initialContent={content} />;
}
