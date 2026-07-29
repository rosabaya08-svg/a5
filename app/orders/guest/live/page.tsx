import { Suspense } from "react";
import { PayupGuestOrderPage } from "@/components/storefront/PayupGuestOrderPage";

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f5f1eb] p-6 text-center font-black">PayUp 주문정보를 불러오는 중입니다.</main>}>
      <PayupGuestOrderPage />
    </Suspense>
  );
}
