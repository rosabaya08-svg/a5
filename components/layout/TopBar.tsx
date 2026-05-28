type TopBarProps = {
  title: string;
  subtitle: string;
  scopeLabel: string;
  surface?: "light" | "dark";
};

export function TopBar({ title, subtitle, scopeLabel, surface = "light" }: TopBarProps) {
  const isDark = surface === "dark";

  return (
    <header
      className={`sticky top-0 z-20 border-b px-4 py-4 backdrop-blur md:px-6 xl:px-8 ${
        isDark ? "border-white/10 bg-slate-950/92 text-white" : "border-slate-200 bg-white/92 text-slate-950"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {scopeLabel}
          </p>
          <h2 className={`mt-1 text-[22px] font-black leading-tight tracking-normal ${isDark ? "text-white" : "text-slate-950"}`}>
            {title}
          </h2>
          <p className={`mt-1 max-w-4xl text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
