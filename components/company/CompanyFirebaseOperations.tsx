import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getLiveCompanyInventoryMovements,
  getLiveCompanyOrderItems,
  getLiveCompanyProducts,
  getLiveCompanySettlementPreview,
  type CompanySettlementPreview,
  type LiveRead,
} from "@/lib/repositories/liveCommerceRepository";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { InventoryMovement } from "@/lib/repositories/types";
import type { OrderItem, Product } from "@/types/commerce";

const defaultCompanyId = "company-sanho-care";

function SourceBadge({ read }: { read: Pick<LiveRead<unknown>, "source" | "reason"> }) {
  const isFirebase = read.source === "Firestore";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
      <span
        className={`inline-flex rounded-full px-2.5 py-1 font-black ${
          isFirebase ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
        }`}
      >
        {isFirebase ? "Firebase schema read" : "mock fallback"}
      </span>
      <p className="mt-2 leading-5">
        {isFirebase
          ? "Firestore를 우선 읽고 있습니다. 화면 write는 아직 SUPER_ADMIN/서버 계층 승인 후 열립니다."
          : read.reason ?? "Firestore 결과가 비어 있거나 권한/env 문제로 mock fallback을 표시합니다."}
      </p>
    </div>
  );
}

function ScopeCard({ companyId }: { companyId: string }) {
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Firebase company scope</p>
          <h2 className="mt-1 text-lg font-black">기업 운영 데이터는 company_id 범위로만 표시</h2>
          <p className="mt-2 text-sm leading-6">
            상품, 주문 항목, 재고 이동, 정산 예정 금액은 모두 <strong>{companyId}</strong> 기준으로 읽습니다.
            실제 등록/수정 write는 Custom Claims와 Functions 승인 계층이 준비된 뒤 활성화합니다.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
          PG/정산 지급 비활성
        </span>
      </div>
    </section>
  );
}

function buildProductRows(products: Product[]) {
  return products.map((product) => ({
    id: product.id,
    cells: [
      <div key="product" className="min-w-52">
        <p className="font-black text-slate-950">{product.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {product.id} / {product.source ?? "repository"}
        </p>
      </div>,
      product.category,
      <StatusBadge key="status" status={product.status} />,
      formatCurrency(product.price),
      product.stock,
      product.externalProductCode ?? "외부 코드 미등록",
      product.seededAt ? formatDateTime(product.seededAt) : "seeded_at 미표시",
    ],
  }));
}

function buildOrderItemRows(items: OrderItem[]) {
  return items.map((item) => ({
    id: item.id,
    cells: [
      item.orderId,
      item.productName,
      item.optionName,
      item.quantity,
      item.deliveryStatus,
      formatCurrency(item.unitPrice * item.quantity),
      formatCurrency(item.settlementAmount),
    ],
  }));
}

function buildInventoryRows(movements: InventoryMovement[]) {
  return movements.map((movement) => ({
    id: movement.id,
    cells: [
      movement.productId ?? "product_id 없음",
      movement.optionId,
      movement.type,
      movement.quantity,
      movement.reason,
      movement.sourceId ?? "source 없음",
      formatDateTime(movement.createdAt),
    ],
  }));
}

function SettlementPreviewCard({ read }: { read: LiveRead<CompanySettlementPreview> }) {
  const settlement = read.data;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">company_id scoped payout preview</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">정산 예정 금액</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            실제 정산 지급은 금지되어 있으며, 현재는 Firestore/mock order_items 기준으로만 예상 금액을 계산합니다.
          </p>
        </div>
        <SourceBadge read={read} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ["기간", settlement.period],
          ["주문 항목", `${settlement.itemCount}건`],
          ["총 판매액", formatCurrency(settlement.grossAmount)],
          ["예상 입금", formatCurrency(settlement.payoutAmount)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-1 text-base font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function CompanyOperationsOverview({ companyId = defaultCompanyId }: { companyId?: string }) {
  const [products, orderItems, inventory, settlement] = await Promise.all([
    getLiveCompanyProducts(companyId),
    getLiveCompanyOrderItems(companyId),
    getLiveCompanyInventoryMovements(companyId),
    getLiveCompanySettlementPreview(companyId),
  ]);

  return (
    <div className="grid gap-4">
      <ScopeCard companyId={companyId} />
      <div className="grid gap-4 xl:grid-cols-4">
        {[
          ["상품", `${products.data.length}개`, products.source],
          ["주문 항목", `${orderItems.data.length}건`, orderItems.source],
          ["재고 이동", `${inventory.data.length}건`, inventory.source],
          ["정산 기준", settlement.data.basis, settlement.source],
        ].map(([label, value, source]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
            <p className="mt-2 text-xs font-bold text-slate-500">{source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function CompanyFirestoreProductsPanel({ companyId = defaultCompanyId }: { companyId?: string }) {
  const read = await getLiveCompanyProducts(companyId);

  return (
    <section className="grid gap-3">
      <SourceBadge read={read} />
      <DataTable
        columns={["상품", "카테고리", "상태", "폐쇄몰가", "재고", "외부 코드", "seeded_at"]}
        rows={buildProductRows(read.data)}
        emptyMessage="이 company_id에 연결된 Firestore 상품이 없습니다."
        sortLabel="정렬: Firestore active 상품 우선"
        paginationLabel={`${read.data.length}개 / company_id=${companyId}`}
      />
    </section>
  );
}

export async function CompanyOrderItemsPanel({ companyId = defaultCompanyId }: { companyId?: string }) {
  const read = await getLiveCompanyOrderItems(companyId);

  return (
    <section className="grid gap-3">
      <SourceBadge read={read} />
      <DataTable
        columns={["주문 ID", "상품", "옵션", "수량", "배송 상태", "판매액", "정산 기준액"]}
        rows={buildOrderItemRows(read.data)}
        emptyMessage="이 company_id에 배정된 order_items가 없습니다."
        sortLabel="범위: company_id가 일치하는 order_items"
        paginationLabel={`${read.data.length}건`}
      />
    </section>
  );
}

export async function CompanyInventoryMovementsPanel({ companyId = defaultCompanyId }: { companyId?: string }) {
  const read = await getLiveCompanyInventoryMovements(companyId);

  return (
    <section className="grid gap-3">
      <SourceBadge read={read} />
      <DataTable
        columns={["상품 ID", "옵션 ID", "이동 유형", "수량", "사유", "출처", "생성"]}
        rows={buildInventoryRows(read.data)}
        emptyMessage="이 company_id에 연결된 inventory_movements가 없습니다."
        sortLabel="범위: 자기 상품의 재고 이동만"
        paginationLabel={`${read.data.length}건`}
      />
    </section>
  );
}

export async function CompanySettlementPreviewPanel({ companyId = defaultCompanyId }: { companyId?: string }) {
  const read = await getLiveCompanySettlementPreview(companyId);

  return <SettlementPreviewCard read={read} />;
}

export function CompanyProductRegistrationFlowPanel() {
  return (
    <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">product create / preview readiness</p>
          <h2 className="mt-1 text-lg font-black">상품 등록은 법적 고지와 미리보기를 통과한 뒤 승인 요청</h2>
          <p className="mt-2 text-sm leading-6">
            사업자/CS/반품지, KC 인증, 금지상품 체크, 상세페이지 미리보기 값을 Firestore schema에 맞춰 받을 준비가
            되어 있습니다. 실제 파일 업로드와 write는 승인된 계정 claim과 Storage rules 연결 후 진행합니다.
          </p>
        </div>
        <Link href="/company/products/preview" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          미리보기 확인
        </Link>
      </div>
    </section>
  );
}
