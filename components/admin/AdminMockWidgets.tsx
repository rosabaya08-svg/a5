import type { ReactNode } from "react";

export type AdminTone = "blue" | "green" | "amber" | "red" | "purple" | "slate";

const toneClasses: Record<AdminTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  red: "border-red-200 bg-red-50 text-red-950",
  purple: "border-violet-200 bg-violet-50 text-violet-950",
  slate: "border-slate-200 bg-white text-slate-950",
};

const badgeClasses: Record<AdminTone, string> = {
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
  red: "bg-red-100 text-red-800 ring-red-200",
  purple: "bg-violet-100 text-violet-800 ring-violet-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function AdminBadge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: AdminTone;
}) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badgeClasses[tone]}`}>
      {children}
    </span>
  );
}

export function AdminMetricCard({
  label,
  value,
  helper,
  tone = "slate",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: AdminTone;
}) {
  return (
    <section className={`rounded-md border p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{helper}</p>
    </section>
  );
}

export function AdminMetricGrid({
  metrics,
}: {
  metrics: Array<{ id: string; label: string; value: string; helper: string; tone?: AdminTone }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <AdminMetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
}

export function AdminCompactRecordList({
  title,
  records,
}: {
  title: string;
  records: Array<{
    id: string;
    title: string;
    meta: string;
    status: ReactNode;
    amount?: string;
  }>;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 lg:hidden">
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <div className="mt-3 grid gap-3">
        {records.map((record) => (
          <article key={record.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-950">{record.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{record.meta}</p>
              </div>
              {record.status}
            </div>
            {record.amount ? <p className="mt-2 text-sm font-bold text-slate-900">{record.amount}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function AdminPanel({
  title,
  eyebrow,
  children,
  action,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{eyebrow}</p>
          ) : null}
          <h3 className="mt-1 text-base font-bold text-slate-950">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminFilterChips({
  title,
  filters,
}: {
  title: string;
  filters: string[];
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <span key={filter} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {filter}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AdminSearchSortBar({
  searchLabel,
  searchValue,
  filters,
  sortOptions,
  activeSort,
  resultCount,
}: {
  searchLabel: string;
  searchValue: string;
  filters: string[];
  sortOptions: string[];
  activeSort: string;
  resultCount: number;
}) {
  return (
    <div className="mb-4 rounded-md border border-slate-200 bg-white p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto]">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Search
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {searchLabel}: <span className="font-mono text-blue-700">{searchValue}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white">
            {resultCount} results
          </span>
          {sortOptions.map((option) => (
            <span
              key={option}
              className={`rounded-md border px-3 py-2 text-xs font-bold ${
                option === activeSort
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {option}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <span
            key={filter}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {filter}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AdminPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold text-slate-500">
        Showing {from}-{to} of {total}
      </p>
      <div className="flex gap-2">
        {["Prev", "1", "2", "Next"].map((item) => (
          <span
            key={item}
            className={`rounded-md border px-3 py-1 text-xs font-bold ${
              item === String(page)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AdminNotice({
  title,
  description,
  tone = "amber",
  label = "Human review required",
}: {
  title: string;
  description: string;
  tone?: AdminTone;
  label?: string;
}) {
  return (
    <section className={`rounded-md border p-4 ${toneClasses[tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
        </div>
        <AdminBadge tone={tone}>{label}</AdminBadge>
      </div>
    </section>
  );
}

export function AdminChecklist({
  items,
}: {
  items: Array<{ id: string; label: string; done: boolean; owner: string }>;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${item.done ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="text-sm font-medium text-slate-800">{item.label}</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">{item.owner}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDefinitionGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; tone?: AdminTone }>;
}) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <dt className="font-semibold text-slate-500">{item.label}</dt>
          <dd className="mt-1 text-slate-950">
            {item.tone ? <AdminBadge tone={item.tone}>{item.value}</AdminBadge> : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminTabs({
  tabs,
  activeTab,
}: {
  tabs: string[];
  activeTab: string;
}) {
  return (
    <div className="mb-4 overflow-x-auto rounded-md border border-slate-200 bg-white p-2">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => (
          <span
            key={tab}
            className={`rounded-md px-3 py-2 text-xs font-bold ${
              tab === activeTab ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AdminLoadingState({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <div className="mt-4 grid gap-2">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-3 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function AdminImagePlaceholder({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: AdminTone;
}) {
  return (
    <div className={`flex aspect-[4/3] min-h-28 items-center justify-center rounded-md border text-center ${toneClasses[tone]}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Image</p>
        <p className="mt-1 px-3 text-sm font-bold">{label}</p>
      </div>
    </div>
  );
}

export function AdminTimeline({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    at: string;
    actor: string;
    detail: string;
    tone?: AdminTone;
  }>;
}) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{item.actor} / {item.at}</p>
            </div>
            {item.tone ? <AdminBadge tone={item.tone}>risk</AdminBadge> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function AdminErrorState({
  title,
  description,
  code,
}: {
  title: string;
  description: string;
  code: string;
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-red-950">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
        </div>
        <AdminBadge tone="red">{code}</AdminBadge>
      </div>
    </div>
  );
}

export function AdminConfirmModal({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
}) {
  return (
    <section className="rounded-md border border-slate-300 bg-white p-4 shadow-sm">
      <div className="border-b border-slate-200 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Confirm modal mock</p>
        <h3 className="mt-1 text-base font-bold text-slate-950">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
          {cancelLabel}
        </span>
        <span className="rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white">
          {confirmLabel}
        </span>
      </div>
    </section>
  );
}
