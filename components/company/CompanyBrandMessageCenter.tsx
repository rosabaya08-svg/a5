"use client";

import { useEffect, useMemo, useState } from "react";
import {
  companyBrandMessageFromRecord,
  sortCompanyBrandMessagesByDate,
  type CompanyBrandMessage,
} from "@/lib/company/brandMessage";
import { saveCmsRecord, subscribeCmsRecords, type CmsRecord } from "@/lib/firebase/contentRepository";
import { readPortalSession } from "@/lib/auth/session";
import { brandIdForProductBrand, brandNameKey, productBrandName } from "@/lib/storefront/brandRouting";
import { formatDateTime } from "@/lib/utils/format";
import type { Product } from "@/types/commerce";

type BrandOption = {
  name: string;
  routeId: string;
  productCount: number;
};

function inputClass() {
  return "w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
}

function brandOptionsForProducts(products: Product[]): BrandOption[] {
  const byBrand = new Map<string, Product[]>();

  for (const product of products) {
    const brandName = productBrandName(product);
    if (!brandName.trim()) continue;
    const current = byBrand.get(brandNameKey(brandName)) ?? [];
    current.push(product);
    byBrand.set(brandNameKey(brandName), current);
  }

  return [...byBrand.values()]
    .map((items) => {
      const first = items[0];
      const name = productBrandName(first);

      return {
        name,
        routeId: brandIdForProductBrand(name, first.companyId),
        productCount: items.length,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

export function CompanyBrandMessageCenter({ companyId, products }: { companyId: string; products: Product[] }) {
  const [sessionCompanyId, setSessionCompanyId] = useState(companyId);
  const brandOptions = useMemo(() => brandOptionsForProducts(products), [products]);
  const [records, setRecords] = useState<CmsRecord[]>([]);
  const [selectedBrand, setSelectedBrand] = useState(() => brandOptions[0]?.name ?? "");
  const [replyById, setReplyById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  const effectiveCompanyId = sessionCompanyId || companyId;
  const selectedBrandValue = selectedBrand || brandOptions[0]?.name || "";
  const selectedOption = brandOptions.find((option) => brandNameKey(option.name) === brandNameKey(selectedBrandValue));
  const messages = useMemo(
    () =>
      sortCompanyBrandMessagesByDate(
        records
          .map(companyBrandMessageFromRecord)
          .filter((item) => item.companyId === effectiveCompanyId && item.brandKey === brandNameKey(selectedBrandValue)),
      ),
    [effectiveCompanyId, records, selectedBrandValue],
  );
  const pendingCount = messages.filter((item) => item.status === "new").length;

  useEffect(() => {
    const unsubscribe = subscribeCmsRecords("company_brand_messages", setRecords, setMessage);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSessionCompanyId(readPortalSession("company")?.companyId || companyId);
    });
  }, [companyId]);

  function replyValue(item: CompanyBrandMessage) {
    return replyById[item.id] ?? item.reply;
  }

  async function saveReply(item: CompanyBrandMessage, nextStatus: CompanyBrandMessage["status"]) {
    const reply = replyValue(item).trim();

    if (nextStatus === "answered" && !reply) {
      setMessage("답변 내용을 입력해야 합니다.");
      return;
    }

    setSavingId(item.id);
    setMessage("브랜드 소통 메시지를 저장하는 중입니다.");

    try {
      await saveCmsRecord("company_brand_messages", {
        id: item.id,
        company_id: item.companyId,
        brand_name: item.brandName,
        brand_key: item.brandKey,
        nickname: item.nickname,
        message: item.message,
        reply,
        status: nextStatus,
        created_at: item.createdAt,
        source_app: "company",
        source_channel: "company_brand_message_reply",
      });
      setMessage(nextStatus === "hidden" ? "고객 메시지를 숨김 처리했습니다." : "고객 메시지에 답변했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? `브랜드 소통 메시지 저장에 실패했습니다. ${error.message}` : "브랜드 소통 메시지 저장에 실패했습니다.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">고객 소통</p>
          <h2 className="mt-1 text-xl font-normal text-slate-950">브랜드 소통함</h2>
        </div>
        {selectedOption ? (
          <a href={`/tablet/products/brands/${selectedOption.routeId}/`} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
            브랜드관 보기
          </a>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="grid content-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            브랜드
            <select value={selectedBrandValue} onChange={(event) => setSelectedBrand(event.target.value)} className={inputClass()}>
              {brandOptions.map((option) => (
                <option key={option.routeId} value={option.name}>
                  {option.name} ({option.productCount})
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-md bg-white p-3 ring-1 ring-slate-200">
            <p className="text-xs font-normal text-slate-500">미답변</p>
            <p className="mt-1 text-2xl font-normal text-slate-950">{pendingCount}개</p>
          </div>
          {message ? <p className="rounded-md bg-white p-3 text-sm font-normal text-slate-700 ring-1 ring-slate-200">{message}</p> : null}
        </aside>

        <div className="grid gap-3">
          {messages.length ? (
            messages.map((item) => (
              <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-normal text-emerald-700">{item.nickname}</p>
                    <p className="mt-1 text-xs font-normal text-slate-500">{item.createdAt ? formatDateTime(item.createdAt) : "등록일 없음"}</p>
                  </div>
                  <span className="rounded-md bg-white px-2.5 py-1 text-xs font-normal text-slate-600 ring-1 ring-slate-200">{item.status}</span>
                </div>
                <p className="mt-3 whitespace-pre-line rounded-md bg-white p-3 text-sm font-normal leading-6 text-slate-700 ring-1 ring-slate-200">{item.message}</p>
                <label className="mt-3 grid gap-2 text-sm font-normal text-slate-800">
                  기업 답변
                  <textarea
                    value={replyValue(item)}
                    onChange={(event) => setReplyById((current) => ({ ...current, [item.id]: event.target.value }))}
                    className={`${inputClass()} min-h-28`}
                    placeholder="고객에게 공개될 답변을 입력합니다."
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveReply(item, "answered")}
                    disabled={savingId === item.id}
                    className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-normal text-white disabled:opacity-50"
                  >
                    답변 공개
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveReply(item, "hidden")}
                    disabled={savingId === item.id}
                    className="rounded-md border border-slate-200 px-4 py-3 text-sm font-normal text-slate-800 disabled:opacity-50"
                  >
                    숨김
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center text-sm font-normal text-slate-500">
              등록된 고객 소통 메시지가 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
