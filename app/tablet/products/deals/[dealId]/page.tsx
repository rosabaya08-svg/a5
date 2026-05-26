import { dealPageIds, TabletDealProductsPage } from "@/components/storefront/TabletMallPages";

export async function generateStaticParams() {
  return dealPageIds.map((dealId) => ({ dealId }));
}

export default async function Page({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;

  return <TabletDealProductsPage dealId={dealId} />;
}
