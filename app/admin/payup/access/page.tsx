import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems } from "@/components/layout/navigation";
import { PayupAccessControlWorkspace } from "@/components/admin/PayupAccessControlWorkspace";

export default function Page() {
  return (
    <AppShell
      sectionTitle="A5S 기업관리자"
      title="PayUp 전체 액세스 관장"
      subtitle="A5S·A5WS·A5LS 관리자와 하위사업자 권한, 조직 범위, 2인 승인과 계정 회수를 중앙 관리합니다."
      scopeLabel="A5S 기업관리자 / PayUp 접근정책"
      navItems={adminNavItems}
      accent="admin"
    >
      <PayupAccessControlWorkspace />
    </AppShell>
  );
}
