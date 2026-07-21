"use client";

import { useEffect, useMemo, useState } from "react";
import { moderateProduct, subscribeCmsRecords, type CmsRecord } from "@/lib/firebase/contentRepository";
import { buildBusinessBrandPath, buildBusinessProductPath, normalizeStorefrontBusinessNo } from "@/lib/storefront/productUrls";
import { formatCurrency } from "@/lib/utils/format";
import type { Company } from "@/types/commerce";

type AdminProductModerationPanelProps = {
  companies: Company[];
};

type ProductModerationRecord = CmsRecord & {
  company_id?: string;
  companyId?: string;
  title?: string;
  name?: string;
  category?: string;
  status?: string;
  moderation_status?: string;
  price?: number;
  closed_mall_price?: number;
  stock?: number;
  inventory?: number;
  seller_business_no?: string;
  sellerBusinessNo?: string;
  seller_business_no_normalized?: string;
  sellerBusinessNoNormalized?: string;
  company_business_no?: string;
  companyBusinessNo?: string;
  company_business_no_normalized?: string;
  companyBusinessNoNormalized?: string;
  business_registration_number?: string;
  business_registration_number_normalized?: string;
  business_brand_path?: string;
  businessBrandPath?: string;
  business_product_path?: string;
  businessProductPath?: string;
  a5mall_brand_path?: string;
  a5mall_product_path?: string;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function businessNoForRecord(record: ProductModerationRecord) {
  return normalizeStorefrontBusinessNo(
    text(
      record.sellerBusinessNoNormalized ??
        record.seller_business_no_normalized ??
        record.sellerBusinessNo ??
        record.seller_business_no ??
        record.companyBusinessNoNormalized ??
        record.company_business_no_normalized ??
        record.companyBusinessNo ??
        record.company_business_no ??
        record.business_registration_number_normalized ??
        record.business_registration_number,
    ),
  );
}

function businessBrandPathForRecord(record: ProductModerationRecord) {
  const existing = text(record.businessBrandPath ?? record.business_brand_path ?? record.a5mall_brand_path);
  if (existing) return existing;
  const businessNo = businessNoForRecord(record);
  return businessNo ? buildBusinessBrandPath(businessNo) : "";
}

function businessProductPathForRecord(record: ProductModerationRecord) {
  const existing = text(record.businessProductPath ?? record.business_product_path ?? record.a5mall_product_path);
  if (existing) return existing;
  const businessNo = businessNoForRecord(record);
  return businessNo ? buildBusinessProductPath(businessNo, record.id) : "";
}

function statusLabel(status: string) {
  if (status === "active" || status === "approved") return "판매중";
  if (status === "suspended" || status === "paused") return "판매중지";
  if (status === "draft") return "임시 저장";
  if (status === "pending_approval") return "검토 대기";
  if (status === "rejected") return "반려";
  return status || "미지정";
}

function statusClass(status: string) {
  if (status === "active" || status === "approved") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "suspended" || status === "paused") return "bg-rose-50 text-rose-800 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function AdminProductModerationPanel({ companies }: AdminProductModerationPanelProps) {
  const [records, setRecords] = useState<ProductModerationRecord[]>([]);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"all" | "live" | "stopped">("all");
  const [busyProductId, setBusyProductId] = useState("");
  const [message, setMessage] = useState("");
  const companyNameById = useMemo(() => new Map(companies.map((company) => [company.id, company.name])), [companies]);

  useEffect(() => {
    return subscribeCmsRecords(
      "products",
      (nextRecords) => setRecords(nextRecords as ProductModerationRecord[]),
      (errorMessage) => setMessage(errorMessage),
    );
  }, []);

  const filteredRecords = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return records
      .filter((record) => {
        const productStatus = text(record.status, "active");
        if (status === "live" && !["active", "approved"].includes(productStatus)) return false;
        if (status === "stopped" && !["suspended", "paused"].includes(productStatus)) return false;
        if (!keyword) return true;
        return [
          record.id,
          record.title,
          record.name,
          record.category,
          record.company_id,
          record.companyId,
          businessNoForRecord(record),
          businessBrandPathForRecord(record),
          businessProductPathForRecord(record),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .sort((left, right) => right.id.localeCompare(left.id));
  }, [query, records, status]);

  async function onModerate(productId: string, action: "suspend" | "restore") {
    setBusyProductId(productId);
    setMessage(action === "suspend" ? "상품 판매중지를 처리하고 있습니다." : "상품 판매 재개를 처리하고 있습니다.");

    try {
      await moderateProduct(productId, action, reason);
      setMessage(action === "suspend" ? "상품 판매중지를 적용했습니다." : "상품 판매 재개를 적용했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "상품 상태 변경에 실패했습니다.");
    } finally {
      setBusyProductId("");
    }
  }

  async function copyProductPath(path: string, label: string) {
    if (!path) {
      setMessage(`${label} URL이 아직 없습니다.`);
      return;
    }

    const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();

    try {
      await window.navigator.clipboard.writeText(url);
      setMessage(`${label} URL 복사 완료: ${url}`);
    } catch {
      setMessage(url);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-rose-600">상품 운영</p>
          <h2 className="mt-1 text-xl font-normal text-slate-950">판매 상품 상태 관리</h2>
          <p className="mt-2 text-sm font-normal leading-6 text-slate-500">
            기업이 등록한 상품을 확인하고, 문제 상품은 판매중지하거나 다시 판매중으로 전환합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-normal">
          <span className="rounded-md bg-slate-100 px-3 py-2 text-slate-700">전체 {records.length}</span>
          <span className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">
            판매중 {records.filter((item) => ["active", "approved"].includes(text(item.status, "active"))).length}
          </span>
          <span className="rounded-md bg-rose-50 px-3 py-2 text-rose-800">
            판매중지 {records.filter((item) => ["suspended", "paused"].includes(text(item.status))).length}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_minmax(240px,1fr)]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-rose-500"
          placeholder="상품명, 회사, 카테고리, 상품 ID 검색"
        />
        <select value={status} onChange={(event) => setStatus(event.target.value as "all" | "live" | "stopped")} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal">
          <option value="all">전체 상태</option>
          <option value="live">판매중</option>
          <option value="stopped">판매중지</option>
        </select>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal outline-none focus:border-rose-500"
          placeholder="판매중지 또는 복구 사유"
        />
      </div>

      {message ? <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-normal text-slate-600">{message}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-normal text-slate-500">
            <tr>
              {["상품", "입점사", "카테고리", "상태", "가격", "재고", "관리"].map((header) => (
                <th key={header} className="px-4 py-3">{header}</th>
              ))}
              <th className="px-4 py-3">사업자번호</th>
              <th className="px-4 py-3">브랜드관 URL</th>
              <th className="px-4 py-3">상품 URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.map((record) => {
              const productStatus = text(record.status, "active");
              const companyId = text(record.company_id ?? record.companyId);
              const stopped = ["suspended", "paused"].includes(productStatus);
              const price = numberValue(record.closed_mall_price, numberValue(record.price));
              const stock = numberValue(record.inventory, numberValue(record.stock));
              const businessNo = businessNoForRecord(record);
              const brandPath = businessBrandPathForRecord(record);
              const productPath = businessProductPathForRecord(record);

              return (
                <tr key={record.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-normal text-slate-950">{text(record.title ?? record.name, record.id)}</p>
                    <p className="mt-1 text-xs font-normal text-slate-500">{record.id}</p>
                  </td>
                  <td className="px-4 py-3 font-normal text-slate-700">{companyNameById.get(companyId) ?? companyId}</td>
                  <td className="px-4 py-3 font-normal text-slate-700">{text(record.category, "미지정")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-normal ring-1 ${statusClass(productStatus)}`}>
                      {statusLabel(productStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-normal text-slate-950">{formatCurrency(price)}</td>
                  <td className="px-4 py-3 font-normal text-slate-950">{stock}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void onModerate(record.id, stopped ? "restore" : "suspend")}
                      disabled={busyProductId === record.id}
                      className={`rounded-md px-3 py-2 text-xs font-normal text-white disabled:cursor-not-allowed disabled:opacity-50 ${stopped ? "bg-emerald-700" : "bg-rose-600"}`}
                    >
                      {stopped ? "판매 재개" : "판매중지"}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{businessNo || "-"}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => void copyProductPath(brandPath, "브랜드관")} className="text-xs text-blue-700">
                      복사
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => void copyProductPath(productPath, "상품")} className="text-xs text-rose-700">
                      복사
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-sm font-normal text-slate-500">조건에 맞는 상품이 없습니다.</div>
        ) : null}
      </div>
    </section>
  );
}
