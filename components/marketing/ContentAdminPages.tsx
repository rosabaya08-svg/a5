import Link from "next/link";
import { LegalNoticeChecklist } from "@/components/company/LegalNoticeChecklist";
import { FirebaseCmsManager } from "@/components/firebase/FirebaseCmsManager";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/AdminSidebar";
import { adminNavItems, companyNavItems } from "@/components/layout/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { MarketingSlot, MallProductProfile } from "@/data/mockShopContent";
import { commerceRepositories } from "@/lib/repositories";
import { getLiveStorefrontContent } from "@/lib/repositories/liveCommerceRepository";
import { repositoryData, type StorefrontContent } from "@/lib/repositories/types";
import { formatCurrency } from "@/lib/utils/format";

export const legacyAdminMarketingNav: NavItem[] = adminNavItems;
export const legacyCompanyContentNav: NavItem[] = companyNavItems;

function LiveFirebaseNotice({ owner }: { owner: "admin" | "company" }) {
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-black">파이어베이스 라이브 베타 연결됨</h2>
          <p className="mt-2 text-sm leading-6">
            파이어스토어 콘텐츠 관리와 파이어베이스 스토리지 업로드가 A5 폐쇄몰 베타에 연결되어 있습니다.
            {owner === "company"
              ? " 기업 화면은 입점사 범위로 저장되며, 실제 노출 전에는 관리자 승인 규칙이 필요합니다."
              : " 최고관리자 화면은 배너, 영상, 홈 섹션, 상세페이지, 미디어 자산을 베타 기록으로 관리합니다."}
            PG, 주문, 정산, 환불, 알림톡, 배송조회, 외부 재고는 계속 차단되어 있습니다.
          </p>
          <div className="hidden">
          <h2 className="font-black">모의/테스트 베타 전용 화면</h2>
          <p className="mt-2 text-sm leading-6">
            파이어스토어 콘텐츠 관리 저장과 파이어베이스 스토리지 업로드가 연결되었습니다.
            {owner === "company"
              ? " 입점사 화면은 company_id scope로 저장되며, 실제 승인/노출은 관리자 권한과 rules를 따릅니다."
              : " 최고관리자 화면은 배너, 영상, 홈 섹션, 상세페이지, 미디어 자산을 live beta로 관리합니다."}
            PG, 주문, 정산, 환불, 알림톡, 배송조회, 외부 재고 API는 아직 차단 상태입니다.
            <br />
            이미지 업로드, 영상 업로드, Firebase Storage, 광고 승인 write, 실제 노출 스케줄러는 연결하지 않습니다.
            {owner === "company" ? " 입점사는 승인 요청 전 미리보기와 제출 상태만 확인합니다." : " 최고관리자는 편성/승인/성과 상태만 모의 데이터로 검토합니다."}
          </p>
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-900">파이어스토어 + 스토리지 연결됨</span>
      </div>
    </section>
  );
}

function AdminContentShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <AppShell
      sectionTitle="콘텐츠 운영"
      title={title}
      subtitle={subtitle}
      scopeLabel="최고관리자 / 파이어베이스 베타"
      navItems={adminNavItems}
      accent="admin"
    >
      <div className="grid gap-4">
        <LiveFirebaseNotice owner="admin" />
        <FirebaseCmsManager mode="admin" compact />
        {children}
      </div>
    </AppShell>
  );
}

function CompanyContentShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <AppShell
      sectionTitle="상품 콘텐츠"
      title={title}
      subtitle={subtitle}
      scopeLabel="기업 관리자 / 파이어베이스 베타"
      navItems={companyNavItems}
      accent="company"
    >
      <div className="grid gap-4">
        <LiveFirebaseNotice owner="company" />
        <FirebaseCmsManager mode="company" defaultTab="detail" compact />
        {children}
      </div>
    </AppShell>
  );
}

function BannerPreviewGrid({ content }: { content: StorefrontContent }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {[content.heroBanner, ...content.promoBanners].map((banner) => (
        <article key={banner.id} className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="relative min-h-44">
            <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/25" />
            <div className="relative p-4 text-white">
              <p className="text-xs font-black uppercase tracking-[0.14em]">{banner.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-black">{banner.title}</h3>
              <p className="mt-1 text-sm">{banner.subtitle}</p>
            </div>
          </div>
          <div className="grid gap-2 p-4 text-sm text-slate-600">
            <div className="flex justify-between"><span>링크</span><strong className="text-slate-950">{banner.href}</strong></div>
            <div className="flex justify-between"><span>상태</span><strong className="text-slate-950">모의 승인</strong></div>
          </div>
        </article>
      ))}
    </section>
  );
}

function ContentSlotsTable({ slots, type }: { slots: MarketingSlot[]; type?: "video" | "banner" }) {
  const rows = slots
    .filter((slot) => {
      if (type === "video") return slot.title.includes("영상");
      if (type === "banner") return slot.title.includes("배너") || slot.placement.includes("hero");
      return true;
    })
    .map((slot) => ({
      id: slot.id,
      cells: [
        <span key="title" className="font-semibold text-slate-950">{slot.title}</span>,
        slot.placement,
        slot.target,
        slot.period,
        <StatusBadge key="status" status={slot.status} />,
        slot.owner,
        slot.performance,
      ],
    }));

  return (
    <DataTable
      columns={["소재", "노출 위치", "대상", "기간", "상태", "소유자", "모의 성과"]}
      rows={rows}
      sortLabel="정렬: 노출 우선순위 ASC"
      paginationLabel={`1-${rows.length} / ${rows.length}`}
    />
  );
}

export async function AdminBannerManagementPage() {
  const content = await getLiveStorefrontContent();

  return (
    <AdminContentShell
      title="광고 배너 관리"
      subtitle="메인 배너, 기획전 배너, 팝업 배너의 노출 순서, 기간, 대상, 링크를 모의 데이터로 검토합니다."
    >
      <FilterBar
        title="배너 필터"
        filters={["전체", "승인완료", "승인대기", "기간예약", "대상 조리원", "링크 확인"]}
        mode="toolbar"
        searchPlaceholder="hero, brand, popup"
        resultCount={content.marketingSlots.length}
      />
      <BannerPreviewGrid content={content} />
      <ContentSlotsTable slots={content.marketingSlots} type="banner" />
    </AdminContentShell>
  );
}

export async function AdminVideoManagementPage() {
  const content = await getLiveStorefrontContent();

  return (
    <AdminContentShell
      title="광고 영상 관리"
      subtitle="영상 업로드는 Storage Blaze 전까지 보류하고, 썸네일/승인/노출 위치만 모의 데이터로 관리합니다."
    >
      <FilterBar title="영상 소재 필터" filters={["전체", "승인대기", "반려", "Storage 보류", "태블릿 홈"]} mode="toolbar" searchPlaceholder="산모케어 영상" resultCount={1} />
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <div className="grid aspect-video place-items-center rounded-md bg-slate-950 text-center text-white">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">영상 임시 영역</p>
              <h2 className="mt-2 text-3xl font-black">산모케어 영상 광고</h2>
              <p className="mt-2 text-sm text-slate-300">실제 파일 업로드 없음</p>
            </div>
          </div>
        </article>
        <ContentSlotsTable slots={content.marketingSlots} type="video" />
      </section>
    </AdminContentShell>
  );
}

export async function AdminBrandManagementPage() {
  const content = await getLiveStorefrontContent();

  return (
    <AdminContentShell title="브랜드 로고 관리" subtitle="공식 파트너 브랜드 로고, 브랜드관 링크, 노출 상태를 모의 데이터로 관리합니다.">
      <FilterBar title="브랜드 필터" filters={["전체", "대표 노출", "신규", "검토", "카테고리"]} mode="toolbar" searchPlaceholder="몽쉘베베, 제스파" resultCount={content.brands.length} />
      <section className="grid gap-3 md:grid-cols-4">
        {content.brands.map((brand) => (
          <article key={brand.id} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="grid h-24 place-items-center rounded-md bg-slate-50">
              <img src={brand.logoUrl} alt={brand.name} className="max-h-16 max-w-full object-contain" />
            </div>
            <h3 className="mt-3 font-black text-slate-950">{brand.name}</h3>
            <p className="text-sm text-slate-600">{brand.category}</p>
            <p className="mt-2 text-xs font-bold text-rose-600">{brand.status}</p>
          </article>
        ))}
      </section>
    </AdminContentShell>
  );
}

export function AdminHomeEditorPage() {
  const sections = ["히어로 배너", "오늘의 메가 할인", "브랜드 로고 그리드", "베이비 베스트", "산모케어", "신상품"];

  return (
    <AdminContentShell title="메인 쇼핑몰 홈 편집" subtitle="배포 쇼핑몰형 홈 섹션 편성을 모의 데이터로 검토합니다.">
      <section className="grid gap-3">
        {sections.map((section, index) => (
          <article key={section} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">섹션 {index + 1}</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">{section}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">순서 {index + 1}</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">모의 노출</span>
            </div>
          </article>
        ))}
      </section>
    </AdminContentShell>
  );
}

export function AdminExhibitionsPage() {
  return (
    <AdminContentShell title="기획전 관리" subtitle="브랜드별 기획전, 추천 상품 편성, 승인 상태를 모의 데이터로 확인합니다.">
      <DataTable
        columns={["기획전", "상품 수", "브랜드", "상태", "링크"]}
        rows={[
          { id: "ex-baby", cells: ["베이비 베스트 핫딜", "12개", "몽쉘베베", <StatusBadge key="status" status="approved" />, "/tablet/products"] },
          { id: "ex-mom", cells: ["산모케어 스페셜", "8개", "밀리맘/제스파", <StatusBadge key="status" status="pending_approval" />, "/tablet/products"] },
          { id: "ex-new", cells: ["신상품 쇼케이스", "6개", "신규 브랜드", <StatusBadge key="status" status="draft" />, "/tablet/products"] },
        ]}
        sortLabel="정렬: 홈 노출 순서"
      />
    </AdminContentShell>
  );
}

async function ProductPreviewCards({ profiles }: { profiles: MallProductProfile[] }) {
  const products = repositoryData(await commerceRepositories.products.listApprovedProducts());

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {profiles.slice(0, 6).map((profile) => {
        const product = products.find((item) => item.id === profile.productId);
        return (
          <article key={profile.productId} className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <img src={profile.imageUrl} alt={profile.displayName} className="aspect-[4/3] w-full object-cover" />
            <div className="p-4">
              <p className="text-xs font-black text-rose-600">{profile.brand}</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">{profile.displayName}</h3>
              <p className="mt-1 text-sm text-slate-600">{profile.subtitle}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <strong className="text-xl text-rose-600">{product ? formatCurrency(product.price) : "모의 가격"}</strong>
                <Link href={`/tablet/products/${profile.productId}`} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
                  고객 미리보기
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export async function CompanyProductPreviewPage() {
  const content = await getLiveStorefrontContent();
  const productPreviewCards = await ProductPreviewCards({ profiles: content.productProfiles });

  return (
    <CompanyContentShell title="상세페이지 미리보기" subtitle="상품 상세 본문, 이미지 갤러리, 모바일/태블릿 미리보기를 승인 요청 전에 확인합니다.">
      <FilterBar title="미리보기 필터" filters={["전체", "임시저장", "승인요청 전", "반려 수정", "모바일", "태블릿"]} mode="toolbar" searchPlaceholder="상품명 또는 브랜드" resultCount={content.productProfiles.length} />
      <div className="mt-4" />
      <LegalNoticeChecklist />
      <div className="mt-4" />
      {productPreviewCards}
    </CompanyContentShell>
  );
}

export async function CompanyBannerAdPage() {
  const content = await getLiveStorefrontContent();

  return (
    <CompanyContentShell title="배너 광고 소재 제출" subtitle="입점사가 배너 광고 소재와 링크를 제출하는 모의 화면입니다.">
      <BannerPreviewGrid content={content} />
    </CompanyContentShell>
  );
}

export async function CompanyVideoAdPage() {
  const content = await getLiveStorefrontContent();

  return (
    <CompanyContentShell title="영상 광고 소재 제출" subtitle="영상 파일 업로드는 보류하고 썸네일, 노출 위치, 승인 상태만 모의 데이터로 확인합니다.">
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <article className="rounded-md border border-slate-200 bg-white p-5">
          <div className="grid aspect-video place-items-center rounded-md bg-slate-950 text-center text-white">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">영상 소재 모의 영역</p>
              <h2 className="mt-2 text-3xl font-black">브랜드 소개 영상</h2>
              <p className="mt-2 text-sm text-slate-300">Storage 업그레이드 전까지 파일 업로드 없음</p>
            </div>
          </div>
        </article>
        <ContentSlotsTable slots={content.marketingSlots} type="video" />
      </section>
    </CompanyContentShell>
  );
}

export async function CompanyBrandRoomPage() {
  const content = await getLiveStorefrontContent();
  const productPreviewCards = await ProductPreviewCards({ profiles: content.productProfiles });

  return (
    <CompanyContentShell title="브랜드관 정보 수정" subtitle="브랜드 로고, 소개, 대표 상품, 기획전 참여 상태를 모의 데이터로 관리합니다.">
      {productPreviewCards}
    </CompanyContentShell>
  );
}

export function CompanyExhibitionApplyPage() {
  return (
    <CompanyContentShell title="기획전 참여 신청" subtitle="기획전 참여 상품, 할인율, 노출 기간을 모의 데이터로 제출합니다.">
      <DataTable
        columns={["기획전", "참여 상품", "할인율", "상태", "사람 확인"]}
        rows={[
          { id: "apply-baby", cells: ["베이비 베스트 핫딜", "몽쉘베베 수딩앰플키트", "50%", <StatusBadge key="status" status="pending_approval" />, "광고 승인 필요"] },
          { id: "apply-mom", cells: ["산모케어 스페셜", "산모 루이보스 티 세트", "40%", <StatusBadge key="status" status="draft" />, "가격비교 갱신 필요"] },
        ]}
      />
    </CompanyContentShell>
  );
}
