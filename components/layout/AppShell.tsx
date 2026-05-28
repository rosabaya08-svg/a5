import type { ReactNode } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AdminSidebar, type NavSection } from "@/components/layout/AdminSidebar";
import { TopBar } from "@/components/layout/TopBar";

type AppShellProps = {
  title: string;
  subtitle: string;
  sectionTitle: string;
  scopeLabel: string;
  navItems: NavSection[];
  accent?: "admin" | "company" | "nursery" | "tablet" | "guest";
  surface?: "light" | "dark";
  children: ReactNode;
};

const roleTitles = {
  admin: "최고관리자",
  company: "기업 관리자",
  nursery: "조리원 관리자",
  tablet: "태블릿",
  guest: "고객",
} satisfies Record<NonNullable<AppShellProps["accent"]>, string>;

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
  const sidebarTitle = accent ? roleTitles[accent] : sectionTitle;
  const guardedRole = accent === "admin" || accent === "company" || accent === "nursery" ? accent : null;

  const shell = (
    <div className={`min-h-screen ${isDark ? "bg-slate-950 text-white" : "bg-[#f5f7fb] text-slate-950"}`}>
      <div className="flex min-h-screen">
        <AdminSidebar title={sidebarTitle} navItems={navItems} accent={accent} surface={surface} />
        <div className="min-w-0 flex-1">
          <TopBar title={title} subtitle={subtitle} scopeLabel={scopeLabel} surface={surface} />
          <main className="px-4 py-5 md:px-6 md:py-6 xl:px-8">{children}</main>
        </div>
      </div>
    </div>
  );

  return guardedRole ? <RoleGuard role={guardedRole}>{shell}</RoleGuard> : shell;
}
