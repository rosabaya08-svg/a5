import { CompanyOrderDetailPage } from "@/components/pages/companyPages";

export default async function Page({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;

  return <CompanyOrderDetailPage orderNo={orderNo} />;
}
