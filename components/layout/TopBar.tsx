type TopBarProps = {
  title: string;
  subtitle: string;
  scopeLabel: string;
  surface?: "light" | "dark";
};

export function TopBar({ title, subtitle, scopeLabel, surface = "light" }: TopBarProps) {
  const isDark = surface === "dark";

  return (
    <header className={`border-b px-4 py-5 md:px-6 ${isDark ? "border-white/10 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
      <p className={`text-xs font-black uppercase tracking-[0.12em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        {scopeLabel}
      </p>
      <h2 className={`mt-1 text-2xl font-black ${isDark ? "text-white" : "text-slate-950"}`}>{title}</h2>
      <p className={`mt-1 max-w-3xl text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>
    </header>
  );
}
