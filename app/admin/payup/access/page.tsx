import { AppShell } from "@/components/layout/AppShell";
import { payupAdminNavItems } from "@/components/layout/payupNavigation";
import { PartnerFirebaseInvitationWorkspace } from "@/components/admin/PartnerFirebaseInvitationWorkspace";
import { PayupAccessControlWorkspace } from "@/components/admin/PayupAccessControlWorkspace";

export default function Page() {
  return (
    <AppShell
      sectionTitle="A5S 기업관리자"
      title="PayUp 전체 액세스 관장"
      subtitle="A5S·A5WS·A5LS 관리자와 하위사업자 계정초대, 역할, 조직 범위, 2인 승인과 계정 회수를 중앙 관리합니다."
      scopeLabel="A5S 기업관리자 / PayUp 접근정책"
      navItems={payupAdminNavItems}
      accent="admin"
    >
      <div className="grid gap-5">
        <PartnerFirebaseInvitationWorkspace />
        <PayupAccessControlWorkspace />
      </div>
    </AppShell>
  );
}
