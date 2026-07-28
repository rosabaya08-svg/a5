import { CompanyProductEditPage } from "@/components/pages/companyPages";
import { staticCompanyEditableProductIds } from "@/data/staticSmokeRoutes";

export function generateStaticParams() {
  return staticCompanyEditableProductIds.map((productId) => ({ productId }));
}

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  return <CompanyProductEditPage productId={decodeURIComponent(productId)} />;
}
