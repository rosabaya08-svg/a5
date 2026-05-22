import type { ReactNode } from "react";
import type {
  CompanyKpi,
  CompanyKpiTone,
  CompanyRiskSeverity,
  CompanyRiskStatus,
  CompanyOrderStatus,
  CompanyProductStatus,
  CompanyRefundStatus,
  CompanySettlementStatus,
  CompanyWorkQueueItem,
} from "@/types/company";

type PillTone = "green" | "blue" | "amber" | "red" | "purple" | "neutral";

const toneClasses: Record<PillTone, string> = {
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
  red: "bg-red-100 text-red-800 ring-red-200",
  purple: "bg-violet-100 text-violet-800 ring-violet-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
};

const cardToneClasses: Record<CompanyKpiTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-950",
  blue: "border-blue-200 bg-blue-50 text-blue-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  red: "border-red-200 bg-red-50 text-red-950",
  purple: "border-violet-200 bg-violet-50 text-violet-950",
  neutral: "border-slate-200 bg-white text-slate-950",
};

const statusLabels: Record<
  CompanyProductStatus | CompanyOrderStatus | CompanySettlementStatus | CompanyRefundStatus,
  string
> = {
  draft: "임시저장",
  pending_approval: "승인요청",
  approved: "승인완료",
  rejected: "반려",
  needs_reapproval: "재승인 필요",
  suspended: "판매중지",
  paid: "결제완료",
  preparing: "상품준비",
  invoice_pending: "송장대기",
  shipping: "배송중",
  ready_for_pickup: "현장수령 대기",
  picked_up: "현장수령 완료",
  refund_requested: "환불요청",
  cancelled: "취소",
  review: "검토중",
  confirmed_mock: "mock 확정",
  payout_scheduled_mock: "mock 입금예정",
  paid_mock: "mock 입금완료",
  payout_blocked: "입금보류",
  blocked_real_payout: "실지급 차단",
  requested: "요청",
  company_review: "입점사 검토",
  admin_review: "운영자 검토",
  approved_mock: "mock 승인",
  rejected_mock: "mock 반려",
};

const statusTones: Record<
  CompanyProductStatus | CompanyOrderStatus | CompanySettlementStatus | CompanyRefundStatus,
  PillTone
> = {
  draft: "neutral",
  pending_approval: "amber",
  approved: "green",
  rejected: "red",
  needs_reapproval: "amber",
  suspended: "red",
  paid: "green",
  preparing: "blue",
  invoice_pending: "amber",
  shipping: "purple",
  ready_for_pickup: "blue",
  picked_up: "green",
  refund_requested: "amber",
  cancelled: "neutral",
  review: "purple",
  confirmed_mock: "green",
  payout_scheduled_mock: "blue",
  paid_mock: "green",
  payout_blocked: "red",
  blocked_real_payout: "red",
  requested: "amber",
  company_review: "purple",
  admin_review: "blue",
  approved_mock: "green",
  rejected_mock: "red",
};

const riskToneClasses: Record<CompanyRiskSeverity, string> = {
  high: "bg-red-100 text-red-800 ring-red-200",
  medium: "bg-amber-100 text-amber-900 ring-amber-200",
  low: "bg-blue-100 text-blue-800 ring-blue-200",
};

const riskLabels: Record<CompanyRiskSeverity, string> = {
  high: "위험 높음",
  medium: "주의",
  low: "관찰",
};

const riskStatusLabels: Record<CompanyRiskStatus, string> = {
  open: "열림",
  watching: "관찰중",
  blocked: "차단",
  resolved_mock: "mock 해결",
};

export function CompanyStatusPill({
  status,
}: {
  status: CompanyProductStatus | CompanyOrderStatus | CompanySettlementStatus | CompanyRefundStatus;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses[statusTones[status]]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export function CompanySoftPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: PillTone;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export function CompanyRiskBadge({
  severity,
  status,
}: {
  severity: CompanyRiskSeverity;
  status?: CompanyRiskStatus;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${riskToneClasses[severity]}`}
    >
      {riskLabels[severity]}
      {status ? ` / ${riskStatusLabels[status]}` : ""}
    </span>
  );
}

export function CompanyFilterSearchSort({
  title,
  query,
  sort,
  chips,
}: {
  title: string;
  query: string;
  sort: string;
  chips: string[];
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_auto]">
        <label className="grid gap-1 text-xs font-bold text-slate-500">
          {title}
          <input
            readOnly
            value={query}
            className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-500">
          정렬
          <input
            readOnly
            value={sort}
            className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700"
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          {chips.map((chip) => (
            <CompanySoftPill key={chip} tone="blue">
              {chip}
            </CompanySoftPill>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CompanyMockBanner({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="mt-2 max-w-5xl text-sm leading-6">{children}</p>
        </div>
        <CompanySoftPill tone="amber">mock only</CompanySoftPill>
      </div>
    </section>
  );
}

export function CompanyEmptyState({
  title,
  description,
  recovery,
}: {
  title: string;
  description: string;
  recovery: string;
}) {
  return (
    <section className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-3 text-xs font-semibold text-slate-500">{recovery}</p>
    </section>
  );
}

export function CompanyErrorState({
  title,
  description,
  blockedBy,
}: {
  title: string;
  description: string;
  blockedBy: string;
}) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-5 text-red-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-2 text-sm leading-6">{description}</p>
          <p className="mt-3 text-xs font-semibold">Blocked by: {blockedBy}</p>
        </div>
        <CompanySoftPill tone="red">disabled</CompanySoftPill>
      </div>
    </section>
  );
}

export function CompanyPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-950">{title}</h3>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function CompanyKpiGrid({ items }: { items: CompanyKpi[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {items.map((item) => {
        const tone = item.tone ?? "neutral";

        return (
          <section key={item.label} className={`rounded-md border p-4 ${cardToneClasses[tone]}`}>
            <p className="text-sm font-semibold text-slate-600">{item.label}</p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">{item.helper}</p>
          </section>
        );
      })}
    </div>
  );
}

export type CompanyTableRow = {
  id: string;
  cells: ReactNode[];
};

export function CompanyDataTable({
  columns,
  rows,
  emptyLabel = "표시할 mock 데이터가 없습니다.",
}: {
  columns: string[];
  rows: CompanyTableRow[];
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id} className="align-top">
                  {row.cells.map((cell, index) => (
                    <td key={`${row.id}-${index}`} className="px-4 py-3 text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={columns.length}>
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CompanyFieldGrid({
  fields,
}: {
  fields: Array<{ label: string; value: ReactNode; helper?: string }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => (
        <div key={field.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">{field.label}</p>
          <div className="mt-1 text-sm font-bold text-slate-950">{field.value}</div>
          {field.helper ? <p className="mt-1 text-xs leading-5 text-slate-500">{field.helper}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function CompanyReadOnlyInput({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        readOnly
        value={value}
        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-600"
      />
      {helper ? <span className="text-xs font-normal leading-5 text-slate-500">{helper}</span> : null}
    </label>
  );
}

export function CompanyWorkQueue({ items }: { items: CompanyWorkQueueItem[] }) {
  const statusTone: Record<CompanyWorkQueueItem["status"], PillTone> = {
    done_mock: "green",
    blocked: "red",
    next: "blue",
  };

  const statusLabel: Record<CompanyWorkQueueItem["status"], string> = {
    done_mock: "mock 완료",
    blocked: "BLOCKERS 기록",
    next: "다음 작업",
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <section key={item.day} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-500">{item.day}</p>
            <CompanySoftPill tone={statusTone[item.status]}>{statusLabel[item.status]}</CompanySoftPill>
          </div>
          <h4 className="mt-3 text-sm font-bold text-slate-950">{item.title}</h4>
          <p className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</p>
        </section>
      ))}
    </div>
  );
}

export function CompanyTimeline({
  events,
}: {
  events: Array<{ id: string; label: string; status: "done" | "current" | "blocked" | "next"; at: string; detail: string }>;
}) {
  const statusTone: Record<"done" | "current" | "blocked" | "next", PillTone> = {
    done: "green",
    current: "blue",
    blocked: "red",
    next: "neutral",
  };

  return (
    <div className="grid gap-3">
      {events.map((event) => (
        <section key={event.id} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950">{event.label}</p>
              <p className="mt-1 text-xs text-slate-500">{event.at}</p>
            </div>
            <CompanySoftPill tone={statusTone[event.status]}>{event.status}</CompanySoftPill>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{event.detail}</p>
        </section>
      ))}
    </div>
  );
}
