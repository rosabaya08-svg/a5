import { TabletProductDetailPage } from "@/components/storefront/TabletMallPages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TabletProductDetailPage productId={id} />;
}
