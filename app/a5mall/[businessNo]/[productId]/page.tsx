import { TabletBusinessProductDetailPage } from "@/components/storefront/TabletMallPages";

export default async function Page({ params }: { params: Promise<{ businessNo: string; productId: string }> }) {
  const { businessNo, productId } = await params;
  return <TabletBusinessProductDetailPage businessNo={businessNo} productId={productId} />;
}
