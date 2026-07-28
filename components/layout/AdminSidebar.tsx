"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { PortalLogoutButton } from "@/components/auth/PortalLogoutButton";
import type { PortalRole } from "@/lib/auth/session";
import type { NavItem, NavSection } from "@/components/layout/navigation";

export type { NavItem, NavSection } from "@/components/layout/navigation";

type AdminSidebarProps = {
  title: string;
  navItems: NavSection[];
  accent?: "admin" | "company" | "nursery" | "tablet" | "guest";
  surface?: "light" | "dark";
  logoutRole?: Extract<PortalRole, "company" | "nursery">;
};

function getHrefPath(href: string) {
  return href.split("#")[0]?.split("?")[0] || href;
}

function routeMatches(pathname: string, href: string) {
  const hrefPath = getHrefPath(href);
  return pathname === hrefPath || pathname.startsWith(hrefPath + "/");
}

function collectItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [item, ...collectItems(item.children ?? [])]);
}

function findActiveHref(navItems: NavSection[], pathname: string) {
  return navItems
    .flatMap((section) => collectItems(section.items))
    .filter((item) => routeMatches(pathname, item.href))
    .sort((a, b) => getHrefPath(b.href).length - getHrefPath(a.href).length)[0]?.href;
}

function hasActiveItem(item: NavItem, activeHref: string | undefined): boolean {
  return item.href === activeHref || Boolean(item.children?.some((child) => hasActiveItem(child, activeHref)));
}

function ReturnToMomcareButton() {
  function returnToMomcare() {
    window.close();

    window.setTimeout(() => {
      if (window.history.length > 1) {
        window.history.back();
      }
    }, 120);
  }

  return (
    <button
      type="button"
      onClick={returnToMomcare}
      className="flex min-h-10 w-full items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
    >
      <span aria-hidden="true">&lt;</span>
      <span>맘케어로 돌아가기</span>
    </button>
  );
}

export function AdminSidebar({
  title,
  navItems,
  accent = "admin",
  surface = "light",
  logoutRole,
}: AdminSidebarProps) {
  const pathname = usePathname() ?? "";
  const activeHref = useMemo(() => findActiveHref(navItems, pathname), [navItems, pathname]);
  const activeSectionTitle = useMemo(
    () => navItems.find((section) => section.items.some((item) => hasActiveItem(item, activeHref)))?.title,
    [activeHref, navItems],
  );
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, boolean>>({});
  const roleLabel =
    accent === "admin"
      ? "최고관리자"
      : accent === "company"
        ? "기업관리자"
        : accent === "nursery"
          ? "조리원관리자"
          : title;

  function setSectionOpen(sectionTitle: string, open: boolean) {
    setSectionOverrides((current) => ({ ...current, [sectionTitle]: open }));
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white text-slate-900 md:w-[236px]">
      <div className="flex h-[82px] shrink-0 items-center gap-3 bg-[#172531] px-4 text-white">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded bg-sky-500 text-sm font-normal text-white"
          aria-hidden="true"
        >
          W
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-normal tracking-[0.08em]">위드커머스</p>
          <p className="mt-1 truncate text-xs font-normal text-slate-300">{roleLabel}</p>
        </div>
      </div>

      <nav
        className="a5-console-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto py-3"
        aria-label={title + " 메뉴"}
      >
        {navItems.map((section, sectionIndex) => {
          const hasActiveSection = section.items.some((item) => hasActiveItem(item, activeHref));
          const isOpen =
            sectionOverrides[section.title] ?? (hasActiveSection || (!activeSectionTitle && sectionIndex === 0));
          const firstHref = section.items[0]?.href ?? "#";
          const isSingleItem = section.items.length === 1 && !section.items[0]?.children?.length;
          const sectionClass = hasActiveSection
            ? "border-sky-500 bg-sky-50 text-sky-800"
            : "border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-950";

          if (isSingleItem) {
            return (
              <Link
                key={section.title}
                href={firstHref}
                aria-current={hasActiveSection ? "page" : undefined}
                className={
                  "mx-2 flex min-h-11 items-center border-l-2 px-3 py-2 text-sm font-normal transition " + sectionClass
                }
              >
                <span className="truncate">{section.title}</span>
              </Link>
            );
          }

          return (
            <section key={section.title} className="mt-0.5">
              <div className={"mx-2 flex min-h-11 items-center border-l-2 transition " + sectionClass}>
                <Link
                  href={firstHref}
                  onClick={() => setSectionOpen(section.title, true)}
                  className="flex min-w-0 flex-1 items-center px-3 py-2 text-sm font-normal"
                >
                  <span className="truncate">{section.title}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSectionOpen(section.title, !isOpen)}
                  aria-expanded={isOpen}
                  aria-label={section.title + " 하위 메뉴 " + (isOpen ? "접기" : "열기")}
                  className="flex size-10 shrink-0 items-center justify-center text-slate-400 transition hover:text-sky-700"
                >
                  <span aria-hidden="true" className={"text-base transition " + (isOpen ? "rotate-90" : "")}>
                    &gt;
                  </span>
                </button>
              </div>

              {isOpen ? (
                <div className="mx-2 border-l border-slate-200 py-1 pl-3">
                  {section.items.map((item) => {
                    const itemActive = hasActiveItem(item, activeHref);
                    const itemClass = itemActive
                      ? "bg-sky-50 text-sky-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950";

                    return (
                      <div key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={item.href === activeHref ? "page" : undefined}
                          className={
                            "relative flex min-h-9 items-center rounded-sm px-3 py-2 text-[13px] font-normal transition " +
                            itemClass
                          }
                        >
                          {item.href === activeHref ? (
                            <span className="absolute left-0 top-2 h-5 w-0.5 bg-sky-500" aria-hidden="true" />
                          ) : null}
                          <span className="truncate">{item.label}</span>
                        </Link>
                        {item.children?.length ? (
                          <div className="ml-3 border-l border-slate-200 pl-2">
                            {item.children.map((child) => {
                              const childActive = child.href === activeHref;
                              const childClass = childActive
                                ? "bg-sky-50 text-sky-800"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900";

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  aria-current={childActive ? "page" : undefined}
                                  className={
                                    "flex min-h-8 items-center px-3 py-1.5 text-xs font-normal transition " + childClass
                                  }
                                >
                                  <span className="truncate">{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>

      {logoutRole || accent === "nursery" ? (
        <div className="grid shrink-0 gap-2 border-t border-slate-200 bg-slate-50 p-3">
          {logoutRole ? <PortalLogoutButton role={logoutRole} surface={surface} className="w-full" /> : null}
          {accent === "nursery" ? <ReturnToMomcareButton /> : null}
        </div>
      ) : null}
    </aside>
  );
}
