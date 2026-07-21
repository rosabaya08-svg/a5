import { TabletDealProductsPage } from "@/components/storefront/TabletMallPages";

export default async function Page({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  return <TabletDealProductsPage dealId={dealId} />;
}
