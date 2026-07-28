import { PortalLogoutButton } from "@/components/auth/PortalLogoutButton";
import type { PortalRole } from "@/lib/auth/session";

type TopBarProps = {
  title: string;
  subtitle: string;
  scopeLabel: string;
  logoutRole?: PortalRole;
  surface?: "light" | "dark";
};

export function TopBar({ title, subtitle, scopeLabel, logoutRole, surface = "light" }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[82px] items-center border-b border-slate-700 bg-[#172531] px-5 text-white md:px-6">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-[11px] font-normal tracking-[0.08em] text-sky-300">{scopeLabel}</span>
            <span className="h-3 w-px shrink-0 bg-slate-600" aria-hidden="true" />
            <h2 className="truncate text-lg font-normal tracking-normal text-white">{title}</h2>
          </div>
          {subtitle ? <p className="mt-1 truncate text-xs font-normal text-slate-300">{subtitle}</p> : null}
        </div>
        {logoutRole ? <PortalLogoutButton role={logoutRole} surface={surface} /> : null}
      </div>
    </header>
  );
}
