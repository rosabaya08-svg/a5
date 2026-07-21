import { AdminStorefrontHomeVisualEditor } from "@/components/admin/AdminStorefrontHomeVisualEditor";
import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems } from "@/components/layout/navigation";
import type { NavSection } from "@/components/layout/AdminSidebar";
import { FirebaseCmsManager } from "@/components/firebase/FirebaseCmsManager";

export const legacyAdminMarketingNav: NavSection[] = adminNavItems;

function AdminContentShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell sectionTitle="최고관리자" title={title} subtitle={subtitle} scopeLabel="홈/광고 운영" navItems={adminNavItems} accent="admin">
      {children}
    </AppShell>
  );
}

export async function AdminBannerManagementPage() {
  return (
    <AdminContentShell title="배너 이미지" subtitle="폐쇄몰과 모바일 둘러보기 배너 이미지를 등록하고 노출 위치를 관리합니다.">
      <FirebaseCmsManager mode="admin" defaultTab="banners" />
    </AdminContentShell>
  );
}

export async function AdminVideoManagementPage() {
  return (
    <AdminContentShell title="영상 광고" subtitle="폐쇄몰 영상 소재를 등록하고 노출 기간과 연결 경로를 관리합니다.">
      <FirebaseCmsManager mode="admin" defaultTab="videos" />
    </AdminContentShell>
  );
}

export async function AdminBrandManagementPage() {
  return (
    <AdminContentShell title="브랜드관 관리" subtitle="공식 파트너 브랜드 정보와 노출 상태를 관리합니다.">
      <FirebaseCmsManager mode="admin" defaultTab="brands" />
    </AdminContentShell>
  );
}

export function AdminHomeEditorPage() {
  return (
    <AdminContentShell title="홈/배너 관리" subtitle="태블릿 폐쇄몰 홈 배너, 영상, 브랜드관, 노출 순서를 관리합니다.">
      <AdminStorefrontHomeVisualEditor />
    </AdminContentShell>
  );
}

export function AdminExhibitionsPage() {
  return (
    <AdminContentShell title="기획전 관리" subtitle="브랜드별 기획전, 추천 상품 편성, 승인 상태를 관리합니다.">
      <FirebaseCmsManager mode="admin" defaultTab="theme" />
    </AdminContentShell>
  );
}
