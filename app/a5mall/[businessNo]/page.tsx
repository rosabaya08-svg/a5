import { TabletBusinessBrandPage } from "@/components/storefront/TabletMallPages";

export default async function Page({ params }: { params: Promise<{ businessNo: string }> }) {
  const { businessNo } = await params;
  return <TabletBusinessBrandPage businessNo={businessNo} />;
}
