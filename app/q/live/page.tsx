import { Suspense } from "react";
import { PayupQrCheckoutPage } from "@/components/storefront/PayupQrCheckoutPage";

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f5f1eb] p-6 text-center font-black">PayUp QR 결제정보를 불러오는 중입니다.</main>}>
      <PayupQrCheckoutPage />
    </Suspense>
  );
}
