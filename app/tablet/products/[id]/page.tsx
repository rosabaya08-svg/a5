import { TabletProductDetailPage } from "@/components/storefront/TabletMallPages";
import { staticProductIds } from "@/data/staticSmokeRoutes";

export async function generateStaticParams() {
  return staticProductIds.map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TabletProductDetailPage productId={id} />;
}
