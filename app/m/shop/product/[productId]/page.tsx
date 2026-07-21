import { MobileGuestShopDynamicPage } from "@/components/storefront/MobileGuestShopDynamicPage";
import { readSharedClosedMallProducts } from "@/lib/storefront/readSharedClosedMallProducts";

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  await params;
  const products = await readSharedClosedMallProducts();

  return <MobileGuestShopDynamicPage initialProducts={products} />;
}
