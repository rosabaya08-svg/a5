import { CompanyPickupDetailPage } from "@/components/pages/companyPages";

export default async function Page({
  params,
}: {
  params: Promise<{ pickupId: string }>;
}) {
  const { pickupId } = await params;

  return <CompanyPickupDetailPage pickupId={pickupId} />;
}
