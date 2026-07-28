"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  companyAdAssetFromRecord,
  companyAdRestrictionMessage,
  isRestrictedCompanyAd,
  type CompanyAdAsset,
  type CompanyAdType,
} from "@/lib/company/companyAd";
import { createCmsId, saveCmsRecord, subscribeCmsRecords, uploadCmsFile, type CmsRecord } from "@/lib/firebase/contentRepository";
import { buildProductUrlFields } from "@/lib/storefront/productUrls";
import { formatDateTime } from "@/lib/utils/format";

function inputClass() {
  return "w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
}

function statusLabel(ad: CompanyAdAsset) {
  if (isRestrictedCompanyAd(ad)) return "노출 제재";
  if (ad.status === "live") return "노출 가능";
  if (ad.status === "paused") return "숨김";
  return "등록 검토";
}

function recordText(record: CmsRecord, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function productRecordId(record: CmsRecord) {
  return recordText(record, "product_id", record.id);
}

function productRecordTitle(record: CmsRecord) {
  return recordText(record, "title", recordText(record, "name", productRecordId(record)));
}

function productRecordCompanyId(record: CmsRecord) {
  return recordText(record, "company_id", recordText(record, "companyId"));
}

function productRecordTabletPath(record: CmsRecord) {
  const productId = productRecordId(record);
  return recordText(record, "tablet_path", recordText(record, "public_path", recordText(record, "ad_target_path", buildProductUrlFields(productId).tablet_path)));
}

function isApprovedProductRecord(record: CmsRecord) {
  const status = recordText(record, "status", "active");
  const approval = recordText(record, "product_approval_status", recordText(record, "approval_status", "approved"));
  return ["active", "approved"].includes(status) && approval === "approved";
}

function CompanyAdRestrictionNotice({ ad }: { ad: CompanyAdAsset }) {
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-950">
      <p className="text-xs font-normal tracking-[0.14em]">차단 화면</p>
      <h3 className="mt-2 text-lg font-normal">{ad.title}</h3>
      <p className="mt-2 text-sm font-normal">{companyAdRestrictionMessage}</p>
      {ad.moderationReason ? <p className="mt-2 text-sm font-normal leading-6">제재 사유: {ad.moderationReason}</p> : null}
    </div>
  );
}

export function CompanyAdManager({ companyId }: { companyId: string }) {
  const [records, setRecords] = useState<CmsRecord[]>([]);
  const [productRecords, setProductRecords] = useState<CmsRecord[]>([]);
  const [adType, setAdType] = useState<CompanyAdType>("image");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const ads = useMemo(
    () =>
      records
        .map(companyAdAssetFromRecord)
        .filter((ad) => ad.companyId === companyId)
        .sort((left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)),
    [companyId, records],
  );
  const linkableProducts = useMemo(
    () =>
      productRecords
        .filter((product) => isApprovedProductRecord(product) && productRecordCompanyId(product) === companyId)
        .sort((left, right) => productRecordTitle(left).localeCompare(productRecordTitle(right), "ko-KR")),
    [companyId, productRecords],
  );

  useEffect(() => {
    const unsubscribeAds = subscribeCmsRecords("company_ad_assets", setRecords, setMessage);
    const unsubscribeProducts = subscribeCmsRecords("products", setProductRecords, setMessage);

    return () => {
      unsubscribeAds();
      unsubscribeProducts();
    };
  }, []);

  function selectProductLink(productId: string) {
    const product = linkableProducts.find((item) => productRecordId(item) === productId);
    if (product) setLinkUrl(productRecordTabletPath(product));
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function saveAd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("광고 제목을 입력해야 합니다.");
      return;
    }

    if (!file) {
      setMessage("광고 이미지를 업로드해야 합니다.");
      return;
    }

    setSaving(true);
    setMessage("기업 광고를 등록하는 중입니다.");

    try {
      const recordId = createCmsId("company-ad");
      const upload = await uploadCmsFile(
        "company_ad_assets",
        recordId,
        file,
        { companyId },
        {
          companyId,
          adType,
          sourceChannel: "company_ad_upload",
        },
      );

      await saveCmsRecord("company_ad_assets", {
        id: recordId,
        title: title.trim(),
        body: body.trim(),
        ad_type: adType,
        company_id: companyId,
        status: "pending_review",
        asset_url: upload.url,
        asset_path: upload.path,
        link_url: linkUrl.trim(),
        moderation_status: "registered",
        moderation_reason: "",
        moderated_at: "",
        created_at: new Date().toISOString(),
        source_app: "company",
        source_channel: "company_ad_upload",
      });

      setTitle("");
      setBody("");
      setLinkUrl("");
      setFile(null);
      setAdType("image");
      setMessage("기업 광고를 등록했습니다. 최고관리자 검토 후 노출 상태가 확정됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? `기업 광고 등록에 실패했습니다. ${error.message}` : "기업 광고 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-4">
      <form onSubmit={saveAd} className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">기업 광고</p>
          <h2 className="mt-1 text-xl font-normal text-slate-950">기업 광고 등록</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            광고 유형
            <select value={adType} onChange={(event) => setAdType(event.target.value as CompanyAdType)} className={inputClass()}>
              <option value="image">이미지 광고</option>
              <option value="popup">팝업 광고</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            광고 이미지
            <input type="file" accept="image/*" onChange={handleFile} className={inputClass()} />
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            제목
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass()} />
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            링크
            <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} className={inputClass()} placeholder="/tablet/products/brands/..." />
            <select value="" onChange={(event) => selectProductLink(event.target.value)} className={inputClass()}>
              <option value="">상품 URL 선택</option>
              {linkableProducts.map((product) => {
                const productId = productRecordId(product);

                return (
                  <option key={product.id} value={productId}>
                    {productRecordTitle(product)}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800 lg:col-span-2">
            설명
            <textarea value={body} onChange={(event) => setBody(event.target.value)} className={`${inputClass()} min-h-24`} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-normal text-white disabled:opacity-50">
            광고 등록
          </button>
          {message ? <p className="rounded-md bg-slate-50 px-3 py-3 text-sm font-normal text-slate-700">{message}</p> : null}
        </div>
      </form>

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-normal text-slate-950">등록된 광고</h2>
          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-normal text-slate-600">{ads.length}개</span>
        </div>
        {ads.length ? (
          <div className="grid gap-3">
            {ads.map((ad) => (
              <article key={ad.id} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[180px_1fr]">
                <div className="overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
                  {ad.assetUrl ? <img src={ad.assetUrl} alt={ad.title} className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center text-sm font-normal text-slate-400">이미지 없음</div>}
                </div>
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-normal text-emerald-700">{ad.adType === "popup" ? "팝업 광고" : "이미지 광고"}</p>
                      <h3 className="mt-1 text-lg font-normal text-slate-950">{ad.title}</h3>
                      <p className="mt-1 text-xs font-normal text-slate-500">{ad.createdAt ? formatDateTime(ad.createdAt) : "등록일 없음"}</p>
                    </div>
                    <span className={`rounded-md px-2.5 py-1 text-xs font-normal ${isRestrictedCompanyAd(ad) ? "bg-rose-100 text-rose-800" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
                      {statusLabel(ad)}
                    </span>
                  </div>
                  {isRestrictedCompanyAd(ad) ? <CompanyAdRestrictionNotice ad={ad} /> : <p className="text-sm font-normal leading-6 text-slate-600">{ad.body || "광고 설명이 없습니다."}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-slate-50 p-8 text-center text-sm font-normal text-slate-500">등록된 기업 광고가 없습니다.</div>
        )}
      </section>
    </section>
  );
}
