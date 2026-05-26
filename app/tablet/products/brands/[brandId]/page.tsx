import { brandPageIds, TabletBrandProductsPage } from "@/components/storefront/TabletMallPages";

export async function generateStaticParams() {
  return brandPageIds.map((brandId) => ({ brandId }));
}

export default async function Page({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;

  return <TabletBrandProductsPage brandId={brandId} />;
}
