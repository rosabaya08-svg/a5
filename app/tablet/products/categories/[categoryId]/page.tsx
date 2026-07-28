import { TabletCategoryProductsPage } from "@/components/storefront/TabletMallPages";

export default async function Page({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;

  return <TabletCategoryProductsPage categoryId={categoryId} />;
}
