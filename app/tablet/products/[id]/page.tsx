import { mockApi } from "@/lib/mock/mockApi";
import { TabletProductDetailPage } from "@/components/pages/tabletPages";

export function generateStaticParams() {
  return mockApi.products().map((product) => ({ id: product.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TabletProductDetailPage productId={id} />;
}
