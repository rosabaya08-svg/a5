import Link from "next/link";

export type NavItem = {
  href: string;
  label: string;
  badge?: string;
};

type AdminSidebarProps = {
  title: string;
  navItems: NavItem[];
  accent?: "admin" | "company" | "nursery" | "tablet" | "guest";
  surface?: "light" | "dark";
};

const accentClasses = {
  admin: "border-blue-500 bg-blue-50 text-blue-950",
  company: "border-emerald-500 bg-emerald-50 text-emerald-950",
  nursery: "border-rose-500 bg-rose-50 text-rose-950",
  tablet: "border-amber-500 bg-amber-50 text-amber-950",
  guest: "border-slate-500 bg-slate-50 text-slate-950",
};

export function AdminSidebar({
  title,
  navItems,
  accent = "admin",
  surface = "light",
}: AdminSidebarProps) {
  const isDark = surface === "dark";

  return (
    <aside className={`hidden min-h-screen w-64 shrink-0 flex-col border-r lg:flex ${isDark ? "border-white/10 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
      <div className={`border-l-4 px-5 py-5 ${accentClasses[accent]}`}>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          Mock/Test Beta
        </p>
        <h1 className="mt-2 text-lg font-black">{title}</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-bold transition ${isDark ? "text-slate-200 hover:bg-white/10 hover:text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`}
          >
            <span>{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
      <div className={`border-t p-4 text-xs leading-5 ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
        실제 결제, 운영 환불, 정산 지급, 배송조회, 외부 재고 API는 차단된 mock/test beta입니다.
      </div>
    </aside>
  );
}
