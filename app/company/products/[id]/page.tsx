import { CompanyProductDetailPage } from "@/components/pages/companyPages";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CompanyProductDetailPage productId={id} />;
}
