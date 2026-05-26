import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems } from "@/components/layout/navigation";
import { PgGatewaySettingsPanel } from "@/components/admin/PgGatewaySettingsPanel";

export default function Page() {
  return (
    <AppShell
      sectionTitle="최고관리자"
      title="인피니 PG / MID 설정"
      subtitle="기업별 인피니 MID, 수수료, 분할정산 전환 조건을 최고관리자 권한으로 관리합니다."
      scopeLabel="최고관리자 / 결제 설정"
      navItems={adminNavItems}
      accent="admin"
    >
      <PgGatewaySettingsPanel />
    </AppShell>
  );
}
