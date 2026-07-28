import { A4HandoffConsumeClient } from "./A4HandoffConsumeClient";

type RouteSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams?: Promise<RouteSearchParams> }) {
  const query = (await searchParams) ?? {};

  return (
    <A4HandoffConsumeClient
      handoffId={firstParam(query.handoffId)}
      token={firstParam(query.token)}
      nextPath={firstParam(query.next) || "/nursery/dashboard"}
    />
  );
}
