import type { ReactNode } from "react";
import { AdminSidebar, type NavItem } from "@/components/layout/AdminSidebar";
import { TopBar } from "@/components/layout/TopBar";

type AppShellProps = {
  title: string;
  subtitle: string;
  sectionTitle: string;
  scopeLabel: string;
  navItems: NavItem[];
  accent?: "admin" | "company" | "nursery" | "tablet" | "guest";
  surface?: "light" | "dark";
  children: ReactNode;
};

export function AppShell({
  title,
  subtitle,
  sectionTitle,
  scopeLabel,
  navItems,
  accent,
  surface = "light",
  children,
}: AppShellProps) {
  const isDark = surface === "dark";
  const sidebarTitle =
    accent === "admin"
      ? "최고관리자"
      : accent === "company"
        ? "기업 관리자"
        : accent === "nursery"
          ? "산후조리원 관리자"
          : sectionTitle;

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950 text-white" : "bg-[#f6f7f9] text-slate-950"}`}>
      <div className="flex min-h-screen">
        <AdminSidebar title={sidebarTitle} navItems={navItems} accent={accent} surface={surface} />
        <div className="min-w-0 flex-1">
          <TopBar title={title} subtitle={subtitle} scopeLabel={scopeLabel} surface={surface} />
          <main className="px-4 py-5 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
