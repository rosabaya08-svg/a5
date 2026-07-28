import {
  orderStatusLabels,
  paymentStatusLabels,
  productStatusLabels,
  qrSessionStatusLabels,
  settlementStatusLabels,
  statusToneMap,
  type StatusTone,
} from "@/types/status";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-slate-50 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-800 ring-blue-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  purple: "bg-violet-50 text-violet-800 ring-violet-200",
};

const labels: Record<string, string> = Object.assign(
  {},
  productStatusLabels,
  qrSessionStatusLabels,
  orderStatusLabels,
  paymentStatusLabels,
  settlementStatusLabels,
  {
    approved: "승인 완료",
    paid: "결제 완료",
    failed: "실패",
    cancelled: "취소 완료",
  },
);

export function StatusBadge({ status }: { status: string }) {
  const liveTone = status === "approved" || status === "paid" ? "green" : status === "failed" ? "red" : undefined;
  const tone = liveTone ?? (status in statusToneMap ? statusToneMap[status as keyof typeof statusToneMap] : "neutral");

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-normal ring-1 ${toneClasses[tone]}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
