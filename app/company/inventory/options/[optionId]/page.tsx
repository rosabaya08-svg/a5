import { CompanyInventoryOptionDetailPage } from "@/components/pages/companyPages";

export default async function Page({
  params,
}: {
  params: Promise<{ optionId: string }>;
}) {
  const { optionId } = await params;

  return <CompanyInventoryOptionDetailPage optionId={optionId} />;
}
