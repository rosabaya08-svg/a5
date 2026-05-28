"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { NavSection } from "@/components/layout/navigation";

export type { NavItem, NavSection } from "@/components/layout/navigation";

type AdminSidebarProps = {
  title: string;
  navItems: NavSection[];
  accent?: "admin" | "company" | "nursery" | "tablet" | "guest";
  surface?: "light" | "dark";
};

const accentTokens = {
  admin: {
    mark: "bg-blue-600",
    text: "text-blue-700",
    soft: "bg-blue-50 text-blue-800",
    active: "bg-blue-50 text-blue-950",
    ring: "ring-blue-200",
  },
  company: {
    mark: "bg-emerald-600",
    text: "text-emerald-700",
    soft: "bg-emerald-50 text-emerald-800",
    active: "bg-emerald-50 text-emerald-950",
    ring: "ring-emerald-200",
  },
  nursery: {
    mark: "bg-rose-600",
    text: "text-rose-700",
    soft: "bg-rose-50 text-rose-800",
    active: "bg-rose-50 text-rose-950",
    ring: "ring-rose-200",
  },
  tablet: {
    mark: "bg-amber-600",
    text: "text-amber-700",
    soft: "bg-amber-50 text-amber-800",
    active: "bg-amber-50 text-amber-950",
    ring: "ring-amber-200",
  },
  guest: {
    mark: "bg-slate-600",
    text: "text-slate-700",
    soft: "bg-slate-100 text-slate-800",
    active: "bg-slate-100 text-slate-950",
    ring: "ring-slate-200",
  },
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function findActiveSectionTitle(navItems: NavSection[], pathname: string) {
  return navItems.find((section) => section.items.some((item) => isActivePath(pathname, item.href)))?.title;
}

export function AdminSidebar({
  title,
  navItems,
  accent = "admin",
  surface = "light",
}: AdminSidebarProps) {
  const isDark = surface === "dark";
  const pathname = usePathname();
  const activeSectionTitle = useMemo(() => findActiveSectionTitle(navItems, pathname), [navItems, pathname]);
  const [manualOpenSection, setManualOpenSection] = useState<{ pathname: string; sectionTitle: string } | null>(null);
  const openSectionTitle =
    manualOpenSection?.pathname === pathname ? manualOpenSection.sectionTitle : activeSectionTitle ?? navItems[0]?.title ?? "";
  const tokens = accentTokens[accent];

  return (
    <aside
      className={`sticky top-0 flex h-screen w-[236px] shrink-0 flex-col overflow-hidden border-r md:w-[292px] ${
        isDark ? "border-white/10 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"
      }`}
    >
      <div className="shrink-0 px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <span className={`h-9 w-1.5 rounded-full ${tokens.mark}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">with.commerce</p>
            <h1 className="mt-1 truncate text-lg font-black tracking-normal">{title}</h1>
          </div>
        </div>
      </div>

      <nav className="a5-console-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-5" aria-label={`${title} 메뉴`}>
        {navItems.map((section) => {
          const isOpen = openSectionTitle === section.title;
          const hasActiveItem = section.items.some((item) => isActivePath(pathname, item.href));
          const sectionTone = hasActiveItem
            ? `${tokens.active} ring-1 ${tokens.ring}`
            : isDark
              ? "text-slate-300 hover:bg-white/10 hover:text-white"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-950";

          return (
            <section key={section.title} className="rounded-md">
              <button
                type="button"
                onClick={() =>
                  setManualOpenSection({
                    pathname,
                    sectionTitle: isOpen ? "" : section.title,
                  })
                }
                aria-expanded={isOpen}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition ${sectionTone}`}
              >
                <span className="min-w-0 truncate text-sm font-black">{section.title}</span>
                <span
                  aria-hidden="true"
                  className={`flex size-5 shrink-0 items-center justify-center text-xs font-black transition ${
                    isOpen ? "rotate-90" : ""
                  } ${hasActiveItem ? tokens.text : "text-slate-400"}`}
                >
                  &gt;
                </span>
              </button>
              {isOpen ? (
                <div className="grid gap-0.5 pb-2 pl-3 pt-1">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const linkTone = active
                      ? `${tokens.active} ${tokens.text}`
                      : isDark
                        ? "text-slate-300 hover:bg-white/10 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950";

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setManualOpenSection({ pathname: item.href, sectionTitle: section.title })}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex min-h-9 items-center rounded-md px-3 py-2 text-sm font-bold transition ${linkTone}`}
                      >
                        {active ? <span className={`absolute left-0 top-2 h-5 w-1 rounded-full ${tokens.mark}`} aria-hidden="true" /> : null}
                        <span className="truncate pl-2">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
