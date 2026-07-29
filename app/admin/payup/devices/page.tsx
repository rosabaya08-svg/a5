import { AppShell } from "@/components/layout/AppShell";
import { payupAdminNavItems } from "@/components/layout/payupNavigation";
import { TabletDeviceEnrollmentWorkspace } from "@/components/admin/TabletDeviceEnrollmentWorkspace";

export default function Page() {
  return (
    <AppShell
      sectionTitle="A5S 기업관리자"
      title="태블릿 Firebase 등록"
      subtitle="조리원·객실·태블릿 범위를 일회용 코드로 고정하고 TABLET_DEVICE Claim과 접근회수를 관리합니다."
      scopeLabel="A5S 기업관리자 / TABLET_DEVICE"
      navItems={payupAdminNavItems}
      accent="admin"
    >
      <TabletDeviceEnrollmentWorkspace />
    </AppShell>
  );
}
