import { Suspense } from "react";
import { LiveQrCheckoutPage } from "@/components/storefront/LiveShopClient";

export default function Page() {
  return (
    <Suspense>
      <LiveQrCheckoutPage />
    </Suspense>
  );
}
