import { AppShell } from "@/components/layout/AppShell";
import { companyNavItems } from "@/components/layout/navigation";
import { CompanyPayupActivityPanel } from "@/components/company/CompanyPayupActivityPanel";

export default function Page() {
  return (
    <AppShell
      sectionTitle="기업 관리자"
      title="내 PayUp 판매·정산 로그"
      subtitle="내 사업자 범위의 판매, 거래대사, 수취예정액, 취소와 정산 이벤트를 확인합니다."
      scopeLabel="기업·A5WS 파트너 / 본인 사업자 범위"
      navItems={companyNavItems}
      accent="company"
    >
      <CompanyPayupActivityPanel />
    </AppShell>
  );
}
