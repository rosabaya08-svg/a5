type ConfirmBoxProps = {
  title: string;
  description: string;
  confirmLabel?: string;
};

export function ConfirmBox({
  title,
  description,
  confirmLabel = "승인 필요",
}: ConfirmBoxProps) {
  return (
    <section className="rounded-md border border-amber-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="rounded-md bg-amber-50 px-3 py-1 text-xs font-black text-amber-900 ring-1 ring-amber-200">
          {confirmLabel}
        </span>
      </div>
    </section>
  );
}
