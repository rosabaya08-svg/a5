import { CompanyRefundDetailPage } from "@/components/pages/companyPages";

export default async function Page({
  params,
}: {
  params: Promise<{ refundId: string }>;
}) {
  const { refundId } = await params;

  return <CompanyRefundDetailPage refundId={refundId} />;
}
