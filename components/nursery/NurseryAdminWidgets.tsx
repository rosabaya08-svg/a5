import type { ReactNode } from "react";
import type {
  NurseryDetailRecord,
  NurseryMockControl,
  NurseryOperationNote,
  NurseryRiskLevel,
  NurseryRiskStatus,
  NurserySearchPreset,
  NurseryScopeFilter,
  NurseryStateScenario,
  NurseryPaginationSnapshot,
  NurseryUnifiedSearchResult,
} from "@/types/nursery";

type ChipTone = "neutral" | "blue" | "green" | "amber" | "red" | "purple";

const chipToneClasses: Record<ChipTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
  red: "bg-red-100 text-red-800 ring-red-200",
  purple: "bg-violet-100 text-violet-800 ring-violet-200",
};

const riskToneClasses: Record<NurseryRiskLevel, string> = {
  critical: "bg-red-100 text-red-800 ring-red-200",
  warning: "bg-amber-100 text-amber-900 ring-amber-200",
  attention: "bg-violet-100 text-violet-800 ring-violet-200",
  ok: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

const riskLabels: Record<NurseryRiskLevel, string> = {
  critical: "위험",
  warning: "주의",
  attention: "확인",
  ok: "정상",
};

export function NurseryPanel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-950">{title}</h3>
        {eyebrow ? (
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {eyebrow}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function NurseryChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: ChipTone;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${chipToneClasses[tone]}`}
    >
      {label}
    </span>
  );
}

export function NurseryScopeGrid({ filters }: { filters: NurseryScopeFilter[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {filters.map((filter) => (
        <article key={filter.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {filter.label}
          </p>
          <p className="mt-2 break-words text-sm font-bold text-slate-950">{filter.value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{filter.helper}</p>
        </article>
      ))}
    </div>
  );
}

export function NurseryOperationNotes({ notes }: { notes: NurseryOperationNote[] }) {
  return (
    <div className="grid gap-3">
      {notes.map((note) => (
        <article key={note.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-950">{note.title}</p>
            <NurseryChip label={note.owner} tone={note.tone} />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{note.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function NurseryMockActionList({
  title,
  actions,
}: {
  title: string;
  actions: string[];
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <span
            key={action}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
          >
            {action}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NurseryMockControlPanel({ control }: { control: NurseryMockControl }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">{control.title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {control.description}
          </p>
        </div>
        <NurseryChip label="mock only" tone="amber" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {control.fields.map((field) => (
          <div key={field.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {field.label}
            </p>
            <p className="mt-2 break-words text-sm font-bold text-slate-950">{field.value}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{field.helper}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white">
          {control.primaryAction}
        </span>
        {control.secondaryAction ? (
          <span className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">
            {control.secondaryAction}
          </span>
        ) : null}
      </div>
    </section>
  );
}

export function NurseryRiskBadge({ level }: { level: NurseryRiskLevel }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${riskToneClasses[level]}`}
    >
      {riskLabels[level]}
    </span>
  );
}

export function NurseryRiskList({ risks }: { risks: NurseryRiskStatus[] }) {
  return (
    <div className="grid gap-3">
      {risks.map((risk) => (
        <article key={risk.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-950">{risk.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{risk.target}</p>
            </div>
            <NurseryRiskBadge level={risk.level} />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{risk.detail}</p>
          <a
            href={risk.route}
            className="mt-3 inline-flex rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700"
          >
            상세 mock
          </a>
        </article>
      ))}
    </div>
  );
}

export function NurserySearchSortPanel({ presets }: { presets: NurserySearchPreset[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">검색/정렬 mock</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            실제 쿼리 실행 없이 베타에서 필요한 필터 조합과 정렬 기준을 고정해 둡니다.
          </p>
        </div>
        <NurseryChip label="display only" tone="blue" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {presets.map((preset) => (
          <article key={preset.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-950">{preset.label}</p>
              <NurseryChip label={preset.scope} tone="neutral" />
            </div>
            <p className="mt-2 break-words text-xs font-semibold text-slate-600">{preset.query}</p>
            <p className="mt-2 text-xs font-bold text-slate-900">정렬: {preset.sort}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{preset.helper}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NurseryStateScenarioGrid({ scenarios }: { scenarios: NurseryStateScenario[] }) {
  const toneByState: Record<NurseryStateScenario["state"], ChipTone> = {
    empty: "neutral",
    error: "red",
    loading: "blue",
    ready: "green",
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {scenarios.map((scenario) => (
        <article key={scenario.id} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-950">{scenario.title}</p>
            <NurseryChip label={scenario.state} tone={toneByState[scenario.state]} />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{scenario.description}</p>
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <p className="font-bold text-slate-900">{scenario.recoveryAction}</p>
            <p>{scenario.targetRoute}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function NurseryDetailLink({
  href,
  label = "상세",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex whitespace-nowrap rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700"
    >
      {label}
    </a>
  );
}

export function NurseryDetailMock({ record }: { record: NurseryDetailRecord }) {
  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-950">{record.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{record.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <NurseryRiskBadge level={record.riskLevel} />
            <NurseryChip label={record.statusLabel} tone="blue" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {record.facts.map((fact) => (
            <div key={fact.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {fact.label}
              </p>
              <p className="mt-2 break-words text-sm font-bold text-slate-950">{fact.value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h3 className="text-base font-bold text-slate-950">상세 타임라인</h3>
          <div className="mt-4 grid gap-3">
            {record.timeline.map((item) => (
              <article key={`${item.label}-${item.at}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-950">{item.label}</p>
                  <span className="text-xs font-semibold text-slate-500">{item.at}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <h3 className="text-base font-bold">차단된 실제 동작</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {record.blockedActions.map((action) => (
              <span key={action} className="rounded-md bg-white px-3 py-1 text-xs font-bold ring-1 ring-amber-200">
                {action}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function NurseryTabMock({
  tabs,
}: {
  tabs: Array<{
    id: string;
    label: string;
    children: ReactNode;
  }>;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
          >
            {tab.label}
          </span>
        ))}
      </div>
      <div className="mt-4 grid gap-4">
        {tabs.map((tab) => (
          <article key={`${tab.id}-panel`} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-950">{tab.label}</h3>
            <div className="mt-3">{tab.children}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NurseryUnifiedSearchPanel({
  results,
}: {
  results: NurseryUnifiedSearchResult[];
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">통합 검색 mock</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            객실번호, 태블릿ID, 주문번호, QR 코드, 상태를 한 화면에서 찾는 display-only 검색 결과입니다.
          </p>
        </div>
        <NurseryChip label="search stub" tone="purple" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {results.map((result) => (
          <article key={result.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-950">{result.title}</p>
              <NurseryChip label={result.type} tone="neutral" />
            </div>
            <p className="mt-2 break-words text-xs font-bold text-slate-900">{result.keyword}</p>
            <p className="mt-1 text-xs text-slate-600">{result.status}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">{result.helper}</p>
            <a
              href={result.route}
              className="mt-3 inline-flex rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700"
            >
              이동 mock
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NurseryPaginationPanel({
  snapshots,
}: {
  snapshots: NurseryPaginationSnapshot[];
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">필터/정렬/페이지네이션 mock</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            실제 쿼리 실행 없이 각 목록의 page, pageSize, total, sort, filter 상태를 고정 표시합니다.
          </p>
        </div>
        <NurseryChip label="pagination stub" tone="blue" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {snapshots.map((snapshot) => (
          <article key={snapshot.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-950">{snapshot.label}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <span>page {snapshot.page}</span>
              <span>size {snapshot.pageSize}</span>
              <span>total {snapshot.total}</span>
              <span>{snapshot.filter}</span>
            </div>
            <p className="mt-2 break-words text-xs font-bold text-slate-900">{snapshot.sort}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
