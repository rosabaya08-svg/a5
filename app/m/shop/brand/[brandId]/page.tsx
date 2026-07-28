import { MobileGuestShopDynamicPage } from "@/components/storefront/MobileGuestShopDynamicPage";
import { readSharedClosedMallProducts } from "@/lib/storefront/readSharedClosedMallProducts";
import { readStorefrontContentSnapshot } from "@/lib/storefront/storefrontSnapshot";

export default async function Page({ params }: { params: Promise<{ brandId: string }> }) {
  await params;
  const [products, content] = await Promise.all([
    readSharedClosedMallProducts(),
    readStorefrontContentSnapshot(),
  ]);

  return <MobileGuestShopDynamicPage initialProducts={products} initialContent={content} />;
}
