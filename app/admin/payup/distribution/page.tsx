import { PayupDistributionPolicyWorkspace } from "@/components/admin/PayupDistributionPolicyWorkspace";
import { AppShell } from "@/components/layout/AppShell";
import { payupAdminNavItems } from "@/components/layout/payupNavigation";

export default function Page() {
  return (
    <AppShell
      sectionTitle="A5S 기업관리자"
      title="PayUp 상품 차액분배 정책"
      subtitle="상품별 공급사 상품대금·A5S 이용료·파트너 차액·배송비를 2인 승인으로 관리합니다."
      scopeLabel="A5S 기업관리자 / PayUp 분배 정책"
      navItems={payupAdminNavItems}
      accent="admin"
    >
      <PayupDistributionPolicyWorkspace />
    </AppShell>
  );
}
