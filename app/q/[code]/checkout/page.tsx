import { QrCheckoutPage } from "@/components/storefront/GuestQrExperience";
import { staticQrCodes } from "@/data/staticSmokeRoutes";

export async function generateStaticParams() {
  return staticQrCodes.map((code) => ({ code }));
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return <QrCheckoutPage code={code} />;
}
