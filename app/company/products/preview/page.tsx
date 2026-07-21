import { CompanyProductPreviewPage } from "@/components/pages/companyPages";

type RouteSearchParams = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams?: Promise<RouteSearchParams> }) {
  const query = (await searchParams) ?? {};
  const productId = Array.isArray(query.productId) ? query.productId[0] : query.productId;

  return <CompanyProductPreviewPage productId={productId} />;
}
