import { GuestOrderDetailClientPage } from "@/components/storefront/GuestOrderPagesClient";
import { staticGuestOrderNos } from "@/data/staticSmokeRoutes";

type RouteSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function generateStaticParams() {
  return staticGuestOrderNos.map((orderNo) => ({ orderNo }));
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orderNo: string }>;
  searchParams?: Promise<RouteSearchParams>;
}) {
  const [{ orderNo }, query = {}] = await Promise.all([params, searchParams]);

  return (
    <GuestOrderDetailClientPage
      orderNo={orderNo}
      initialToken={firstParam(query.token)}
      initialPhoneLast4={firstParam(query.phoneLast4)}
    />
  );
}
