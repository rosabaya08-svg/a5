import { CompanySettlementDetailPage } from "@/components/pages/companyPages";

export default async function Page({
  params,
}: {
  params: Promise<{ settlementId: string }>;
}) {
  const { settlementId } = await params;

  return <CompanySettlementDetailPage settlementId={settlementId} />;
}
