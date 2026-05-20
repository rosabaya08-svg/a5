import { TabletProductDetailPage } from "@/components/pages/tabletPages";
import { mockRepositories } from "@/lib/repositories/mock";

export async function generateStaticParams() {
  const result = await mockRepositories.products.listProducts();

  return result.ok ? result.data.map((product) => ({ id: product.id })) : [];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TabletProductDetailPage productId={id} />;
}
