import { Suspense } from "react";
import { LiveQrCheckoutPage } from "@/components/storefront/LiveShopClient";

function QrLiveFallback() {
  return (
    <main className="min-h-screen bg-[#f5f1eb] p-4 text-slate-950">
      <section className="mx-auto max-w-md rounded-md bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black">QR 결제 화면을 준비하고 있습니다</h1>
        <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
          Firebase QR 세션과 결제 서버 상태를 확인하는 중입니다.
        </p>
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<QrLiveFallback />}>
      <LiveQrCheckoutPage />
    </Suspense>
  );
}
