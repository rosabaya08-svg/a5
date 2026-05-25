import { TabletProductDetailPage } from "@/components/storefront/TabletMallPages";
import { staticProductIds } from "@/data/staticSmokeRoutes";
import { firebaseProductRepository } from "@/lib/repositories/firebase/firebaseProductRepository";

export async function generateStaticParams() {
  const firebaseResult = await firebaseProductRepository.listApprovedProducts();

  if (firebaseResult.ok && firebaseResult.data.length > 0) {
    return firebaseResult.data.map((product) => ({ id: product.id }));
  }

  return staticProductIds.map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TabletProductDetailPage productId={id} />;
}
