import { PayupQrCheckoutPage } from "@/components/storefront/PayupQrCheckoutPage";
import { staticQrCodes } from "@/data/staticSmokeRoutes";

export async function generateStaticParams() {
  return staticQrCodes.map((code) => ({ code }));
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PayupQrCheckoutPage fixedCode={code} />;
}
