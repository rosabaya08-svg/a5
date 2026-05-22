import type { ReactNode } from "react";
import { CompanySoftPill } from "@/components/company/companyAdminWidgets";

export type CompanyDetailTab = {
  id: string;
  label: string;
  status?: "ready" | "mock" | "blocked";
  content: ReactNode;
};

export function CompanyDetailTabs({ tabs }: { tabs: CompanyDetailTab[] }) {
  const toneByStatus = {
    ready: "green",
    mock: "blue",
    blocked: "red",
  } as const;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            {tab.label}
          </span>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tabs.map((tab) => (
          <section key={`${tab.id}-panel`} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-950">{tab.label}</h3>
              <CompanySoftPill tone={toneByStatus[tab.status ?? "mock"]}>{tab.status ?? "mock"}</CompanySoftPill>
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-600">{tab.content}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
