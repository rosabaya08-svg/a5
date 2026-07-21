import { TabletBrandNewsPage } from "@/components/storefront/TabletMallPages";

export default async function Page({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;

  return <TabletBrandNewsPage brandId={brandId} />;
}
