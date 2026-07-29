import { AppShell } from "@/components/layout/AppShell";
import { payupAdminNavItems } from "@/components/layout/payupNavigation";
import { PayupSwitchboardWorkspace } from "@/components/admin/PayupSwitchboardWorkspace";

export default function Page() {
  return (
    <AppShell
      sectionTitle="A5S 기업관리자"
      title="PayUp 운영 배전판"
      subtitle="고정 IP·Secret·의존 회로와 2인 승인을 확인하고 실제 PayUp 회로를 단계별로 ON/OFF 합니다."
      scopeLabel="A5S 기업관리자 / PayUp 운영회로"
      navItems={payupAdminNavItems}
      accent="admin"
    >
      <PayupSwitchboardWorkspace />
    </AppShell>
  );
}
