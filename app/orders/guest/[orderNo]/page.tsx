import { GuestOrderDetailPage } from "@/components/pages/guestPages";
import { mockRepositories } from "@/lib/repositories/mock";

export async function generateStaticParams() {
  const result = await mockRepositories.orders.listOrders();

  return result.ok ? result.data.map((order) => ({ orderNo: order.orderNo })) : [];
}

export default async function Page({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;

  return <GuestOrderDetailPage orderNo={orderNo} />;
}
