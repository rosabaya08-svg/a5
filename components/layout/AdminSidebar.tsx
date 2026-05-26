"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/components/layout/navigation";

export type { NavItem } from "@/components/layout/navigation";

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

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  title,
  navItems,
  accent = "admin",
  surface = "light",
}: AdminSidebarProps) {
  const isDark = surface === "dark";
  const pathname = usePathname();

  return (
    <aside className={`sticky top-0 flex h-screen w-[232px] shrink-0 flex-col overflow-hidden border-r md:w-[280px] ${isDark ? "border-white/10 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
      <div className={`shrink-0 border-l-4 px-5 py-5 ${accentClasses[accent]}`}>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">A5 CLOSED MALL</p>
        <h1 className="mt-2 text-lg font-black">{title}</h1>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label={`${title} 메뉴`}>
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          const linkTone = active
            ? isDark
              ? "bg-white text-slate-950 shadow-sm"
              : "bg-slate-950 text-white shadow-sm"
            : isDark
              ? "text-slate-200 hover:bg-white/10 hover:text-white"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-950";

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-bold transition ${linkTone}`}
            >
              <span className="truncate">{item.label}</span>
              {item.badge ? (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${active ? "bg-white/15 text-inherit ring-1 ring-current/20" : "bg-slate-900 text-white"}`}>
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
