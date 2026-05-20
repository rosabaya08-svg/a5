import { mockApi } from "@/lib/mock/mockApi";
import { GuestOrderDetailPage } from "@/components/pages/guestPages";

export function generateStaticParams() {
  return mockApi.orders().map((order) => ({ orderNo: order.orderNo }));
}

export default async function Page({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;

  return <GuestOrderDetailPage orderNo={orderNo} />;
}
