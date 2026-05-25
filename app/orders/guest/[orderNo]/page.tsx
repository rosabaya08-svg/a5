import { GuestOrderDetailPage } from "@/components/storefront/GuestQrExperience";
import { staticGuestOrderNos } from "@/data/staticSmokeRoutes";

export async function generateStaticParams() {
  return staticGuestOrderNos.map((orderNo) => ({ orderNo }));
}

export default async function Page({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;

  return <GuestOrderDetailPage orderNo={orderNo} />;
}
