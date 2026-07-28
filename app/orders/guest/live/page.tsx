import { Suspense } from "react";
import { LiveGuestOrderPage } from "@/components/storefront/LiveShopClient";

export default function Page() {
  return (
    <Suspense>
      <LiveGuestOrderPage />
    </Suspense>
  );
}
