"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  companyBrandEventNoticeFromRecord,
  sortCompanyBrandEventNoticesByDate,
  type CompanyBrandEventNotice,
} from "@/lib/company/brandEventNotice";
import { createCmsId, saveCmsRecord, subscribeCmsRecords, type CmsRecord } from "@/lib/firebase/contentRepository";
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

function blankCreatedAt() {
  return new Date().toISOString();
}

export function CompanyBrandEventBoard({ companyId, products }: { companyId: string; products: Product[] }) {
  const brandOptions = useMemo(() => brandOptionsForProducts(products), [products]);
  const [records, setRecords] = useState<CmsRecord[]>([]);
  const [selectedBrand, setSelectedBrand] = useState(() => brandOptions[0]?.name ?? "");
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [status, setStatus] = useState<"live" | "paused" | "draft">("live");
  const [createdAt, setCreatedAt] = useState(blankCreatedAt);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedBrandValue = selectedBrand || brandOptions[0]?.name || "";
  const selectedOption = brandOptions.find((option) => brandNameKey(option.name) === brandNameKey(selectedBrandValue));
  const notices = useMemo(
    () =>
      sortCompanyBrandEventNoticesByDate(
        records
          .map(companyBrandEventNoticeFromRecord)
          .filter((notice) => notice.companyId === companyId && notice.brandKey === brandNameKey(selectedBrandValue)),
      ),
    [companyId, records, selectedBrandValue],
  );

  useEffect(() => {
    const unsubscribe = subscribeCmsRecords("company_brand_events", setRecords, setMessage);
    return () => unsubscribe();
  }, []);

  function resetForm() {
    setEditingId("");
    setTitle("");
    setBody("");
    setCtaLabel("");
    setCtaHref("");
    setPopupEnabled(false);
    setStatus("live");
    setCreatedAt(blankCreatedAt());
  }

  function editNotice(notice: CompanyBrandEventNotice) {
    setEditingId(notice.id);
    setTitle(notice.title);
    setBody(notice.body);
    setCtaLabel(notice.ctaLabel);
    setCtaHref(notice.ctaHref);
    setPopupEnabled(notice.popupEnabled);
    setStatus(notice.status);
    setCreatedAt(notice.createdAt || blankCreatedAt());
  }

  async function saveNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBrandValue.trim()) {
      setMessage("브랜드를 선택해야 합니다.");
      return;
    }

    if (!title.trim()) {
      setMessage("게시글 제목을 입력해야 합니다.");
      return;
    }

    if (!body.trim()) {
      setMessage("게시글 내용을 입력해야 합니다.");
      return;
    }

    setSaving(true);
    setMessage("이벤트 안내 게시글을 저장하는 중입니다.");

    try {
      const recordId = editingId || createCmsId("brand-event");
      const nextCreatedAt = editingId ? createdAt : blankCreatedAt();

      await saveCmsRecord("company_brand_events", {
        id: recordId,
        title: title.trim(),
        body: body.trim(),
        cta_label: ctaLabel.trim(),
        cta_href: ctaHref.trim(),
        popup_enabled: popupEnabled,
        brand_name: selectedBrandValue,
        brand_key: brandNameKey(selectedBrandValue),
        company_id: companyId,
        status,
        created_at: nextCreatedAt,
        href: selectedOption ? `/tablet/products/brands/${selectedOption.routeId}/` : "",
        source_app: "company",
        source_channel: "company_brand_event_board",
      });

      setMessage(editingId ? "이벤트 안내 게시글을 수정했습니다." : "이벤트 안내 게시글을 등록했습니다.");
      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? `이벤트 안내 게시글 저장에 실패했습니다. ${error.message}` : "이벤트 안내 게시글 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">이벤트 게시판</p>
          <h2 className="mt-1 text-xl font-normal text-slate-950">이벤트 안내 게시판</h2>
        </div>
        {selectedOption ? (
          <a href={`/tablet/products/brands/${selectedOption.routeId}/`} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
            브랜드관 보기
          </a>
        ) : null}
      </div>

      <form onSubmit={saveNotice} className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            브랜드
            <select value={selectedBrandValue} onChange={(event) => setSelectedBrand(event.target.value)} className={inputClass()}>
              {brandOptions.map((option) => (
                <option key={option.routeId} value={option.name}>
                  {option.name} ({option.productCount}개 상품)
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-normal text-slate-800">
            제목
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass()} placeholder="예: 이번 주 조리원 전용 행사 안내" />
          </label>

          <label className="grid gap-2 text-sm font-normal text-slate-800">
            내용
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className={`${inputClass()} min-h-40`}
              placeholder="행사 내용, 기간, 혜택, 유의사항, 브랜드 공지 등 기업이 자유롭게 작성합니다."
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-normal text-slate-800">
              버튼 문구
              <input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} className={inputClass()} placeholder="예: 행사 상품 보기" />
            </label>
            <label className="grid gap-2 text-sm font-normal text-slate-800">
              버튼 링크
              <input value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} className={inputClass()} placeholder="/tablet/products/brands/..." />
            </label>
          </div>

          <div className="grid gap-3 rounded-md bg-slate-50 p-3 ring-1 ring-slate-200 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-normal text-slate-800">
              <input type="checkbox" checked={popupEnabled} onChange={(event) => setPopupEnabled(event.target.checked)} className="h-5 w-5 accent-emerald-700" />
              브랜드관 입장 팝업으로 노출
            </label>
            <label className="grid gap-2 text-sm font-normal text-slate-800">
              상태
              <select value={status} onChange={(event) => setStatus(event.target.value as "live" | "paused" | "draft")} className={inputClass()}>
                <option value="live">노출</option>
                <option value="paused">숨김</option>
                <option value="draft">임시저장</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || !brandOptions.length}
              className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-normal text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingId ? "게시글 수정" : "게시글 등록"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-normal text-slate-800">
              새 글 작성
            </button>
            {message ? <p className="rounded-md bg-slate-50 px-3 py-3 text-sm font-normal text-slate-700">{message}</p> : null}
          </div>
        </div>

        <aside className="grid content-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div>
            <p className="text-xs font-normal text-slate-500">등록일 최신순</p>
            <p className="mt-1 text-2xl font-normal text-slate-950">{notices.length}개</p>
          </div>
          <div className="grid max-h-[620px] gap-3 overflow-auto pr-1">
            {notices.length ? (
              notices.map((notice) => (
                <article key={notice.id} className="rounded-md bg-white p-3 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-normal text-slate-600">
                      {notice.popupEnabled ? "팝업 노출" : "게시판"}
                    </span>
                    <span className="text-[11px] font-normal text-slate-500">{formatDateTime(notice.createdAt)}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-normal text-slate-950">{notice.title}</h3>
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs font-normal leading-5 text-slate-600">{notice.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => editNotice(notice)} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white">
                      수정
                    </button>
                    <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-normal text-slate-600">{notice.status}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-md bg-white p-4 text-center text-sm font-normal text-slate-500 ring-1 ring-slate-200">
                등록된 이벤트 안내 게시글이 없습니다.
              </div>
            )}
          </div>
        </aside>
      </form>
    </section>
  );
}
