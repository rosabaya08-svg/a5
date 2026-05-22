import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/AdminSidebar";
import {
  CompanyDataTable,
  CompanyEmptyState,
  CompanyErrorState,
  CompanyFieldGrid,
  CompanyFilterSearchSort,
  CompanyKpiGrid,
  CompanyMockBanner,
  CompanyPanel,
  CompanyReadOnlyInput,
  CompanyRiskBadge,
  CompanySoftPill,
  CompanyStatusPill,
  CompanyTimeline,
  CompanyWorkQueue,
} from "@/components/company/companyAdminWidgets";
import { CompanyRiskLegend } from "@/components/company/CompanyRisk";
import { CompanyLoadingState } from "@/components/company/CompanyStates";
import { CompanyTableToolbar } from "@/components/company/CompanyTable";
import { CompanyDetailTabs } from "@/components/company/CompanyDetailTabs";
import { CompanyRoutePreviewGrid } from "@/components/company/CompanyRoutePreviewGrid";
import { companyRoutePreviews, companyStatusCompanyId } from "@/data/company/statusMock";
import {
  companyDailySales,
  companyDashboardKpis,
  companyDeliveryEvents,
  companyDetailEvents,
  companyEmptyStates,
  companyErrorStates,
  companyExternalInventoryMappings,
  companyFilterPresets,
  companyInventoryMovements,
  companyAuditLogs,
  companyNotificationSettings,
  companyOrderLines,
  companyOrders,
  companyPayouts,
  companyPickupEvents,
  companyPriceChanges,
  companyProductOptions,
  companyProducts,
  companyProfile,
  companyRefundRequests,
  companyRiskItems,
  companySalesBreakdowns,
  companySettlements,
  companyUserAccessList,
  companyWorkQueue,
} from "@/data/company/mockCompanyAdmin";
import type {
  CompanyInventoryMovement,
  CompanyProduct,
  CompanyProductOption,
} from "@/types/company";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/utils/format";

const companyNav: NavItem[] = [
  { href: "/company/dashboard", label: "대시보드" },
  { href: "/company/status", label: "상태 대시보드" },
  { href: "/company/route-index", label: "Route Index" },
  { href: "/company/smoke-checklist", label: "Smoke Checklist" },
  { href: "/company/products", label: "상품", badge: String(companyProducts.length) },
  { href: "/company/products/new", label: "상품 등록" },
  { href: "/company/products/wizard", label: "등록 Wizard" },
  { href: "/company/products/rejections", label: "반려 사유" },
  { href: "/company/products/price-analysis", label: "가격 분석" },
  { href: "/company/options", label: "옵션 관리" },
  { href: "/company/inventory", label: "옵션/재고" },
  { href: "/company/inventory/adjustments", label: "재고 조정" },
  { href: "/company/inventory/movements", label: "재고 이력" },
  { href: "/company/inventory/external-mapping", label: "외부 매핑" },
  { href: "/company/inventory/external-sync-logs", label: "외부 Sync 로그" },
  { href: "/company/orders", label: "주문" },
  { href: "/company/deliveries", label: "배송/수령" },
  { href: "/company/pickups", label: "현장수령" },
  { href: "/company/sales", label: "매출" },
  { href: "/company/payouts", label: "입금/정산" },
  { href: "/company/refunds", label: "환불 검토", badge: String(companyRefundRequests.length) },
  { href: "/company/users", label: "사용자/권한" },
  { href: "/company/profile", label: "프로필/계좌" },
  { href: "/company/notifications", label: "알림 설정" },
  { href: "/company/audit-logs", label: "감사 로그" },
  { href: "/company/risk-center", label: "Risk Center" },
  { href: "/company/search", label: "통합 검색" },
  { href: "/company/mobile-ops", label: "모바일 운영" },
];

const productMap = new Map(companyProducts.map((product) => [product.id, product]));
const optionMap = new Map(companyProductOptions.map((option) => [option.id, option]));

function CompanyShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <AppShell
      sectionTitle="기업 Admin"
      title={title}
      subtitle={subtitle}
      scopeLabel={`COMPANY_ADMIN / ${companyProfile.id}`}
      navItems={companyNav}
      accent="company"
    >
      <div className="grid gap-6">{children}</div>
    </AppShell>
  );
}

function productOptions(productId: string) {
  return companyProductOptions.filter((option) => option.productId === productId);
}

function productName(productId: string) {
  return productMap.get(productId)?.name ?? productId;
}

function optionName(optionId: string) {
  return optionMap.get(optionId)?.name ?? optionId;
}

function discountPercent(product: CompanyProduct) {
  const discount = ((product.normalPrice - product.closedMallPrice) / product.normalPrice) * 100;
  return formatPercent(Math.round(discount));
}

function stockTone(option: CompanyProductOption) {
  if (option.stock <= 0) return "red";
  if (option.stock < option.safetyStock) return "amber";
  return "green";
}

function externalMappingLabel(status: CompanyProductOption["externalMappingStatus"]) {
  const labels: Record<CompanyProductOption["externalMappingStatus"], string> = {
    mapped_mock: "mock 매핑완료",
    needs_mapping: "매핑 필요",
    blocked_external_api: "외부 API 차단",
  };

  return labels[status];
}

function saleStateLabel(status: NonNullable<CompanyProductOption["saleState"]>) {
  const labels: Record<NonNullable<CompanyProductOption["saleState"]>, string> = {
    on_sale: "판매중",
    out_of_stock: "품절",
    sales_suspended: "판매중지",
  };

  return labels[status];
}

function movementLabel(type: CompanyInventoryMovement["type"]) {
  const labels: Record<CompanyInventoryMovement["type"], string> = {
    initial: "초기재고",
    order_reserved: "주문예약",
    order_reserved_mock: "주문예약 mock",
    order_confirmed_mock: "주문확정 mock",
    manual_adjustment_mock: "수동보정 mock",
    cancel_restore_mock: "취소복구 mock",
    refund_restored: "환불복구",
    external_sync_mock: "외부동기화 mock",
    external_sync_mock_blocked: "외부동기화 차단",
  };

  return labels[type];
}

function deliveryMethodLabel(method: "delivery" | "pickup") {
  return method === "pickup" ? "현장수령" : "택배배송";
}

function productRisk(product: CompanyProduct) {
  if (product.status === "suspended" || product.status === "rejected") return "high";
  if (
    product.stockTotal < 10 ||
    product.status === "pending_approval" ||
    product.status === "needs_reapproval"
  ) return "medium";
  return "low";
}

function productRiskStatus(product: CompanyProduct) {
  if (product.status === "suspended" || product.status === "rejected") return "blocked";
  if (product.status === "pending_approval" || product.status === "needs_reapproval") return "open";
  if (product.stockTotal < 10) return "watching";
  return "resolved_mock";
}

function filterPreset(target: "products" | "orders" | "inventory" | "settlements" | "refunds") {
  return companyFilterPresets.find((preset) => preset.target === target) ?? companyFilterPresets[0];
}

function detailEvents(targetId: string) {
  return companyDetailEvents.filter((event) => event.targetId === targetId);
}

function CompanyScopeFilter() {
  const activeStatusCount = companyProducts.filter((product) => product.status !== "suspended").length;

  return (
    <CompanyPanel
      title="company_id 필터 상태"
      action={<CompanySoftPill tone="green">locked to {companyProfile.id}</CompanySoftPill>}
    >
      <CompanyFieldGrid
        fields={[
          {
            label: "현재 scope",
            value: companyProfile.id,
            helper: "기업 Admin 화면은 단일 company_id 기준 mock 데이터만 표시",
          },
          {
            label: "상품 필터",
            value: `${activeStatusCount}개 노출`,
            helper: "draft, pending_approval, approved, rejected 포함",
          },
          {
            label: "주문 필터",
            value: `${companyOrderLines.length}개 order_items`,
            helper: "orders 총액이 아닌 입점사 상품 라인 기준",
          },
          {
            label: "정산 필터",
            value: companyProfile.settlementAccountMasked,
            helper: "마스킹된 계좌 표시만 제공",
          },
          {
            label: "연동 모드",
            value: "mock/test beta",
            helper: "Firebase, PG, 배송조회, 외부 재고 API 차단",
          },
          {
            label: "기간",
            value: "2026-05 mock",
            helper: "실제 기간 검색은 추후 repository 연결 후 처리",
          },
        ]}
      />
    </CompanyPanel>
  );
}

export function CompanyIndexPage() {
  return <CompanyDashboardPage />;
}

export function CompanyDashboardPage() {
  const pendingProducts = companyProducts.filter(
    (product) => product.status === "pending_approval" || product.status === "needs_reapproval",
  );
  const deliveryWaitLines = companyOrderLines.filter((line) => line.deliveryStatus === "invoice_pending");
  const latestSettlement = companySettlements[0];

  return (
    <CompanyShell
      title="기업 Admin 대시보드"
      subtitle="상품, 승인요청, 주문, 배송, mock 매출, 입금 예정액을 company_id 기준으로 확인합니다."
    >
      <CompanyMockBanner title="실제 연결 차단">
        Firebase, PG, 환불 지급, 정산 지급, Storage 업로드, 외부 재고 API는 연결하지 않고 mock 데이터와
        읽기 전용 화면만 제공합니다.
      </CompanyMockBanner>

      <CompanyScopeFilter />

      <CompanyKpiGrid items={companyDashboardKpis} />

      <CompanyFilterSearchSort
        title="통합 검색 mock"
        query="company_id:company_sanho_luxury_001 status:active month:2026-05"
        sort="risk desc, updatedAt desc"
        chips={["상품", "주문", "정산", "환불"]}
      />

      <CompanyPanel title="공통 위험 배지 legend">
        <CompanyRiskLegend />
      </CompanyPanel>

      <CompanyPanel title="위험 상태 요약">
        <CompanyDataTable
          columns={["위험", "영역", "상태", "담당", "설명"]}
          rows={companyRiskItems.map((risk) => ({
            id: risk.id,
            cells: [
              <div key="risk" className="min-w-48">
                <p className="font-semibold text-slate-950">{risk.title}</p>
                <div className="mt-2">
                  <CompanyRiskBadge severity={risk.severity} status={risk.status} />
                </div>
              </div>,
              risk.surface,
              risk.status,
              risk.owner,
              risk.detail,
            ],
          }))}
        />
      </CompanyPanel>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CompanyPanel
          title="승인 대기 상품"
          action={<Link className="text-sm font-semibold text-emerald-700" href="/company/products">전체 보기</Link>}
        >
          <CompanyDataTable
            columns={["상품", "카테고리", "폐쇄몰가", "요청일", "상태"]}
            rows={pendingProducts.map((product) => ({
              id: product.id,
              cells: [
                <span key="name" className="font-semibold text-slate-950">{product.name}</span>,
                product.category,
                formatCurrency(product.closedMallPrice),
                product.approvalRequestedAt ? formatDateTime(product.approvalRequestedAt) : "-",
                <CompanyStatusPill key="status" status={product.status} />,
              ],
            }))}
          />
        </CompanyPanel>

        <CompanyPanel title="입점사 프로필">
          <CompanyFieldGrid
            fields={[
              { label: "company_id", value: companyProfile.id, helper: "모든 조회의 기본 scope" },
              { label: "담당자", value: companyProfile.managerName, helper: companyProfile.managerEmail },
              {
                label: "수수료율",
                value: formatPercent(companyProfile.commissionRate),
                helper: "order_items 기준 mock 정산",
              },
              {
                label: "정산계좌",
                value: companyProfile.settlementAccountMasked,
                helper: "마스킹 표시만 제공",
              },
              {
                label: "상태",
                value: <CompanySoftPill tone="green">승인완료</CompanySoftPill>,
                helper: "실제 지급/계좌검증 없음",
              },
              {
                label: "반품 정책",
                value: "mock 정책",
                helper: companyProfile.defaultReturnPolicy,
              },
            ]}
          />
        </CompanyPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CompanyPanel title="배송 대기 order_items">
          <CompanyDataTable
            columns={["주문번호", "상품", "수량", "수령방식", "상태"]}
            rows={deliveryWaitLines.map((line) => ({
              id: line.id,
              cells: [
                line.orderNo,
                line.productName,
                line.quantity,
                deliveryMethodLabel(line.deliveryMethod),
                <CompanyStatusPill key="status" status={line.deliveryStatus} />,
              ],
            }))}
          />
        </CompanyPanel>

        <CompanyPanel title="최근 정산 스냅샷">
          <CompanyFieldGrid
            fields={[
              { label: "기간", value: latestSettlement.period },
              {
                label: "상태",
                value: <CompanyStatusPill status={latestSettlement.status} />,
              },
              { label: "총액", value: formatCurrency(latestSettlement.grossAmount) },
              { label: "수수료", value: formatCurrency(latestSettlement.commissionAmount) },
              { label: "환불 보류", value: formatCurrency(latestSettlement.refundHoldAmount) },
              { label: "입금 예정", value: formatCurrency(latestSettlement.payoutAmount) },
            ]}
          />
        </CompanyPanel>
      </div>

      <CompanyPanel title="5일 자동화 작업 큐">
        <CompanyWorkQueue items={companyWorkQueue} />
      </CompanyPanel>

      <CompanyPanel title="로딩 상태 UI">
        <CompanyLoadingState label="dashboard loading mock" />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyProductsPage() {
  return (
    <CompanyShell
      title="상품 관리"
      subtitle="상품명, 옵션, 정상가, 폐쇄몰가, 가격비교, 이미지 placeholder, 승인 상태를 mock으로 관리합니다."
    >
      <CompanyMockBanner title="Storage 업로드 차단">
        실제 이미지/GIF 업로드는 수행하지 않습니다. 상품 이미지는 placeholder 상태와 mock 업로드 상태만
        표시합니다.
      </CompanyMockBanner>

      <CompanyFilterSearchSort
        title="상품 검색 mock"
        query={filterPreset("products").query}
        sort={filterPreset("products").sort}
        chips={[
          `${filterPreset("products").resultCount}건`,
          "draft",
          "pending_approval",
          "approved",
          "rejected",
          "needs_reapproval",
          "배송",
          "현장수령",
        ]}
      />

      <CompanyTableToolbar
        title="페이지네이션 mock"
        query={`total:${companyProducts.length} page:1 pageSize:20`}
        sort="status asc, stockTotal asc"
        chips={["이전 disabled", "1", "2", "다음 mock"]}
      />

      <CompanyPanel title="상품 승인 상태">
        <CompanyDataTable
          columns={["상품", "위험", "상태", "가격비교", "수령", "옵션", "외부코드", "이미지", "상세"]}
          rows={companyProducts.map((product) => {
            const options = productOptions(product.id);

            return {
              id: product.id,
              cells: [
                <div key="product" className="min-w-60">
                  <p className="font-semibold text-slate-950">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.category}</p>
                  {product.rejectionReason ? (
                    <p className="mt-2 text-xs font-semibold text-red-700">{product.rejectionReason}</p>
                  ) : null}
                </div>,
                <CompanyRiskBadge
                  key="risk"
                  severity={productRisk(product)}
                  status={productRiskStatus(product)}
                />,
                <CompanyStatusPill key="status" status={product.status} />,
                <div key="prices" className="grid gap-1 text-xs">
                  <span>정상가 {formatCurrency(product.normalPrice)}</span>
                  <span>최저가 {formatCurrency(product.platformLowestPrice)}</span>
                  <span className="font-semibold text-emerald-700">
                    폐쇄몰가 {formatCurrency(product.closedMallPrice)} ({discountPercent(product)} 할인)
                  </span>
                  <span>{product.priceComparisonStatus ?? "valid_mock"}</span>
                </div>,
                <div key="fulfillment" className="grid gap-1">
                  <CompanySoftPill tone={product.deliveryAvailable ? "green" : "neutral"}>
                    배송 {product.deliveryAvailable ? "가능" : "불가"}
                  </CompanySoftPill>
                  <CompanySoftPill tone={product.pickupAvailable ? "blue" : "neutral"}>
                    현장수령 {product.pickupAvailable ? "가능" : "불가"}
                  </CompanySoftPill>
                </div>,
                options.length > 0 ? options.map((option) => option.name).join(", ") : "옵션 없음",
                product.externalProductCode ?? "미등록",
                <CompanySoftPill key="storage" tone={product.storageState === "mock_uploaded" ? "blue" : "neutral"}>
                  {product.imagePlaceholder}
                </CompanySoftPill>,
                <Link key="detail" href={`/company/products/${product.id}`} className="font-semibold text-emerald-700">
                  상세
                </Link>,
              ],
            };
          })}
        />
      </CompanyPanel>

      <CompanyPanel title="상품 수정/승인요청 mock controls">
        <CompanyDataTable
          columns={["상품", "수정 대상", "현재값", "mock 변경값", "요청 상태", "처리"]}
          rows={companyProducts.slice(0, 4).map((product) => ({
            id: `${product.id}-edit`,
            cells: [
              product.name,
              product.status === "draft" ? "상품 기본정보" : "가격/옵션",
              product.status === "draft"
                ? product.imagePlaceholder
                : `${formatCurrency(product.normalPrice)} / ${formatCurrency(product.closedMallPrice)}`,
              product.status === "draft"
                ? "placeholder 유지"
                : `${formatCurrency(product.normalPrice)} -> ${formatCurrency(product.closedMallPrice)}`,
              <CompanyStatusPill key="status" status={product.status} />,
              <button
                key="button"
                type="button"
                disabled
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500"
              >
                승인요청 mock
              </button>,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="승인 요청 흐름">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {["draft", "pending_approval", "approved", "rejected", "needs_reapproval"].map((status) => (
            <div key={status} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <CompanyStatusPill
                status={status as "draft" | "pending_approval" | "approved" | "rejected" | "needs_reapproval"}
              />
              <p className="mt-3 text-sm leading-6 text-slate-600">
                실제 저장 없이 상품 상태 전환 UI만 표시합니다. 운영자 승인/반려는 관리자 트랙에서 처리될
                mock 계약입니다.
              </p>
            </div>
          ))}
        </div>
      </CompanyPanel>

      <CompanyPanel title="가격 변경 재승인 안내">
        <CompanyDataTable
          columns={["상품", "변경 전", "변경 후", "상태", "안내"]}
          rows={companyProducts
            .filter((product) => product.status === "needs_reapproval")
            .map((product) => ({
              id: `${product.id}-reapproval`,
              cells: [
                product.name,
                formatCurrency(product.platformLowestPrice),
                formatCurrency(product.closedMallPrice),
                <CompanyStatusPill key="status" status={product.status} />,
                product.reapprovalReason ?? "가격 변경으로 재승인 필요",
              ],
            }))}
          emptyLabel="재승인이 필요한 가격 변경 상품이 없습니다."
        />
      </CompanyPanel>

      <CompanyPanel title="빈 상태 UI">
        <div className="grid gap-4 md:grid-cols-2">
          {companyEmptyStates
            .filter((state) => state.id !== "empty-paid-out-live")
            .map((state) => (
              <CompanyEmptyState
                key={state.id}
                title={state.title}
                description={state.description}
                recovery={state.recovery}
              />
            ))}
        </div>
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyProductNewPage() {
  return (
    <CompanyShell
      title="상품 등록 mock"
      subtitle="실제 Storage와 Server Action 없이 상품 등록/수정/승인요청 입력 구조만 제공합니다."
    >
      <CompanyMockBanner title="저장 동작 없음">
        이 화면은 베타 테스트용 읽기 전용 폼입니다. 등록 버튼은 실제 상품 저장, 이미지 업로드, 승인 요청을
        실행하지 않습니다.
      </CompanyMockBanner>

      <CompanyPanel title="상품 기본 정보">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CompanyReadOnlyInput label="상품명" value="저자극 바디 크림 세트" />
          <CompanyReadOnlyInput label="브랜드" value="Pure Mom" />
          <CompanyReadOnlyInput label="카테고리" value="스킨케어" />
          <CompanyReadOnlyInput label="정상가" value="62,000원" />
          <CompanyReadOnlyInput label="폐쇄몰가" value="48,500원" helper="가격비교 표시값 기준" />
          <CompanyReadOnlyInput label="플랫폼 최저가" value="53,000원" />
          <CompanyReadOnlyInput label="가격비교 상태" value="blocked_external_check" helper="외부 가격조회 API 미연결" />
          <CompanyReadOnlyInput label="상품 설명" value="민감 피부용 바디 크림 mock 설명" />
          <CompanyReadOnlyInput label="외부 명품몰 상품코드" value="연결 전 mock" helper="외부 API 호출 금지" />
          <CompanyReadOnlyInput label="대표 이미지/GIF" value="Storage 미연결 placeholder" />
          <CompanyReadOnlyInput label="승인요청 상태" value="draft -> pending_approval" />
          <CompanyReadOnlyInput label="배송/수령 방식" value="택배배송, 현장수령 모두 노출" />
          <CompanyReadOnlyInput label="환불 안내" value="화장품류 환불 정책 확인 필요" />
        </div>
      </CompanyPanel>

      <CompanyPanel title="옵션 입력 mock">
        <CompanyDataTable
          columns={["옵션명", "SKU", "재고", "안전재고", "가격추가", "외부 매핑"]}
          rows={[
            {
              id: "new-option-1",
              cells: ["150ml", "CREAM-150", "12", "5", formatCurrency(0), "매핑 필요"],
            },
            {
              id: "new-option-2",
              cells: ["150ml 2개 세트", "CREAM-150-2P", "7", "5", formatCurrency(8500), "외부 API 차단"],
            },
          ]}
        />
      </CompanyPanel>

      <CompanyPanel title="승인 요청 체크리스트">
        <CompanyFieldGrid
          fields={[
            { label: "필수값", value: "상품명/가격/옵션", helper: "누락 시 BLOCKERS 기록 대상" },
            { label: "이미지", value: "placeholder", helper: "Storage 업로드 금지" },
            { label: "승인 상태", value: "pending_approval", helper: "실제 운영 승인 아님" },
            { label: "가격비교", value: "정상가/최저가/폐쇄몰가", helper: "표시값만 mock" },
            { label: "외부 재고", value: "adapter 예정", helper: "실제 외부 호출 금지" },
            { label: "감사로그", value: "문서화 예정", helper: "서버 기록은 firebase-contract 트랙" },
          ]}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyProductWizardPage() {
  const steps = [
    ["1", "기본정보", "상품명, 브랜드, 카테고리, 상품 설명"],
    ["2", "가격/가격비교", "정상가, 폐쇄몰가, 표시 최저가, 할인 비교"],
    ["3", "옵션/재고", "옵션명, 옵션가, 재고, 안전재고"],
    ["4", "배송/현장수령", "택배배송, 현장수령, 환불 안내"],
    ["5", "이미지 placeholder", "Storage 없이 대표 이미지/GIF 자리만 표시"],
    ["6", "승인요청 확인", "draft에서 pending_approval 또는 needs_reapproval로 전환 mock"],
  ];

  return (
    <CompanyShell
      title="상품 등록 wizard"
      subtitle="상품 등록을 6단계 wizard mock으로 나누어 보여줍니다. 실제 저장과 Storage 업로드는 수행하지 않습니다."
    >
      <CompanyMockBanner title="Wizard action disabled">
        단계 이동, 임시저장, 승인요청 버튼은 mock입니다. 서버 액션, Storage, Firebase repository는 호출하지 않습니다.
      </CompanyMockBanner>

      <div className="grid gap-4 lg:grid-cols-3">
        {steps.map(([step, title, detail]) => (
          <section key={step} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                {step}
              </span>
              <h3 className="text-sm font-bold text-slate-950">{title}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
          </section>
        ))}
      </div>

      <CompanyPanel title="Wizard preview values">
        <CompanyFieldGrid
          fields={[
            { label: "상품명", value: "Generated Wizard Product" },
            { label: "브랜드", value: "Mock Brand Wizard" },
            { label: "가격비교", value: "정상가 72,000 / 폐쇄몰가 59,000" },
            { label: "옵션", value: "Basic, Plus" },
            { label: "이미지", value: "placeholder only" },
            { label: "승인요청", value: "pending_approval mock" },
          ]}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyProductRejectionsPage() {
  const rejected = companyProducts.filter(
    (product) => product.status === "rejected" || product.status === "suspended",
  );

  return (
    <CompanyShell
      title="상품 반려 사유"
      subtitle="반려/판매중지 상품의 사유와 재승인 필요 항목을 mock으로 확인합니다."
    >
      <CompanyPanel title="반려 사유 목록">
        <CompanyDataTable
          columns={["상품", "상태", "브랜드", "사유", "재승인 안내"]}
          rows={rejected.map((product) => ({
            id: product.id,
            cells: [
              product.name,
              <CompanyStatusPill key="status" status={product.status} />,
              product.brand ?? "-",
              product.rejectionReason ?? "반려 사유 mock 없음",
              product.reapprovalReason ?? "문구/가격/이미지 수정 후 재요청",
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyPriceAnalysisPage() {
  return (
    <CompanyShell
      title="가격비교/AI분석 mock"
      subtitle="실제 AI 분석 없이 등록금액 대비 할인 비교 레이어만 표시합니다."
    >
      <CompanyMockBanner title="AI 호출 없음">
        이 화면의 분석 결과는 단순 가격 비교 mock입니다. AI API, 외부 가격조회, 크롤링은 실행하지 않습니다.
      </CompanyMockBanner>

      <CompanyPanel title="가격 비교 레이어">
        <CompanyDataTable
          columns={["상품", "정상가", "플랫폼 최저가", "폐쇄몰가", "할인", "분석상태"]}
          rows={companyProducts.slice(0, 20).map((product) => ({
            id: product.id,
            cells: [
              product.name,
              formatCurrency(product.normalPrice),
              formatCurrency(product.platformLowestPrice),
              formatCurrency(product.closedMallPrice),
              discountPercent(product),
              <CompanySoftPill
                key="status"
                tone={product.priceComparisonStatus === "valid_mock" ? "green" : "amber"}
              >
                {product.priceComparisonStatus ?? "valid_mock"}
              </CompanySoftPill>,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="가격 변경 이력">
        <CompanyDataTable
          columns={["상품", "변경 전", "변경 후", "상태", "요청일", "사유"]}
          rows={companyPriceChanges.map((change) => ({
            id: change.id,
            cells: [
              productName(change.productId),
              formatCurrency(change.beforePrice),
              formatCurrency(change.afterPrice),
              change.status,
              formatDateTime(change.requestedAt),
              change.reason,
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyOptionsPage() {
  return (
    <CompanyShell
      title="옵션 관리"
      subtitle="옵션명, 옵션가, 재고, 안전재고, 품절상태, 판매중지 상태를 별도 화면으로 관리합니다."
    >
      <CompanyPanel title="product_options">
        <CompanyDataTable
          columns={["상품", "옵션", "SKU", "옵션가", "재고", "안전재고", "판매상태", "상세"]}
          rows={companyProductOptions.map((option) => ({
            id: option.id,
            cells: [
              productName(option.productId),
              option.name,
              option.sku,
              formatCurrency(option.priceDelta),
              option.stock,
              option.safetyStock,
              saleStateLabel(option.saleState ?? "on_sale"),
              <Link key="detail" href={`/company/inventory/options/${option.id}`} className="font-semibold text-emerald-700">
                상세
              </Link>,
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyInventoryPage() {
  return (
    <CompanyShell
      title="옵션/재고 관리"
      subtitle="옵션별 재고, inventory_movements, 외부 명품몰 재고 코드 매핑 상태를 mock으로 표시합니다."
    >
      <CompanyMockBanner title="외부 재고 API 차단">
        외부 명품몰 재고 조회/동기화는 실제 호출하지 않고 매핑 상태와 차단 사유만 화면에 표시합니다.
      </CompanyMockBanner>

      <CompanyFilterSearchSort
        title="재고 검색 mock"
        query={filterPreset("inventory").query}
        sort={filterPreset("inventory").sort}
        chips={[`${filterPreset("inventory").resultCount}건`, "안전재고", "외부코드", "mock"]}
      />

      <CompanyErrorState
        title={companyErrorStates[0].title}
        description={companyErrorStates[0].description}
        blockedBy={companyErrorStates[0].blockedBy}
      />

      <CompanyPanel title="옵션별 재고">
        <CompanyDataTable
          columns={["상품", "옵션", "SKU", "옵션가", "재고", "안전재고", "품절/판매상태", "외부 코드", "매핑 상태"]}
          rows={companyProductOptions.map((option) => ({
            id: option.id,
            cells: [
              productName(option.productId),
              option.name,
              option.sku,
              formatCurrency(option.priceDelta),
              <CompanySoftPill key="stock" tone={stockTone(option)}>
                {option.stock}개
              </CompanySoftPill>,
              `${option.safetyStock}개`,
              <CompanySoftPill
                key="sale"
                tone={option.saleState === "on_sale" ? "green" : option.saleState === "out_of_stock" ? "amber" : "red"}
              >
                {saleStateLabel(option.saleState ?? "on_sale")}
              </CompanySoftPill>,
              option.externalSkuCode ?? "미등록",
              <CompanySoftPill
                key="mapping"
                tone={option.externalMappingStatus === "mapped_mock" ? "green" : "amber"}
              >
                {externalMappingLabel(option.externalMappingStatus)}
              </CompanySoftPill>,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="inventory_movements mock">
        <CompanyDataTable
          columns={["일시", "상품", "옵션", "유형", "수량", "메모"]}
          rows={companyInventoryMovements.map((movement) => ({
            id: movement.id,
            cells: [
              formatDateTime(movement.createdAt),
              productName(movement.productId),
              optionName(movement.optionId),
              movementLabel(movement.type),
              movement.quantity > 0 ? `+${movement.quantity}` : String(movement.quantity),
              movement.memo,
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyInventoryMovementsPage() {
  return (
    <CompanyShell
      title="재고 이력"
      subtitle="manual_adjustment_mock, order_reserved_mock, order_confirmed_mock, cancel_restore_mock, external_sync_mock_blocked 이력을 표시합니다."
    >
      <CompanyMockBanner title="재고 변경 실행 없음">
        이 화면은 inventory_movements mock 이력만 표시합니다. 실제 재고 차감, 복구, 외부 동기화는 실행하지
        않습니다.
      </CompanyMockBanner>

      <CompanyFilterSearchSort
        title="재고 이력 검색 mock"
        query="company_id:company_sanho_luxury_001 movement_type:any"
        sort="createdAt desc"
        chips={["manual_adjustment_mock", "order_reserved_mock", "external_sync_mock_blocked"]}
      />

      <CompanyPanel title="inventory_movements">
        <CompanyDataTable
          columns={["일시", "상품", "옵션", "유형", "수량", "메모"]}
          rows={companyInventoryMovements.map((movement) => ({
            id: movement.id,
            cells: [
              formatDateTime(movement.createdAt),
              productName(movement.productId),
              optionName(movement.optionId),
              movementLabel(movement.type),
              movement.quantity > 0 ? `+${movement.quantity}` : String(movement.quantity),
              movement.memo,
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyInventoryAdjustmentsPage() {
  const manualMovements = companyInventoryMovements.filter(
    (movement) => movement.type === "manual_adjustment_mock",
  );

  return (
    <CompanyShell
      title="재고 조정 mock"
      subtitle="manual_adjustment_mock 상태만 표시하며 실제 재고 API 호출은 하지 않습니다."
    >
      <CompanyMockBanner title="실제 재고 변경 없음">
        조정 사유, 조정 수량, 승인자 필드만 read-only mock입니다. Firestore, 외부 재고 API, 재고 차감 함수를 호출하지 않습니다.
      </CompanyMockBanner>

      <CompanyPanel title="수동 조정 입력 mock">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CompanyReadOnlyInput label="상품/옵션" value="Generated Company Product / Basic" />
          <CompanyReadOnlyInput label="조정 수량" value="+2" />
          <CompanyReadOnlyInput label="사유" value="manual_adjustment_mock" />
          <CompanyReadOnlyInput label="승인자" value="COMPANY_ADMIN mock" />
        </div>
      </CompanyPanel>

      <CompanyPanel title="manual_adjustment_mock history">
        <CompanyDataTable
          columns={["일시", "상품", "옵션", "수량", "메모"]}
          rows={manualMovements.map((movement) => ({
            id: movement.id,
            cells: [
              formatDateTime(movement.createdAt),
              productName(movement.productId),
              optionName(movement.optionId),
              movement.quantity,
              movement.memo,
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyExternalMappingPage() {
  return (
    <CompanyShell
      title="외부 재고 코드 매핑"
      subtitle="external_product_id, external_sku, last_sync_status, blocked_reason을 mock으로 표시합니다."
    >
      <CompanyMockBanner title="외부 API 호출 금지">
        외부 명품몰 재고 API는 호출하지 않습니다. 마지막 동기화 상태와 차단 사유만 확인합니다.
      </CompanyMockBanner>

      <CompanyPanel title="external inventory mapping mock">
        <CompanyDataTable
          columns={["상품", "옵션", "external_product_id", "external_sku", "last_sync_status", "last_sync_at", "blocked_reason"]}
          rows={companyExternalInventoryMappings.map((mapping) => ({
            id: mapping.id,
            cells: [
              productName(mapping.productId),
              optionName(mapping.optionId),
              mapping.externalProductId,
              mapping.externalSku,
              <CompanySoftPill
                key="status"
                tone={mapping.lastSyncStatus === "mapped_mock" ? "green" : "amber"}
              >
                {mapping.lastSyncStatus}
              </CompanySoftPill>,
              mapping.lastSyncAt ? formatDateTime(mapping.lastSyncAt) : "-",
              mapping.blockedReason,
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyExternalSyncLogsPage() {
  const blocked = companyExternalInventoryMappings.filter(
    (mapping) => mapping.lastSyncStatus === "external_sync_mock_blocked",
  );

  return (
    <CompanyShell
      title="외부 재고 동기화 로그"
      subtitle="외부 재고 동기화 시도와 차단 사유를 mock 로그로 표시합니다. 실제 API 호출은 없습니다."
    >
      <CompanyErrorState
        title="External inventory sync disabled"
        description="외부 명품몰 재고 동기화는 mock 로그만 표시하며 HTTP 요청을 만들지 않습니다."
        blockedBy="external inventory API contract"
      />

      <CompanyPanel title="external_sync_mock_blocked logs">
        <CompanyDataTable
          columns={["상품", "옵션", "external_product_id", "external_sku", "상태", "차단사유", "일시"]}
          rows={blocked.map((mapping) => ({
            id: mapping.id,
            cells: [
              productName(mapping.productId),
              optionName(mapping.optionId),
              mapping.externalProductId,
              mapping.externalSku,
              mapping.lastSyncStatus,
              mapping.blockedReason,
              mapping.lastSyncAt ? formatDateTime(mapping.lastSyncAt) : "-",
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyOrdersPage() {
  return (
    <CompanyShell
      title="주문 관리"
      subtitle="기업별 order_items 기준으로 주문 라인, 상품 snapshot, 배송/현장수령 상태를 확인합니다."
    >
      <CompanyFilterSearchSort
        title="주문 검색 mock"
        query={filterPreset("orders").query}
        sort={filterPreset("orders").sort}
        chips={[`${filterPreset("orders").resultCount}건`, "invoice_pending", "shipping"]}
      />

      <CompanyPanel title="주문 목록">
        <CompanyDataTable
          columns={["주문번호", "고객", "조리원/객실", "수령방식", "상태", "주문금액", "주문일", "상세"]}
          rows={companyOrders.map((order) => ({
            id: order.id,
            cells: [
              <Link key="order" href={`/company/orders/${order.orderNo}`} className="font-semibold text-emerald-700">
                {order.orderNo}
              </Link>,
              `${order.customerNameMasked} / ${order.customerPhoneMasked}`,
              `${order.nurseryName} ${order.roomName}`,
              deliveryMethodLabel(order.deliveryMethod),
              <CompanyStatusPill key="status" status={order.status} />,
              formatCurrency(order.totalAmount),
              formatDateTime(order.orderedAt),
              <Link key="detail" href={`/company/orders/${order.orderNo}`} className="font-semibold text-emerald-700">
                상세
              </Link>,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="order_items 정산 기준">
        <CompanyDataTable
          columns={["라인ID", "주문번호", "상품 snapshot", "수량", "단가", "정산예정", "상태"]}
          rows={companyOrderLines.map((line) => ({
            id: line.id,
            cells: [
              line.id,
              line.orderNo,
              `${line.productName} / ${line.optionName}`,
              line.quantity,
              formatCurrency(line.unitPrice),
              formatCurrency(line.settlementAmount),
              <CompanyStatusPill key="status" status={line.deliveryStatus} />,
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyDeliveriesPage() {
  const pickupLines = companyOrderLines.filter((line) => line.deliveryMethod === "pickup");
  const deliveryLines = companyOrderLines.filter((line) => line.deliveryMethod === "delivery");

  return (
    <CompanyShell
      title="배송/현장수령 처리"
      subtitle="송장번호 입력과 현장수령 처리를 실제 API 없이 mock 상태로만 표시합니다."
    >
      <CompanyMockBanner title="배송조회 API 차단">
        송장번호 저장, 배송조회, 알림톡 발송은 수행하지 않습니다. 필요한 실제 연동 항목은 BLOCKERS에
        기록했습니다.
      </CompanyMockBanner>

      <CompanyErrorState
        title={companyErrorStates[1].title}
        description={companyErrorStates[1].description}
        blockedBy={companyErrorStates[1].blockedBy}
      />

      <CompanyPanel title="택배배송 송장 입력 mock">
        <CompanyDataTable
          columns={["주문번호", "상품", "현재상태", "송장번호", "처리"]}
          rows={deliveryLines.map((line) => ({
            id: line.id,
            cells: [
              line.orderNo,
              `${line.productName} / ${line.optionName}`,
              <CompanyStatusPill key="status" status={line.deliveryStatus} />,
              line.invoiceNo ?? "read-only mock input",
              <button
                key="button"
                type="button"
                disabled
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500"
              >
                송장 저장 mock
              </button>,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="현장수령 처리 mock">
        <CompanyDataTable
          columns={["주문번호", "상품", "픽업코드", "상태", "처리"]}
          rows={pickupLines.map((line) => ({
            id: line.id,
            cells: [
              line.orderNo,
              `${line.productName} / ${line.optionName}`,
              line.pickupCode ?? "-",
              <CompanyStatusPill key="status" status={line.deliveryStatus} />,
              <button
                key="button"
                type="button"
                disabled
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500"
              >
                수령완료 mock
              </button>,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="delivery_events mock">
        <CompanyDataTable
          columns={["일시", "주문번호", "택배사", "송장", "상태", "메모"]}
          rows={companyDeliveryEvents.map((event) => ({
            id: event.id,
            cells: [
              formatDateTime(event.occurredAt),
              event.orderNo,
              event.courierName,
              event.invoiceNo,
              <CompanySoftPill key="status" tone={event.status === "tracking_blocked" ? "red" : "blue"}>
                {event.status}
              </CompanySoftPill>,
              event.memo,
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyPickupsPage() {
  return (
    <CompanyShell
      title="현장수령 처리"
      subtitle="pickup_events mock으로 조리원명, 객실, 주문자, 상품, 수령대기/수령완료 상태를 표시합니다."
    >
      <CompanyMockBanner title="현장수령 실제 처리 없음">
        수령완료 버튼은 mock 상태 표시만 제공합니다. 실제 고객 알림, 주문 상태 변경, 재고 확정은 실행하지
        않습니다.
      </CompanyMockBanner>

      <CompanyFilterSearchSort
        title="현장수령 검색 mock"
        query="pickup_status:waiting nursery_id:any"
        sort="orderNo asc"
        chips={["수령대기", "수령완료", "객실", "주문자"]}
      />

      <CompanyPanel title="pickup_events">
        <CompanyDataTable
          columns={["주문번호", "조리원", "객실", "주문자", "상품", "상태", "처리자", "처리일"]}
          rows={companyPickupEvents.map((event) => ({
            id: event.id,
            cells: [
              event.orderNo,
              event.nurseryName,
              event.roomName,
              event.customerNameMasked,
              event.productName,
              <CompanySoftPill key="status" tone={event.status === "waiting" ? "blue" : "green"}>
                {event.status}
              </CompanySoftPill>,
              event.handledBy,
              event.handledAt ? formatDateTime(event.handledAt) : "-",
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyPickupDetailPage({ pickupId }: { pickupId: string }) {
  const pickup = companyPickupEvents.find((event) => event.id === pickupId) ?? companyPickupEvents[0];

  return (
    <CompanyShell
      title="현장수령 상세"
      subtitle="객실, 태블릿, 주문자 mock, 상품, 수령상태, 처리시간을 확인합니다."
    >
      <CompanyPanel title="pickup_event detail">
        <CompanyFieldGrid
          fields={[
            { label: "pickup_event_id", value: pickup.id },
            { label: "주문번호", value: pickup.orderNo },
            { label: "조리원", value: pickup.nurseryName },
            { label: "객실", value: pickup.roomName },
            { label: "태블릿", value: "tablet mock linked by room" },
            { label: "주문자", value: pickup.customerNameMasked },
            { label: "상품", value: pickup.productName },
            { label: "수령상태", value: pickup.status },
            { label: "처리시간", value: pickup.handledAt ? formatDateTime(pickup.handledAt) : "미처리" },
          ]}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanySalesPage() {
  return (
    <CompanyShell
      title="매출 현황"
      subtitle="orders 총액이 아니라 입점사 order_items 기준으로 매출과 입금 예정액을 표시합니다."
    >
      <CompanyKpiGrid
        items={[
          companyDashboardKpis[5],
          companyDashboardKpis[6],
          {
            label: "환불 보류",
            value: formatCurrency(companySettlements[0].refundHoldAmount),
            helper: "환불요청 라인 제외 전 검토",
            tone: "amber",
          },
          {
            label: "수수료율",
            value: formatPercent(companyProfile.commissionRate),
            helper: "입점사 계약 mock",
            tone: "neutral",
          },
        ]}
      />

      <CompanyPanel title="일별 mock 매출">
        <CompanyDataTable
          columns={["일자", "주문 수", "매출", "입금예정", "비고"]}
          rows={companyDailySales.map((day) => ({
            id: day.date,
            cells: [
              day.date,
              `${day.orderCount}건`,
              formatCurrency(day.grossAmount),
              formatCurrency(day.payoutEstimate),
              "실제 PG 매출 아님",
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="매출 breakdown mock chart/table">
        <CompanyDataTable
          columns={["그룹", "라벨", "주문 수", "매출", "입금예정", "막대"]}
          rows={companySalesBreakdowns.map((row) => ({
            id: row.id,
            cells: [
              row.group,
              row.label,
              `${row.orderCount}건`,
              formatCurrency(row.grossAmount),
              formatCurrency(row.payoutEstimate),
              <div key="bar" className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(12, Math.min(100, row.grossAmount / 2500))}%` }}
                />
              </div>,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="정산 산식 안내">
        <CompanyFieldGrid
          fields={[
            { label: "매출 기준", value: "order_items", helper: "입점사 상품 라인만 집계" },
            { label: "상품 snapshot", value: "주문 시점명/옵션/단가", helper: "상품 수정 후에도 주문 기준 유지" },
            { label: "수수료", value: `${formatPercent(companyProfile.commissionRate)} mock`, helper: "계약 확정 전 표시값" },
            { label: "환불 보류", value: "refundHoldAmount", helper: "검토 완료 전 입금 예정액에서 제외" },
            { label: "입금 지급", value: "차단", helper: "실제 계좌이체/정산 지급 없음" },
            { label: "감사 로그", value: "firebase-contract 대상", helper: "서버 기록은 별도 트랙" },
          ]}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyPayoutsPage() {
  return (
    <CompanyShell
      title="입금/정산"
      subtitle="정산 대기, 확정, 입금완료 상태를 mock으로 표시하고 실제 지급은 차단합니다."
    >
      <CompanyMockBanner title="실제 지급 차단">
        계좌 검증, 정산 확정, 입금 실행은 수행하지 않습니다. 마스킹된 계좌와 입금 예정 상태만 제공합니다.
      </CompanyMockBanner>

      <CompanyFilterSearchSort
        title="정산 검색 mock"
        query="company_id:company_sanho_luxury_001 period:2026-05"
        sort="scheduledPayoutDate desc"
        chips={["review", "confirmed_mock", "payout_scheduled_mock", "paid_mock"]}
      />

      <CompanyPanel title="정산 계좌">
        <CompanyFieldGrid
          fields={[
            { label: "입점사", value: companyProfile.name },
            { label: "계좌", value: companyProfile.settlementAccountMasked, helper: "마스킹 표시" },
            { label: "수수료율", value: formatPercent(companyProfile.commissionRate) },
            { label: "지급 권한", value: "blocked", helper: "운영 배포 전까지 지급 불가" },
          ]}
        />
      </CompanyPanel>

      <CompanyPanel title="정산 내역">
        <CompanyDataTable
          columns={["기간", "상태", "총액", "수수료", "환불 보류", "입금 예정", "예정일"]}
          rows={companySettlements.map((settlement) => ({
            id: settlement.id,
            cells: [
              settlement.period,
              <CompanyStatusPill key="status" status={settlement.status} />,
              formatCurrency(settlement.grossAmount),
              formatCurrency(settlement.commissionAmount),
              formatCurrency(settlement.refundHoldAmount),
              formatCurrency(settlement.payoutAmount),
              settlement.scheduledPayoutDate ?? "-",
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="payouts mock">
        <CompanyDataTable
          columns={["payout_id", "정산ID", "상태", "금액", "계좌", "예정", "차단 사유"]}
          rows={companyPayouts.map((payout) => ({
            id: payout.id,
            cells: [
              payout.id,
              payout.settlementId,
              <CompanySoftPill
                key="status"
                tone={payout.status === "blocked_real_payout" ? "red" : payout.status === "paid_mock" ? "green" : "blue"}
              >
                {payout.status}
              </CompanySoftPill>,
              formatCurrency(payout.amount),
              payout.bankAccountMasked,
              payout.scheduledAt,
              payout.blockedReason ?? "mock 표시",
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="운영 입금 빈 상태">
        <CompanyEmptyState
          title={companyEmptyStates[2].title}
          description={companyEmptyStates[2].description}
          recovery={companyEmptyStates[2].recovery}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanySettlementDetailPage({ settlementId }: { settlementId: string }) {
  const settlement =
    companySettlements.find((item) => item.id === settlementId) ?? companySettlements[0];

  return (
    <CompanyShell
      title="정산 상세"
      subtitle="order_items 기준 company_id별 정산 구조를 강조하는 mock 상세 화면입니다."
    >
      <CompanyMockBanner title="실제 정산 지급 차단">
        정산 확정과 입금 실행은 mock 상태만 표시합니다. 실제 payout, 계좌이체, 세금계산서 연동은 없습니다.
      </CompanyMockBanner>

      <CompanyPanel title="정산 기본 정보">
        <CompanyFieldGrid
          fields={[
            { label: "settlement_id", value: settlement.id },
            { label: "company_id", value: companyProfile.id },
            { label: "기간", value: settlement.period },
            { label: "상태", value: <CompanyStatusPill status={settlement.status} /> },
            { label: "총액", value: formatCurrency(settlement.grossAmount) },
            { label: "수수료", value: formatCurrency(settlement.commissionAmount) },
            { label: "환불 보류", value: formatCurrency(settlement.refundHoldAmount) },
            { label: "입금 예정", value: formatCurrency(settlement.payoutAmount) },
            { label: "예정일", value: settlement.scheduledPayoutDate ?? "-" },
          ]}
        />
      </CompanyPanel>

      <CompanyPanel title="order_items settlement lines">
        <CompanyDataTable
          columns={["order_id", "order_item_id", "주문번호", "상품", "수량", "정산예정"]}
          rows={companyOrderLines.slice(0, 30).map((line) => ({
            id: `${settlement.id}-${line.id}`,
            cells: [
              line.orderId,
              line.id,
              line.orderNo,
              line.productName,
              line.quantity,
              formatCurrency(line.settlementAmount),
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyProductDetailPage({ productId }: { productId: string }) {
  const product = productMap.get(productId) ?? companyProducts[0];
  const options = productOptions(product.id);
  const relatedLines = companyOrderLines.filter((line) => line.productId === product.id);
  const events = detailEvents(product.id);

  return (
    <CompanyShell
      title="상품 상세 mock"
      subtitle={`${product.name} 상품의 가격, 옵션, 재고, 위험 상태, 승인 흐름을 읽기 전용으로 확인합니다.`}
    >
      <CompanyMockBanner title="상세 저장 차단">
        이 상세 화면은 mock/test beta 확인용입니다. 상품 수정, 이미지 업로드, 승인요청, 판매중지 해제는 실행하지
        않습니다.
      </CompanyMockBanner>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <CompanyPanel
          title="상품 기본 정보"
          action={<CompanyRiskBadge severity={productRisk(product)} status={productRiskStatus(product)} />}
        >
          <CompanyFieldGrid
            fields={[
              { label: "product_id", value: product.id },
              { label: "company_id", value: product.companyId },
              { label: "상품명", value: product.name },
              { label: "카테고리", value: product.category },
              { label: "상태", value: <CompanyStatusPill status={product.status} /> },
              { label: "이미지", value: product.imagePlaceholder, helper: "Storage 연결 없음" },
              { label: "정상가", value: formatCurrency(product.normalPrice) },
              { label: "폐쇄몰가", value: formatCurrency(product.closedMallPrice) },
              { label: "가격비교", value: formatCurrency(product.platformLowestPrice), helper: "표시값 mock" },
            ]}
          />
        </CompanyPanel>

        <CompanyPanel title="승인/위험 메모">
          {product.rejectionReason ? (
            <CompanyErrorState
              title="상품 검수 위험"
              description={product.rejectionReason}
              blockedBy="admin approval and compliance wording review"
            />
          ) : (
            <CompanyEmptyState
              title="활성 차단 메모가 없습니다"
              description="현재 상품은 mock 상세에서 판매 가능 상태로 표시됩니다."
              recovery="실제 판매 가능 여부는 관리자 승인과 Firebase rules 확정 후 다시 검증합니다."
            />
          )}
        </CompanyPanel>
      </div>

      <CompanyPanel title="옵션 상세">
        <CompanyDataTable
          columns={["옵션", "SKU", "재고", "안전재고", "가격추가", "외부코드", "매핑"]}
          rows={options.map((option) => ({
            id: option.id,
            cells: [
              option.name,
              option.sku,
              <CompanySoftPill key="stock" tone={stockTone(option)}>
                {option.stock}개
              </CompanySoftPill>,
              `${option.safetyStock}개`,
              formatCurrency(option.priceDelta),
              option.externalSkuCode ?? "미등록",
              externalMappingLabel(option.externalMappingStatus),
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="상세 탭 mock">
        <CompanyDetailTabs
          tabs={[
            { id: "info", label: "상품 정보", status: "ready", content: product.description ?? "상품 설명 mock" },
            { id: "options", label: "옵션", content: `${options.length}개 옵션` },
            { id: "stock", label: "재고", content: `${product.stockTotal}개 / 안전재고는 옵션 기준` },
            { id: "orders", label: "주문 이력", content: `${relatedLines.length}개 order_items` },
            { id: "approval", label: "승인 이력", content: product.reapprovalReason ?? "승인 이력 mock" },
            {
              id: "price",
              label: "가격 변경 이력",
              status: product.status === "needs_reapproval" ? "blocked" : "mock",
              content: `${companyPriceChanges.filter((change) => change.productId === product.id).length}건`,
            },
          ]}
        />
      </CompanyPanel>

      <CompanyPanel title="가격 변경 이력">
        <CompanyDataTable
          columns={["변경 전", "변경 후", "상태", "요청일", "사유"]}
          rows={companyPriceChanges
            .filter((change) => change.productId === product.id)
            .map((change) => ({
              id: change.id,
              cells: [
                formatCurrency(change.beforePrice),
                formatCurrency(change.afterPrice),
                change.status,
                formatDateTime(change.requestedAt),
                change.reason,
              ],
            }))}
          emptyLabel="이 상품의 가격 변경 이력이 없습니다."
        />
      </CompanyPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <CompanyPanel title="관련 주문 라인">
          <CompanyDataTable
            columns={["주문번호", "옵션", "수량", "단가", "정산예정", "상태"]}
            rows={relatedLines.map((line) => ({
              id: line.id,
              cells: [
                <Link key="order" href={`/company/orders/${line.orderNo}`} className="font-semibold text-emerald-700">
                  {line.orderNo}
                </Link>,
                line.optionName,
                line.quantity,
                formatCurrency(line.unitPrice),
                formatCurrency(line.settlementAmount),
                <CompanyStatusPill key="status" status={line.deliveryStatus} />,
              ],
            }))}
            emptyLabel="이 상품과 연결된 mock 주문 라인이 없습니다."
          />
        </CompanyPanel>

        <CompanyPanel title="상세 타임라인">
          {events.length > 0 ? (
            <CompanyTimeline events={events} />
          ) : (
            <CompanyEmptyState
              title="상세 이벤트가 없습니다"
              description="아직 승인, 재고, 주문 이벤트가 기록되지 않은 mock 상품입니다."
              recovery="실제 audit log 연결은 Firebase contract 이후 진행합니다."
            />
          )}
        </CompanyPanel>
      </div>
    </CompanyShell>
  );
}

export function CompanyOrderDetailPage({ orderNo }: { orderNo: string }) {
  const order = companyOrders.find((item) => item.orderNo === orderNo) ?? companyOrders[0];
  const lines = companyOrderLines.filter((line) => line.orderId === order.id);
  const events = detailEvents(order.id);

  return (
    <CompanyShell
      title="주문 상세 mock"
      subtitle={`${order.orderNo} 주문의 order_items, 배송/현장수령, 정산, 환불 위험 상태를 읽기 전용으로 확인합니다.`}
    >
      <CompanyMockBanner title="주문 액션 차단">
        송장 저장, 현장수령 완료, 환불 승인, 배송조회, 알림톡은 실행하지 않습니다. 상세 페이지는 상태 확인용
        mock입니다.
      </CompanyMockBanner>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <CompanyPanel title="주문 기본 정보" action={<CompanyStatusPill status={order.status} />}>
          <CompanyFieldGrid
            fields={[
              { label: "order_no", value: order.orderNo },
              { label: "고객", value: `${order.customerNameMasked} / ${order.customerPhoneMasked}` },
              { label: "조리원", value: order.nurseryName },
              { label: "객실", value: order.roomName },
              { label: "수령방식", value: deliveryMethodLabel(order.deliveryMethod) },
              { label: "주문금액", value: formatCurrency(order.totalAmount) },
              { label: "주문일", value: formatDateTime(order.orderedAt) },
              { label: "결제일", value: order.paidAt ? formatDateTime(order.paidAt) : "-" },
              { label: "company_id", value: companyProfile.id },
            ]}
          />
        </CompanyPanel>

        <CompanyPanel title="배송/환불 상태">
          {order.status === "refund_requested" ? (
            <CompanyErrorState
              title="환불 요청 검토 필요"
              description="PG 취소 없이 입점사 검토 상태만 표시합니다."
              blockedBy="payment refund contract"
            />
          ) : (
            <CompanyFieldGrid
              fields={[
                { label: "배송조회", value: "disabled", helper: "carrier API 미연결" },
                { label: "알림톡", value: "disabled", helper: "notification policy 필요" },
                { label: "송장", value: lines.map((line) => line.invoiceNo).filter(Boolean).join(", ") || "미입력" },
              ]}
            />
          )}
        </CompanyPanel>
      </div>

      <CompanyPanel title="주문 상품 라인">
        <CompanyDataTable
          columns={["상품", "옵션", "수량", "단가", "정산예정", "수령방식", "상태"]}
          rows={lines.map((line) => ({
            id: line.id,
            cells: [
              <Link key="product" href={`/company/products/${line.productId}`} className="font-semibold text-emerald-700">
                {line.productName}
              </Link>,
              line.optionName,
              line.quantity,
              formatCurrency(line.unitPrice),
              formatCurrency(line.settlementAmount),
              deliveryMethodLabel(line.deliveryMethod),
              <CompanyStatusPill key="status" status={line.deliveryStatus} />,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="상세 타임라인">
        {events.length > 0 ? (
          <CompanyTimeline events={events} />
        ) : (
          <CompanyEmptyState
            title="주문 이벤트가 없습니다"
            description="이 주문은 아직 상세 mock 타임라인이 없습니다."
            recovery="실제 audit log와 배송 event 연결 후 자동 기록합니다."
          />
        )}
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyRefundsPage() {
  return (
    <CompanyShell
      title="환불 요청 검토"
      subtitle="환불 요청을 입점사 검토 mock 상태로 표시하고 실제 PG 취소/환불 지급은 수행하지 않습니다."
    >
      <CompanyMockBanner title="실제 환불 차단">
        PG 취소, 카드 부분취소, 계좌 환불, 알림톡 발송은 연결하지 않습니다. 검토 메모와 mock 상태만
        표시합니다.
      </CompanyMockBanner>

      <CompanyFilterSearchSort
        title="환불 검색 mock"
        query={filterPreset("refunds").query}
        sort={filterPreset("refunds").sort}
        chips={[`${filterPreset("refunds").resultCount}건`, "requested", "company_review"]}
      />

      <CompanyErrorState
        title={companyErrorStates[2].title}
        description={companyErrorStates[2].description}
        blockedBy={companyErrorStates[2].blockedBy}
      />

      <CompanyPanel title="환불 요청 목록">
        <CompanyDataTable
          columns={["요청일", "주문번호", "상품 snapshot", "결제상태", "요청자", "사유", "금액", "상태", "관리자 승인"]}
          rows={companyRefundRequests.map((refund) => ({
            id: refund.id,
            cells: [
              formatDateTime(refund.requestedAt),
              refund.orderNo,
              refund.productName,
              "approved_mock",
              refund.requesterMasked,
              refund.reason,
              formatCurrency(refund.refundAmount),
              <CompanyStatusPill key="status" status={refund.status} />,
              <CompanySoftPill key="admin" tone="amber">필요</CompanySoftPill>,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="검토 메모">
        <div className="grid gap-3 md:grid-cols-2">
          {companyRefundRequests.map((refund) => (
            <section key={refund.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-950">{refund.orderNo}</h3>
                <CompanyStatusPill status={refund.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{refund.companyReviewMemo}</p>
              <button
                type="button"
                disabled
                className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500"
              >
                검토 완료 mock
              </button>
            </section>
          ))}
        </div>
      </CompanyPanel>

      <CompanyPanel title="환불 승인 완료 빈 상태">
        <CompanyEmptyState
          title={companyEmptyStates[0].title}
          description={companyEmptyStates[0].description}
          recovery={companyEmptyStates[0].recovery}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyRefundDetailPage({ refundId }: { refundId: string }) {
  const refund = companyRefundRequests.find((item) => item.id === refundId) ?? companyRefundRequests[0];

  return (
    <CompanyShell
      title="환불 요청 상세"
      subtitle="실제 환불/부분취소를 금지하고 blocked 상태로 표시합니다."
    >
      <CompanyErrorState
        title="Refund and partial cancel blocked"
        description="이 상세 화면은 검토 정보만 표시합니다. PG 취소, 부분취소, 계좌 환불은 호출하지 않습니다."
        blockedBy="PG contract and admin approval gate"
      />

      <CompanyPanel title="refund detail">
        <CompanyFieldGrid
          fields={[
            { label: "refund_id", value: refund.id },
            { label: "주문번호", value: refund.orderNo },
            { label: "상품 snapshot", value: refund.productName },
            { label: "요청자", value: refund.requesterMasked },
            { label: "사유", value: refund.reason },
            { label: "상태", value: <CompanyStatusPill status={refund.status} /> },
            { label: "결제상태", value: "approved_mock" },
            { label: "환불금액", value: formatCurrency(refund.refundAmount) },
            { label: "관리자 승인", value: "required_mock" },
          ]}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyUsersPage() {
  return (
    <CompanyShell
      title="기업 사용자/권한"
      subtitle="company_id 기준 접근 제한과 COMPANY_ADMIN 권한을 mock으로 표시합니다. 실제 Firebase Auth는 연결하지 않습니다."
    >
      <CompanyMockBanner title="Auth 연결 차단">
        이 화면은 권한 모델 표시용입니다. 초대 메일, 비밀번호, Custom Claims, 세션 발급은 수행하지 않습니다.
      </CompanyMockBanner>

      <CompanyPanel title="접근 제한 상태">
        <CompanyFieldGrid
          fields={[
            { label: "company_id", value: companyProfile.id, helper: "현재 worktree mock scope" },
            { label: "대표 권한", value: "COMPANY_ADMIN", helper: "상품/주문/정산 mock 관리 권한" },
            { label: "Auth provider", value: "not connected", helper: "Firebase Auth 연결 금지" },
            { label: "Custom Claims", value: "pending contract", helper: "firebase-contract 트랙 확인 필요" },
            { label: "다른 company 접근", value: "blocked mock", helper: "목록/상세 모두 company_id 고정" },
            { label: "감사로그", value: "not connected", helper: "서버 audit log 없음" },
          ]}
        />
      </CompanyPanel>

      <CompanyPanel title="사용자 목록 mock">
        <CompanyDataTable
          columns={["이름", "이메일", "역할", "상태", "마지막 접속", "권한 요약"]}
          rows={companyUserAccessList.map((user) => ({
            id: user.id,
            cells: [
              user.name,
              user.emailMasked,
              <CompanySoftPill key="role" tone={user.role === "COMPANY_ADMIN" ? "green" : "blue"}>
                {user.role}
              </CompanySoftPill>,
              <CompanySoftPill key="status" tone={user.status === "suspended_mock" ? "red" : "green"}>
                {user.status}
              </CompanySoftPill>,
              user.lastSeenAt ? formatDateTime(user.lastSeenAt) : "-",
              user.permissionSummary,
            ],
          }))}
        />
      </CompanyPanel>

      <CompanyPanel title="권한 오류 상태">
        <CompanyErrorState
          title="Firebase Auth not connected"
          description="실제 로그인, Custom Claims, company_id 검증은 아직 연결하지 않았습니다."
          blockedBy="AUTH_CLAIMS_PLAN and Firebase contract track"
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyProfilePage() {
  return (
    <CompanyShell
      title="기업 프로필/정산계좌"
      subtitle="입점 기업 프로필과 정산계좌 마스킹 정보를 표시합니다."
    >
      <CompanyPanel title="기업 프로필">
        <CompanyFieldGrid
          fields={[
            { label: "company_id", value: companyProfile.id },
            { label: "입점사명", value: companyProfile.name },
            { label: "담당자", value: companyProfile.managerName },
            { label: "담당자 이메일", value: companyProfile.managerEmail },
            { label: "상태", value: companyProfile.status },
            { label: "수수료율", value: formatPercent(companyProfile.commissionRate) },
            { label: "정산계좌", value: companyProfile.settlementAccountMasked, helper: "마스킹 표시만 제공" },
            { label: "환불정책", value: companyProfile.defaultReturnPolicy },
          ]}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyNotificationsPage() {
  return (
    <CompanyShell
      title="기업 알림 설정"
      subtitle="실제 알림톡 발송 없이 알림 설정 mock 상태만 표시합니다."
    >
      <CompanyMockBanner title="알림톡 발송 금지">
        Alimtalk, SMS, email 발송 API는 호출하지 않습니다. 설정값은 dashboard mock 표시용입니다.
      </CompanyMockBanner>

      <CompanyPanel title="notification settings mock">
        <CompanyDataTable
          columns={["이벤트", "채널", "활성", "차단 사유"]}
          rows={companyNotificationSettings.map((setting) => ({
            id: setting.id,
            cells: [
              setting.event,
              setting.channel,
              setting.enabledMock ? "enabled_mock" : "disabled",
              setting.blockedReason ?? "dashboard mock only",
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyAuditLogsPage() {
  return (
    <CompanyShell
      title="기업 감사 로그"
      subtitle="상품, 주문, 재고, 정산, 환불, 사용자 변경 이력을 mock audit log로 표시합니다."
    >
      <CompanyPanel title="audit_logs mock">
        <CompanyDataTable
          columns={["일시", "actor", "role", "action", "target", "message"]}
          rows={companyAuditLogs.map((log) => ({
            id: log.id,
            cells: [
              formatDateTime(log.createdAt),
              log.actor,
              log.role,
              log.action,
              `${log.targetType}:${log.targetId}`,
              log.message,
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanySearchPage() {
  return (
    <CompanyShell
      title="통합 검색"
      subtitle="상품, 주문, 정산을 company_id 기준으로 검색하는 mock UI입니다."
    >
      <CompanyTableToolbar
        title="상품/주문/정산 검색"
        query="company_id:company_sanho_luxury_001 keyword:mock"
        sort="updatedAt desc"
        chips={["상품", "주문", "정산", "환불", "재고"]}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <CompanyPanel title="상품 결과">
          <CompanyDataTable
            columns={["상품", "상태", "재고"]}
            rows={companyProducts.slice(0, 8).map((product) => ({
              id: `search-product-${product.id}`,
              cells: [product.name, <CompanyStatusPill key="status" status={product.status} />, product.stockTotal],
            }))}
          />
        </CompanyPanel>
        <CompanyPanel title="주문 결과">
          <CompanyDataTable
            columns={["주문번호", "상태", "금액"]}
            rows={companyOrders.slice(0, 8).map((order) => ({
              id: `search-order-${order.id}`,
              cells: [order.orderNo, <CompanyStatusPill key="status" status={order.status} />, formatCurrency(order.totalAmount)],
            }))}
          />
        </CompanyPanel>
        <CompanyPanel title="정산 결과">
          <CompanyDataTable
            columns={["기간", "상태", "입금예정"]}
            rows={companySettlements.slice(0, 8).map((settlement) => ({
              id: `search-settlement-${settlement.id}`,
              cells: [
                settlement.period,
                <CompanyStatusPill key="status" status={settlement.status} />,
                formatCurrency(settlement.payoutAmount),
              ],
            }))}
          />
        </CompanyPanel>
      </div>
    </CompanyShell>
  );
}

export function CompanyRouteIndexPage() {
  return (
    <CompanyShell
      title="Company route index"
      subtitle="Browser-visible preview hub for company mock/test beta routes."
    >
      <CompanyMockBanner title="mock/test beta route index">
        company_id: {companyStatusCompanyId}. This index links mock pages only. No production service is connected.
      </CompanyMockBanner>
      <CompanyRoutePreviewGrid routes={companyRoutePreviews} companyId={companyStatusCompanyId} />
    </CompanyShell>
  );
}

export function CompanySmokeChecklistPage() {
  return (
    <CompanyShell
      title="Visual smoke checklist"
      subtitle="Manual browser checklist for company routes. Run only after a local dev server is available."
    >
      <CompanyPanel title="Smoke checklist">
        <CompanyDataTable
          columns={["Route", "Expected", "Blocker", "Result"]}
          rows={companyRoutePreviews.map((route) => ({
            id: `smoke-${route.href}`,
            cells: [
              <Link key="route" href={route.href} className="font-semibold text-emerald-700">
                {route.href}
              </Link>,
              route.coverage,
              route.blocker,
              "manual check pending",
            ],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyRiskCenterPage() {
  return (
    <CompanyShell
      title="Company risk center"
      subtitle="Storage, PG, delivery, external inventory, Firebase, and payout blockers are collected here."
    >
      <CompanyMockBanner title="all risks are blocker-only">
        company_id: {companyStatusCompanyId}. This route is a visual blocker center and does not call external APIs.
      </CompanyMockBanner>
      <CompanyPanel title="route blockers">
        <CompanyDataTable
          columns={["Group", "Route", "Status", "Coverage", "Blocker", "Next"]}
          rows={companyRoutePreviews
            .filter((route) => route.status === "blocked")
            .map((route) => ({
              id: `risk-${route.href}`,
              cells: [route.group, route.href, route.status, route.coverage, route.blocker, route.nextTask],
            }))}
        />
      </CompanyPanel>
      <CompanyPanel title="risk records">
        <CompanyDataTable
          columns={["Title", "Severity", "Status", "Owner", "Detail"]}
          rows={companyRiskItems.map((risk) => ({
            id: risk.id,
            cells: [risk.title, risk.severity, risk.status, risk.owner, risk.detail],
          }))}
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyInventoryOptionDetailPage({ optionId }: { optionId: string }) {
  const option = companyProductOptions.find((item) => item.id === optionId) ?? companyProductOptions[0];
  const movements = companyInventoryMovements.filter((movement) => movement.optionId === option.id);

  return (
    <CompanyShell
      title="재고 상세"
      subtitle="옵션 단위 재고, 안전재고, 판매상태, 외부 매핑, 재고 이력을 표시합니다."
    >
      <CompanyPanel title="option inventory detail">
        <CompanyFieldGrid
          fields={[
            { label: "option_id", value: option.id },
            { label: "상품", value: productName(option.productId) },
            { label: "옵션", value: option.name },
            { label: "SKU", value: option.sku },
            { label: "재고", value: option.stock },
            { label: "안전재고", value: option.safetyStock },
            { label: "판매상태", value: saleStateLabel(option.saleState ?? "on_sale") },
            { label: "외부 SKU", value: option.externalSkuCode ?? "미등록" },
          ]}
        />
      </CompanyPanel>

      <CompanyPanel title="option inventory movements">
        <CompanyDataTable
          columns={["일시", "유형", "수량", "메모"]}
          rows={movements.map((movement) => ({
            id: movement.id,
            cells: [
              formatDateTime(movement.createdAt),
              movementLabel(movement.type),
              movement.quantity,
              movement.memo,
            ],
          }))}
          emptyLabel="이 옵션의 재고 이력이 없습니다."
        />
      </CompanyPanel>
    </CompanyShell>
  );
}

export function CompanyMobileOpsPage() {
  const priorityLines = companyOrderLines.filter(
    (line) =>
      line.deliveryStatus === "invoice_pending" ||
      line.deliveryStatus === "ready_for_pickup" ||
      line.deliveryStatus === "refund_requested",
  );

  return (
    <CompanyShell
      title="모바일 운영 mock"
      subtitle="태블릿/모바일 폭에서 입점사 담당자가 빠르게 확인할 주문, 재고, 환불, 픽업 작업을 압축 표시합니다."
    >
      <CompanyMockBanner title="모바일 액션 read-only">
        작은 화면에서도 확인 가능한 운영 카드만 제공합니다. 송장 저장, 수령 완료, 환불 승인, 재고 조정은 실행하지
        않습니다.
      </CompanyMockBanner>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {priorityLines.map((line) => (
          <section key={line.id} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-500">{line.orderNo}</p>
                <h3 className="mt-2 text-sm font-bold text-slate-950">{line.productName}</h3>
              </div>
              <CompanyStatusPill status={line.deliveryStatus} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              {line.optionName} / {line.quantity}개 / {deliveryMethodLabel(line.deliveryMethod)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-500"
              >
                처리 mock
              </button>
              <Link
                href={`/company/orders/${line.orderNo}`}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-xs font-bold text-emerald-700"
              >
                상세
              </Link>
            </div>
          </section>
        ))}
      </div>

      <CompanyPanel title="모바일 빈/오류 상태">
        <div className="grid gap-4 md:grid-cols-2">
          <CompanyEmptyState
            title="모바일 전용 실제 액션이 없습니다"
            description="현재는 화면 검증용 카드만 제공됩니다."
            recovery="실제 액션은 권한, audit log, repository 연결 이후 활성화합니다."
          />
          <CompanyErrorState
            title="Mobile action API disabled"
            description="송장, 픽업, 환불, 재고 조정 API를 모바일에서 호출하지 않습니다."
            blockedBy="server action and Firebase repository contract"
          />
        </div>
      </CompanyPanel>
    </CompanyShell>
  );
}
