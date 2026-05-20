import { QrFailedPage } from "@/components/pages/guestPages";
import { mockRepositories } from "@/lib/repositories/mock";

export async function generateStaticParams() {
  const result = await mockRepositories.qrSessions.listQrSessions();

  return result.ok ? result.data.map((session) => ({ code: session.shortCode })) : [];
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return <QrFailedPage code={code} />;
}
