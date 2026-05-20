import { mockApi } from "@/lib/mock/mockApi";
import { QrLandingPage } from "@/components/pages/guestPages";

export function generateStaticParams() {
  return mockApi.qrSessions().map((session) => ({ code: session.shortCode }));
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return <QrLandingPage code={code} />;
}
