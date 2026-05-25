type TopBarProps = {
  title: string;
  subtitle: string;
  scopeLabel: string;
  surface?: "light" | "dark";
};

export function TopBar({ title, subtitle, scopeLabel, surface = "light" }: TopBarProps) {
  const isDark = surface === "dark";

  return (
    <header className={`flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:px-6 ${isDark ? "border-white/10 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
      <div>
        <p className={`text-xs font-black uppercase tracking-[0.12em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {scopeLabel}
        </p>
        <h2 className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-slate-950"}`}>{title}</h2>
        <p className={`mt-1 max-w-3xl text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
          모의/테스트 베타
        </span>
        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">
          실결제 아님
        </span>
        <span className={`rounded-full border px-3 py-2 text-xs font-black ${isDark ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          {isDark ? "다크 모드" : "화이트 모드"}
        </span>
      </div>
    </header>
  );
}

