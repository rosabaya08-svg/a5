import { Suspense } from "react";
import { PayupQrCheckoutPage } from "@/components/storefront/PayupQrCheckoutPage";
import { staticQrCodes } from "@/data/staticSmokeRoutes";

export async function generateStaticParams() {
  return staticQrCodes.map((code) => ({ code }));
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f5f1eb] p-6 text-center font-black">PayUp QR 결제정보를 불러오는 중입니다.</main>}>
      <PayupQrCheckoutPage fixedCode={code} />
    </Suspense>
  );
}
