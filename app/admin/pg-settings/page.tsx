import { PgGatewaySettingsPanel } from "@/components/admin/PgGatewaySettingsPanel";
import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems } from "@/components/layout/navigation";

export default function Page() {
  return (
    <AppShell
      sectionTitle="최고관리자"
      title="인피니 PG / MID 설정"
      subtitle="기업별 인피니 MID, 결제 모듈, webhook, 분할정산 운영 조건을 최고관리자 권한으로 관리합니다."
      scopeLabel="최고관리자 / 결제 설정"
      navItems={adminNavItems}
      accent="admin"
    >
      <PgGatewaySettingsPanel />
    </AppShell>
  );
}
