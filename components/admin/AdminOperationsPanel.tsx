import Link from "next/link";
import type { ReactNode } from "react";
import {
  adminAuditOperations,
  adminContentSlots,
  companyApprovalQueue,
  orderMonitorItems,
  paymentMonitorItems,
  productApprovalQueue,
  repositoryConnectionItems,
} from "@/data/admin/operations";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { AdminApprovalStatus } from "@/types/admin";

const approvalLabel: Record<AdminApprovalStatus, string> = {
  pending_review: "검토 대기",
  approved_mock: "모의 승인",
  rejected_mock: "모의 반려",
  needs_fix: "수정 요청",
  blocked: "차단",
};

const approvalTone: Record<AdminApprovalStatus, string> = {
  pending_review: "bg-amber-100 text-amber-900 ring-amber-200",
  approved_mock: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  rejected_mock: "bg-red-100 text-red-800 ring-red-200",
  needs_fix: "bg-violet-100 text-violet-800 ring-violet-200",
  blocked: "bg-red-100 text-red-800 ring-red-200",
};

const paymentProviderLabel: Record<string, string> = {
  mock: "모의 결제사",
};

const paymentStatusLabel: Record<string, string> = {
  approved_mock: "모의 승인",
  failed_mock: "모의 실패",
  webhook_pending: "웹훅 대기",
};

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "amber" | "red" | "green" | "purple" }) {
  const classes = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-100 text-blue-800 ring-blue-200",
    amber: "bg-amber-100 text-amber-900 ring-amber-200",
    red: "bg-red-100 text-red-800 ring-red-200",
    green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    purple: "bg-violet-100 text-violet-800 ring-violet-200",
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${classes[tone]}`}>{children}</span>;
}

function ApprovalStatusBadge({ status }: { status: AdminApprovalStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${approvalTone[status]}`}>{approvalLabel[status]}</span>;
}

function SuperAdminWriteGate() {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-4 text-red-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">최고관리자 권한 필요</h2>
          <p className="mt-2 text-sm leading-6">
            승인/반려, 콘텐츠 공개 전환, 결제/주문 강제 상태 변경은 실제 쓰기가 아닙니다. 운영 쓰기는 최고관리자 권한 클레임, 감사 로그, 서버 검증 후에만 허용해야 합니다.
          </p>
        </div>
        <Pill tone="red">브라우저 직접 쓰기 금지</Pill>
      </div>
    </section>
  );
}

function DisabledActionButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-60">
        승인
      </button>
      <button type="button" disabled className="rounded-md bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-200 disabled:opacity-60">
        반려
      </button>
    </div>
  );
}

export function CompanyApprovalQueuePanel() {
  return (
    <section>
      <FilterBar
        title="입점사 승인/반려 큐"
        filters={["전체", "검토 대기", "수정 요청", "서류 보강", "SUPER_ADMIN 필요"]}
        mode="toolbar"
        resultCount={companyApprovalQueue.length}
        searchPlaceholder="상호, 사업자등록번호, 통신판매업 신고번호"
      />
      <DataTable
        columns={["입점사", "사업자/통신판매", "서류", "위험", "상태", "저장 경로", "작업"]}
        rows={companyApprovalQueue.map((company) => ({
          id: company.id,
          cells: [
            <div key="company">
              <p className="font-black text-slate-950">{company.companyName}</p>
              <p className="mt-1 text-xs text-slate-500">{company.managerName} / {formatDateTime(company.submittedAt)}</p>
            </div>,
            <div key="biz" className="text-xs leading-5">
              <p>사업자: {company.businessRegistrationNumber}</p>
              <p>통신판매: {company.mailOrderRegistrationNumber}</p>
            </div>,
            <div key="docs" className="flex flex-wrap gap-1">
              {company.documents.map((doc) => <Pill key={doc}>{doc}</Pill>)}
            </div>,
            <div key="risks" className="grid gap-1">
              {company.riskFlags.map((risk) => <Pill key={risk} tone="amber">{risk}</Pill>)}
            </div>,
            <ApprovalStatusBadge key="status" status={company.status} />,
            <code key="path" className="text-xs text-slate-600">{company.repositoryPath}</code>,
            <DisabledActionButtons key="actions" />,
          ],
        }))}
        sortLabel="정렬: 제출일 최신순"
        paginationLabel={`1-${companyApprovalQueue.length} / ${companyApprovalQueue.length}`}
      />
      <div className="mt-4">
        <SuperAdminWriteGate />
      </div>
    </section>
  );
}

export function ProductApprovalQueuePanel() {
  return (
    <section>
      <FilterBar
        title="상품 승인/반려 큐"
        filters={["전체", "KC 검토", "금지상품 red flag", "법적 고지 누락", "승인 가능"]}
        mode="toolbar"
        resultCount={productApprovalQueue.length}
        searchPlaceholder="상품명, 입점사, KC 인증번호"
      />
      <DataTable
        columns={["상품", "법적 고지/KC", "위험 표시", "상태", "저장 경로", "작업"]}
        rows={productApprovalQueue.map((product) => ({
          id: product.id,
          cells: [
            <div key="product">
              <p className="font-black text-slate-950">{product.productName}</p>
              <p className="mt-1 text-xs text-slate-500">{product.companyName} / {product.category} / {formatDateTime(product.submittedAt)}</p>
            </div>,
            <div key="compliance" className="flex max-w-xl flex-wrap gap-1">
              <Pill tone={product.complianceSummary.sellerDisclosure ? "green" : "red"}>판매자 정보</Pill>
              <Pill tone={product.complianceSummary.productNotice ? "green" : "red"}>상품 고시</Pill>
              <Pill tone={product.complianceSummary.returnPolicy ? "green" : "red"}>반품/AS/배송</Pill>
              <Pill tone={product.complianceSummary.kcTarget ? "amber" : "slate"}>KC 대상</Pill>
              <Pill tone={product.complianceSummary.kcNumber ? "green" : "red"}>{product.complianceSummary.kcNumber ?? "KC 번호 없음"}</Pill>
              <Pill tone={product.complianceSummary.evidenceUploaded ? "green" : "red"}>증빙</Pill>
            </div>,
            <div key="flags" className="grid gap-1">
              {product.complianceSummary.prohibitedFlags.length ? (
                product.complianceSummary.prohibitedFlags.map((flag) => <Pill key={flag} tone="red">{flag}</Pill>)
              ) : (
                <Pill tone="green">위험 표시 없음</Pill>
              )}
            </div>,
            <ApprovalStatusBadge key="status" status={product.status} />,
            <code key="path" className="text-xs text-slate-600">{product.repositoryPath}</code>,
            <DisabledActionButtons key="actions" />,
          ],
        }))}
        sortLabel="정렬: 위험도, 제출일"
        paginationLabel={`1-${productApprovalQueue.length} / ${productApprovalQueue.length}`}
      />
      <div className="mt-4">
        <SuperAdminWriteGate />
      </div>
    </section>
  );
}

export function CmsOperationsPanel() {
  return (
    <section>
      <FilterBar
        title="CMS 노출 운영"
        filters={["배너", "영상", "GIF", "브랜드관", "기획전", "팝업", "예약 노출"]}
        mode="toolbar"
        resultCount={adminContentSlots.length}
        searchPlaceholder="제목, 대상 조리원, 링크"
      />
      <DataTable
        columns={["콘텐츠", "유형/위치", "노출 대상", "기간/정렬", "링크", "상태", "작업"]}
        rows={adminContentSlots.map((slot) => ({
          id: slot.id,
          cells: [
            <div key="content">
              <p className="font-black text-slate-950">{slot.title}</p>
              <p className="mt-1 text-xs text-slate-500">{slot.reviewNote}</p>
            </div>,
            <div key="type" className="flex flex-wrap gap-1">
              <Pill tone="blue">{slot.assetType}</Pill>
              <Pill>{slot.placement}</Pill>
            </div>,
            <div key="target" className="text-xs leading-5">
              <p>조리원: {slot.targetNurseryIds.join(", ")}</p>
              <p>객실: {slot.targetRoomIds.length ? slot.targetRoomIds.join(", ") : "전체"}</p>
            </div>,
            <div key="period" className="text-xs leading-5">
              <p>{formatDateTime(slot.startAt)} - {formatDateTime(slot.endAt)}</p>
              <p>정렬 {slot.sortOrder}</p>
            </div>,
            <Link key="link" href={slot.linkUrl} className="font-bold text-blue-700">{slot.linkUrl}</Link>,
            <Pill key="status" tone={slot.status === "approved" || slot.status === "scheduled" ? "green" : slot.status === "pending_approval" ? "amber" : "slate"}>{slot.status}</Pill>,
            <DisabledActionButtons key="actions" />,
          ],
        }))}
      />
      <div className="mt-4">
        <SuperAdminWriteGate />
      </div>
    </section>
  );
}

export function PaymentMonitorPanel() {
  return (
    <section>
      <FilterBar
        title="결제 모니터"
        filters={["전체", "모의 승인", "웹훅 대기", "실패", "수동 검토"]}
        mode="toolbar"
        resultCount={paymentMonitorItems.length}
        searchPlaceholder="주문번호, paymentIntentId"
      />
      <DataTable
        columns={["주문/결제", "PG사", "상태", "금액", "고객", "최근 이벤트", "위험"]}
        rows={paymentMonitorItems.map((item) => ({
          id: item.id,
          cells: [
            <div key="ids">
              <Link href={`/orders/guest/${item.orderNo}`} className="font-black text-blue-700">{item.orderNo}</Link>
              <p className="mt-1 text-xs text-slate-500">{item.paymentIntentId}</p>
            </div>,
            <Pill key="provider" tone={item.provider === "mock" ? "slate" : "blue"}>{paymentProviderLabel[item.provider] ?? item.provider}</Pill>,
            <Pill key="status" tone={item.status === "approved_mock" ? "green" : item.status === "failed_mock" ? "red" : "amber"}>{paymentStatusLabel[item.status] ?? item.status}</Pill>,
            formatCurrency(item.amount),
            item.customerMasked,
            formatDateTime(item.lastEventAt),
            <Pill key="risk" tone={item.status === "approved_mock" ? "amber" : "red"}>{item.risk}</Pill>,
          ],
        }))}
      />
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        실제 PG 승인/취소/환불/정산 지급은 이 화면에서 실행하지 않습니다. 상태 변경 write는 Functions transaction과 SUPER_ADMIN 승인/audit log가 필요합니다.
      </div>
    </section>
  );
}

export function OrderMonitorPanel() {
  return (
    <section>
      <FilterBar
        title="주문 모니터"
        filters={["전체", "결제완료", "결제대기", "현장수령", "위험"]}
        mode="toolbar"
        resultCount={orderMonitorItems.length}
        searchPlaceholder="주문번호, QR 세션, 조리원"
      />
      <DataTable
        columns={["주문번호", "QR/조리원", "입점사 수", "상태", "금액", "생성", "위험"]}
        rows={orderMonitorItems.map((item) => ({
          id: item.id,
          cells: [
            <Link key="order" href={`/orders/guest/${item.orderNo}`} className="font-black text-blue-700">{item.orderNo}</Link>,
            <div key="scope" className="text-xs leading-5">
              <p>{item.qrSessionId}</p>
              <p>{item.nurseryId}</p>
            </div>,
            item.companyCount,
            <Pill key="status" tone={item.status === "paid" ? "green" : "amber"}>{item.status}</Pill>,
            formatCurrency(item.totalAmount),
            formatDateTime(item.createdAt),
            <Pill key="risk" tone="amber">{item.risk}</Pill>,
          ],
        }))}
      />
    </section>
  );
}

export function AuditLogViewerPanel() {
  return (
    <section>
      <FilterBar
        title="감사 로그 viewer"
        filters={["전체", "승인", "반려", "결제", "차단", "시스템"]}
        mode="toolbar"
        resultCount={adminAuditOperations.length}
        searchPlaceholder="actor, action, target"
      />
      <DataTable
        columns={["시각", "행위자", "작업", "대상", "심각도", "메시지", "경로"]}
        rows={adminAuditOperations.map((log) => ({
          id: log.id,
          cells: [
            formatDateTime(log.createdAt),
            <div key="actor" className="text-xs leading-5">
              <p className="font-black text-slate-950">{log.actorRole}</p>
              <p>{log.actorName}</p>
            </div>,
            log.action,
            log.target,
            <Pill key="severity" tone={log.severity === "blocked" ? "red" : log.severity === "warning" ? "amber" : "blue"}>{log.severity}</Pill>,
            log.message,
            <code key="path" className="text-xs text-slate-600">{log.repositoryPath}</code>,
          ],
        }))}
      />
    </section>
  );
}

export function RepositoryConnectionPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">저장소 계약</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Firestore repository 연결 가능 구조</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            관리자 화면은 Firestore repository로 읽을 수 있는 구조를 전제로 하며, write는 SUPER_ADMIN claim 또는 Functions 전용으로 제한합니다.
          </p>
        </div>
        <Pill tone="red">최고관리자 쓰기 게이트</Pill>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {repositoryConnectionItems.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-black text-slate-950">{item.label}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{item.firestoreCollection}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Pill tone={item.currentMode === "repository_ready" ? "green" : item.currentMode === "server_write_only" ? "blue" : "amber"}>{item.currentMode}</Pill>
                <Pill tone={item.writePolicy === "SUPER_ADMIN_required" ? "red" : "amber"}>{item.writePolicy}</Pill>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
