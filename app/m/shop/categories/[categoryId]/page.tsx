import { MobileGuestShopDynamicPage } from "@/components/storefront/MobileGuestShopDynamicPage";
import { readSharedClosedMallProducts } from "@/lib/storefront/readSharedClosedMallProducts";
import { readStorefrontContentSnapshot } from "@/lib/storefront/storefrontSnapshot";

export default async function Page({ params }: { params: Promise<{ categoryId: string }> }) {
  await params;
  const [initialProducts, initialContent] = await Promise.all([
    readSharedClosedMallProducts(),
    readStorefrontContentSnapshot(),
  ]);

  return <MobileGuestShopDynamicPage initialProducts={initialProducts} initialContent={initialContent} />;
}
