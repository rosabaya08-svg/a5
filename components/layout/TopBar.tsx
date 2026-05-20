type TopBarProps = {
  title: string;
  subtitle: string;
  scopeLabel: string;
};

export function TopBar({ title, subtitle, scopeLabel }: TopBarProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {scopeLabel}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
        Mock only
      </div>
    </header>
  );
}
