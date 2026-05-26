import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems } from "@/components/layout/navigation";
import { PgGatewaySettingsPanel } from "@/components/admin/PgGatewaySettingsPanel";

export default function Page() {
  return (
    <AppShell
      sectionTitle="최고관리자"
      title="PG 결제 모듈 설정"
      subtitle="PG사 변경, 공개 API 설정값, Functions secret 입력 대상을 한 화면에서 검토합니다."
      scopeLabel="최고관리자 / 결제 설정"
      navItems={adminNavItems}
      accent="admin"
    >
      <PgGatewaySettingsPanel />
    </AppShell>
  );
}
