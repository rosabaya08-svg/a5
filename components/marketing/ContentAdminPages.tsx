import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems, companyNavItems } from "@/components/layout/navigation";
import { CompanyProductDraftPreview } from "@/components/company/CompanyProductDraftPreview";
import { FirebaseCmsManager } from "@/components/firebase/FirebaseCmsManager";
import type { NavSection } from "@/components/layout/AdminSidebar";
import { DataTable } from "@/components/ui/DataTable";
import { mockApi } from "@/lib/mock/mockApi";

export const legacyAdminMarketingNav: NavSection[] = adminNavItems;
export const legacyCompanyContentNav: NavSection[] = companyNavItems;

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
    <AppShell sectionTitle="최고관리자" title={title} subtitle={subtitle} scopeLabel="콘텐츠 검수" navItems={adminNavItems} accent="admin">
      {children}
    </AppShell>
  );
}

function CompanyContentShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell sectionTitle="기업 관리자" title={title} subtitle={subtitle} scopeLabel="입점사 콘텐츠" navItems={companyNavItems} accent="company">
      {children}
    </AppShell>
  );
}

function RequestCards({ items }: { items: Array<{ title: string; body: string; status: string }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.title} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{item.status}</p>
          <h2 className="mt-2 text-lg font-black text-slate-950">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
        </article>
      ))}
    </div>
  );
}

export async function AdminBannerManagementPage() {
  return (
    <AdminContentShell title="배너/광고 관리" subtitle="폐쇄몰 배너 이미지를 등록하고 노출 위치와 승인 상태를 관리합니다.">
      <FirebaseCmsManager mode="admin" defaultTab="banners" />
    </AdminContentShell>
  );
}

export async function AdminVideoManagementPage() {
  return (
    <AdminContentShell title="영상/GIF 관리" subtitle="폐쇄몰 영상 소재를 등록하고 노출 기간과 승인 상태를 관리합니다.">
      <FirebaseCmsManager mode="admin" defaultTab="videos" />
    </AdminContentShell>
  );
}

export async function AdminBrandManagementPage() {
  return (
    <AdminContentShell title="브랜드관 관리" subtitle="공식 파트너 브랜드 정보와 노출 상태를 관리합니다.">
      <DataTable
        columns={["브랜드", "대상 상품", "상태", "노출 위치"]}
        rows={mockApi.products().map((product) => ({
          id: product.id,
          cells: [product.brand ?? "A5 Partner", product.name, "운영중", "태블릿 상품 목록"],
        }))}
      />
    </AdminContentShell>
  );
}

export function AdminHomeEditorPage() {
  return (
    <AdminContentShell title="홈 편집" subtitle="태블릿 폐쇄몰 홈 배너, 영상, 브랜드관, 노출 순서를 관리합니다.">
      <FirebaseCmsManager mode="admin" defaultTab="banners" />
    </AdminContentShell>
  );
}

export function AdminExhibitionsPage() {
  return (
    <AdminContentShell title="기획전 관리" subtitle="브랜드별 기획전, 추천 상품 편성, 승인 상태를 관리합니다.">
      <DataTable
        columns={["기획전", "상품 수", "대상", "기간", "상태"]}
        rows={[
          { id: "exhibition-1", cells: ["조리원 필수템", "2개", "전체 조리원", "상시", "운영중"] },
          { id: "exhibition-2", cells: ["현장수령 추천", "1개", "701호", "이번 달", "승인대기"] },
        ]}
      />
    </AdminContentShell>
  );
}

export async function CompanyProductPreviewPage() {
  return (
    <CompanyContentShell title="상품 등록 미리보기" subtitle="승인 요청 전 고객에게 보일 상품 상세 구성을 확인합니다.">
      <CompanyProductDraftPreview />
    </CompanyContentShell>
  );
}

export async function CompanyBannerAdPage() {
  return (
    <CompanyContentShell title="배너 광고 소재 제출" subtitle="배너 이미지, 연결 상품, 노출 희망 위치를 제출합니다.">
      <RequestCards
        items={[
          { title: "태블릿 홈 배너", body: "대표 이미지와 연결 상품을 등록해 승인 요청합니다.", status: "작성중" },
          { title: "상품 목록 배너", body: "카테고리 또는 기획전으로 연결할 수 있습니다.", status: "작성중" },
        ]}
      />
    </CompanyContentShell>
  );
}

export async function CompanyVideoAdPage() {
  return (
    <CompanyContentShell title="영상 광고 소재 제출" subtitle="영상 파일, 썸네일, 노출 위치를 제출합니다.">
      <RequestCards items={[{ title: "15초 브랜드 영상", body: "영상 파일과 썸네일, 연결 상품을 등록합니다.", status: "작성중" }]} />
    </CompanyContentShell>
  );
}

export async function CompanyBrandRoomPage() {
  return (
    <CompanyContentShell title="브랜드관 정보 수정" subtitle="브랜드 소개, 로고, 대표 상품, 고객 안내 문구를 관리합니다.">
      <RequestCards
        items={[
          { title: "브랜드 소개", body: "조리원 고객에게 보일 브랜드 설명을 작성합니다.", status: "작성중" },
          { title: "대표 상품", body: "브랜드관 상단에 노출할 상품을 선택합니다.", status: "선택 필요" },
        ]}
      />
    </CompanyContentShell>
  );
}

export function CompanyExhibitionApplyPage() {
  return (
    <CompanyContentShell title="기획전 참여 신청" subtitle="기획전 참여 상품, 할인율, 노출 기간을 제출합니다.">
      <DataTable
        columns={["상품", "희망 기획전", "할인율", "상태"]}
        rows={mockApi.products().map((product) => ({
          id: product.id,
          cells: [product.name, "조리원 필수템", "10%", "작성중"],
        }))}
      />
    </CompanyContentShell>
  );
}
