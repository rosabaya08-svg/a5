"use client";

import { useMemo, useState } from "react";
import type { Company, OrderItem, Product, Settlement } from "@/types/commerce";
import { calculateA5SalesCommission } from "@/lib/payments/payupReconciliation";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

type PgKeyDraft = {
  merchantId: string;
  authKey: string;
  webhookSecret: string;
  webhookUrl: string;
};

const defaultWebhookUrl = "https://asia-northeast3-a5-closed-mall.cloudfunctions.net/paymentsWebhook";

function statusTone(status: string) {
  if (status === "approved" || status === "active") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "pending" || status === "in_review" || status === "pending_approval") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (status === "blocked" || status === "suspended") return "bg-rose-50 text-rose-800 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function StatusPill({ children, status }: { children: React.ReactNode; status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-normal ring-1 ${statusTone(status)}`}>
      {children}
    </span>
  );
}

function buildInitialPgDraft(company: Company): PgKeyDraft {
  return {
    merchantId: company.pgProfile?.merchantId ?? "",
    authKey: "",
    webhookSecret: "",
    webhookUrl: defaultWebhookUrl,
  };
}

function maskInputValue(value: string, fallback: string) {
  if (!value.trim()) return fallback;
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

type AdminCompanySelectionDashboardProps = {
  companies?: Company[];
  products?: Product[];
  orderItems?: OrderItem[];
  settlements?: Settlement[];
};

export function AdminCompanySelectionDashboard({
  companies = [],
  products = [],
  orderItems = [],
  settlements = [],
}: AdminCompanySelectionDashboardProps = {}) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id ?? "");
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0];
  const [pgDrafts, setPgDrafts] = useState<Record<string, PgKeyDraft>>(() =>
    Object.fromEntries(companies.map((company) => [company.id, buildInitialPgDraft(company)])),
  );

  const companyProducts = useMemo(
    () => products.filter((product) => product.companyId === selectedCompany?.id),
    [products, selectedCompany?.id],
  );
  const companyOrderItems = useMemo(
    () => orderItems.filter((item) => item.companyId === selectedCompany?.id),
    [orderItems, selectedCompany?.id],
  );
  const companySettlements = useMemo(
    () => settlements.filter((settlement) => settlement.companyId === selectedCompany?.id),
    [settlements, selectedCompany?.id],
  );
  void companySettlements;

  if (!selectedCompany) {
    return null;
  }

  const pgDraft = pgDrafts[selectedCompany.id] ?? buildInitialPgDraft(selectedCompany);
  const grossSales = companyOrderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const a5Commission = calculateA5SalesCommission(grossSales, selectedCompany.commissionRate).a5CommissionAmount;
  const approvedProducts = companyProducts.filter((product) => product.status === "approved").length;
  const pendingProducts = companyProducts.filter((product) => product.status === "pending_approval").length;

  function updatePgDraft(key: keyof PgKeyDraft, value: string) {
    setPgDrafts((current) => ({
      ...current,
      [selectedCompany.id]: {
        ...(current[selectedCompany.id] ?? buildInitialPgDraft(selectedCompany)),
        [key]: value,
      },
    }));
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-blue-700">입점기업 관리판</p>
          <h2 className="mt-1 text-xl font-normal text-slate-950">등록 기업 선택 / 운영 대시보드</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            왼쪽에서 입점사를 선택하면 기업 상태, Payup 가맹점 입력값, 상품 운영 상태, 매출과 A5 수수료 예정액을 한 화면에서 확인합니다.
          </p>
        </div>
        <StatusPill status={selectedCompany.status}>
          {selectedCompany.status === "approved" ? "입점 승인 완료" : selectedCompany.status}
        </StatusPill>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[300px_1fr]">
        <aside className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-normal uppercase text-slate-500">입점사</p>
              <h3 className="text-lg font-normal text-slate-950">기업 리스트</h3>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-normal text-slate-700 ring-1 ring-slate-200">
              {companies.length}개
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {companies.map((company) => {
              const active = company.id === selectedCompany.id;
              const companyProductCount = products.filter((product) => product.companyId === company.id).length;
              const companySales = orderItems
                .filter((item) => item.companyId === company.id)
                .reduce((total, item) => total + item.unitPrice * item.quantity, 0);

              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(company.id)}
                  className={`rounded-md border p-3 text-left transition ${
                    active
                      ? "border-blue-500 bg-white shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-normal text-slate-950">{company.name}</p>
                      <p className="mt-1 truncate text-xs font-normal text-slate-500">{company.id}</p>
                    </div>
                    <StatusPill status={company.status}>{company.status}</StatusPill>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-normal text-slate-600">
                    <span>상품 {companyProductCount}개</span>
                    <span className="text-right">{formatCurrency(companySales)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="grid gap-4">
          <section className="grid gap-3 lg:grid-cols-4">
            {[
              ["입점 승인", selectedCompany.status === "approved" ? "승인 완료" : selectedCompany.status, "기업 가입/서류 검토 상태"],
              ["상품 운영", `${approvedProducts} / ${companyProducts.length}`, `${pendingProducts}건 예외 검토`],
              ["매출", formatCurrency(grossSales), "order_items 기준"],
              ["A5 수수료", formatCurrency(a5Commission), `영업 수수료 ${formatPercent(selectedCompany.commissionRate)}`],
            ].map(([label, value, helper]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-normal text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-normal text-slate-950">{value}</p>
                <p className="mt-2 text-xs font-normal text-slate-500">{helper}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 2xl:grid-cols-[1fr_420px]">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-normal text-slate-500">대시보드</p>
                  <h3 className="mt-1 text-lg font-normal text-slate-950">{selectedCompany.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    담당자 {selectedCompany.managerName} / PG {selectedCompany.pgProfile?.providerLabel ?? "미설정"}
                  </p>
                </div>
                <StatusPill status={selectedCompany.pgProfile?.merchantStatus ?? "not_applied"}>
                  PG {selectedCompany.pgProfile?.merchantStatus ?? "not_applied"}
                </StatusPill>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  ["기업 ID", selectedCompany.id],
                  ["가맹점 ID", selectedCompany.pgProfile?.merchantIdMasked ?? "가맹점 ID 대기"],
                  ["상품 수", `${selectedCompany.productCount}개`],
                  ["예외 검토 상품", `${selectedCompany.pendingProductCount}개`],
                  ["수수료율", formatPercent(selectedCompany.commissionRate)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-normal text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-normal text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-normal text-blue-700">PG 키</p>
                  <h3 className="mt-1 text-lg font-normal text-slate-950">PG 키값 입력</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-950">
                    화면에는 입력 상태만 표시합니다. 운영 저장은 Functions 암호화 저장소를 통해 처리해야 합니다.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-normal text-blue-800 ring-1 ring-blue-200">
                  {maskInputValue(pgDraft.merchantId, "가맹점 ID 대기")}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {[
                  ["merchantId", "가맹점 ID", "Payup 가맹점 ID"],
                  ["authKey", "인증키", "인증키는 저장 후 다시 표시하지 않음"],
                  ["webhookSecret", "Webhook Secret", "서명 검증값"],
                  ["webhookUrl", "Webhook URL", "결제 결과 수신 URL"],
                ].map(([key, label, placeholder]) => (
                  <label key={key} className="grid gap-1.5 text-sm font-normal text-slate-800">
                    {label}
                    <input
                      value={pgDraft[key as keyof PgKeyDraft]}
                      onChange={(event) => updatePgDraft(key as keyof PgKeyDraft, event.target.value)}
                      placeholder={placeholder}
                      className="h-11 rounded-md border border-blue-100 bg-white px-3 text-sm font-normal text-slate-950 outline-none focus:border-blue-500"
                      type={key === "authKey" || key === "webhookSecret" ? "password" : "text"}
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-normal text-slate-500">상품 운영</p>
                <h3 className="mt-1 text-lg font-normal text-slate-950">상품 목록 / 노출 상태</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-normal text-slate-700">
                {companyProducts.length}개 상품
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[760px] divide-y divide-slate-100 rounded-md border border-slate-200">
                <div className="grid grid-cols-[1.6fr_120px_120px_120px_110px] bg-slate-50 px-3 py-3 text-xs font-normal text-slate-500">
                  <span>상품</span>
                  <span>노출 상태</span>
                  <span>폐쇄몰가</span>
                  <span>재고</span>
                  <span>배송</span>
                </div>
                {companyProducts.map((product) => (
                  <div key={product.id} className="grid grid-cols-[1.6fr_120px_120px_120px_110px] px-3 py-3 text-sm leading-6">
                    <div className="min-w-0">
                      <p className="truncate font-normal text-slate-950">{product.name}</p>
                      <p className="truncate text-xs font-normal text-slate-500">{product.id}</p>
                    </div>
                    <div><StatusPill status={product.status}>{product.status}</StatusPill></div>
                    <p className="font-normal text-slate-800">{formatCurrency(product.price)}</p>
                    <p className="font-normal text-slate-800">{product.stock}</p>
                    <p className="font-normal text-slate-600">
                      {product.fulfillment?.pickup ? "현장" : ""}
                      {product.fulfillment?.pickup && product.fulfillment?.delivery ? " / " : ""}
                      {product.fulfillment?.delivery ? "배송" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
