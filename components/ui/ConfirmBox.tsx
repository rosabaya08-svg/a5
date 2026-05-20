type ConfirmBoxProps = {
  title: string;
  description: string;
  confirmLabel?: string;
};

export function ConfirmBox({
  title,
  description,
  confirmLabel = "사람 승인 필요",
}: ConfirmBoxProps) {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="mt-2 text-sm leading-6">{description}</p>
        </div>
        <span className="rounded-md bg-white px-3 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
          {confirmLabel}
        </span>
      </div>
    </section>
  );
}
