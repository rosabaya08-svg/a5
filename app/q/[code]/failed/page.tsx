import { QrLiveRedirectClientPage } from "@/components/storefront/QrEntryClientPages";
import { staticQrCodes } from "@/data/staticSmokeRoutes";

export function generateStaticParams() {
  return staticQrCodes.map((code) => ({ code }));
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return <QrLiveRedirectClientPage code={code} paymentResult="failed" />;
}
