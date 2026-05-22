import { CompanyEmptyState, CompanyErrorState, CompanySoftPill } from "@/components/company/companyAdminWidgets";

export function CompanyLoadingState({ label = "mock loading state" }: { label?: string }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 gap-2">
          <div className="h-3 w-40 rounded bg-slate-200" />
          <div className="h-3 w-full max-w-xl rounded bg-slate-100" />
          <div className="h-3 w-3/4 rounded bg-slate-100" />
        </div>
        <CompanySoftPill tone="neutral">{label}</CompanySoftPill>
      </div>
    </section>
  );
}

export function CompanyBlockedState({
  title,
  description,
  blockedBy,
}: {
  title: string;
  description: string;
  blockedBy: string;
}) {
  return <CompanyErrorState title={title} description={description} blockedBy={blockedBy} />;
}

export function CompanyNoResultsState({
  title,
  description,
  recovery,
}: {
  title: string;
  description: string;
  recovery: string;
}) {
  return <CompanyEmptyState title={title} description={description} recovery={recovery} />;
}
