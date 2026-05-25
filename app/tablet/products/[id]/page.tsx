import { TabletProductDetailPage } from "@/components/storefront/TabletMallPages";
import { firebaseProductRepository } from "@/lib/repositories/firebase/firebaseProductRepository";
import { mockRepositories } from "@/lib/repositories/mock";

export async function generateStaticParams() {
  const firebaseResult = await firebaseProductRepository.listApprovedProducts();

  if (firebaseResult.ok && firebaseResult.data.length > 0) {
    return firebaseResult.data.map((product) => ({ id: product.id }));
  }

  const result = await mockRepositories.products.listProducts();

  return result.ok ? result.data.map((product) => ({ id: product.id })) : [];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TabletProductDetailPage productId={id} />;
}
