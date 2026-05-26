import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems, companyNavItems } from "@/components/layout/navigation";
import type { NavItem } from "@/components/layout/AdminSidebar";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency } from "@/lib/utils/format";

export const legacyAdminMarketingNav: NavItem[] = adminNavItems;
export const legacyCompanyContentNav: NavItem[] = companyNavItems;

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
    <AppShell sectionTitle="최고관리자" title={title} subtitle={subtitle} scopeLabel="콘텐츠 승인" navItems={adminNavItems} accent="admin">
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
        <article key={item.title} className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.status}</p>
          <h2 className="mt-2 text-lg font-black text-slate-950">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
        </article>
      ))}
    </div>
  );
}

export async function AdminBannerManagementPage() {
  return (
    <AdminContentShell title="배너 광고 관리" subtitle="입점사가 제출한 배너 소재의 노출 위치와 승인 상태를 관리합니다.">
      <FilterBar title="배너 필터" filters={["전체", "승인대기", "운영중", "반려"]} resultCount={2} mode="toolbar" />
      <DataTable
        columns={["소재", "노출 위치", "대상", "기간", "상태", "소유자"]}
        rows={[
          { id: "banner-1", cells: ["산후 케어 기획 배너", "태블릿 홈", "전체 조리원", "상시", "승인대기", "A5 테스트 기업"] },
          { id: "banner-2", cells: ["프리미엄 수유용품 배너", "상품 목록", "701호", "이번 달", "운영중", "A5 테스트 기업"] },
        ]}
      />
    </AdminContentShell>
  );
}

export async function AdminVideoManagementPage() {
  return (
    <AdminContentShell title="영상/GIF 관리" subtitle="영상 소재의 승인 상태와 노출 위치를 관리합니다.">
      <FilterBar title="영상 소재 필터" filters={["전체", "승인대기", "반려", "태블릿 홈"]} resultCount={1} mode="toolbar" />
      <DataTable
        columns={["소재", "노출 위치", "길이", "상태", "소유자"]}
        rows={[{ id: "video-1", cells: ["산모 케어 안내 영상", "태블릿 홈", "15초", "승인대기", "A5 테스트 기업"] }]}
      />
    </AdminContentShell>
  );
}

export async function AdminBrandManagementPage() {
  return (
    <AdminContentShell title="브랜드관 관리" subtitle="공식 파트너 브랜드 정보와 노출 상태를 관리합니다.">
      <DataTable
        columns={["브랜드", "대표 상품", "상태", "노출 위치"]}
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
    <AdminContentShell title="홈 편집" subtitle="태블릿 산후조리원 핫딜 홈 섹션과 노출 순서를 관리합니다.">
      <RequestCards
        items={[
          { title: "메인 배너", body: "대표 기획전 배너와 연결 상품을 관리합니다.", status: "운영중" },
          { title: "추천 상품", body: "조리원 객실에 노출할 추천 상품 묶음을 관리합니다.", status: "승인완료" },
          { title: "브랜드관", body: "입점사 브랜드관 노출 순서를 관리합니다.", status: "검토중" },
        ]}
      />
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
  const product = mockApi.products()[0];

  return (
    <CompanyContentShell title="상품 상세 확인" subtitle="승인 요청 전 고객에게 보일 상품 상세 구성을 확인합니다.">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <p className="text-xs font-black text-emerald-700">{product.brand ?? "A5 Partner"}</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">{product.name}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{product.subtitle}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">산후조리원 핫딜가</p>
            <p className="mt-1 text-xl font-black text-rose-600">{formatCurrency(product.price)}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">재고</p>
            <p className="mt-1 text-xl font-black text-slate-950">{product.stock}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">상태</p>
            <p className="mt-1 text-xl font-black text-slate-950">{product.status}</p>
          </div>
        </div>
      </section>
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
