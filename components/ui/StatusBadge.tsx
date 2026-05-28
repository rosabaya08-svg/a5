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

const labels: Record<string, string> = {
  ...productStatusLabels,
  ...qrSessionStatusLabels,
  ...orderStatusLabels,
  ...paymentStatusLabels,
  ...settlementStatusLabels,
};

export function StatusBadge({ status }: { status: string }) {
  const tone = status in statusToneMap ? statusToneMap[status as keyof typeof statusToneMap] : "neutral";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-bold ring-1 ${toneClasses[tone]}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
