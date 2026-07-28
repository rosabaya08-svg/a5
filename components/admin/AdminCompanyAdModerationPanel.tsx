"use client";

import { useEffect, useMemo, useState } from "react";
import {
  companyAdAssetFromRecord,
  companyAdRestrictionMessage,
  isRestrictedCompanyAd,
  type CompanyAdAsset,
} from "@/lib/company/companyAd";
import { saveCmsRecord, subscribeCmsRecords, type CmsRecord } from "@/lib/firebase/contentRepository";
import { formatDateTime } from "@/lib/utils/format";

function inputClass() {
  return "w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
}

function moderationLabel(ad: CompanyAdAsset) {
  if (isRestrictedCompanyAd(ad)) return "노출 제재";
  if (ad.moderationStatus === "approved" || ad.status === "live") return "승인";
  return "등록";
}

export function AdminCompanyAdModerationPanel() {
  const [records, setRecords] = useState<CmsRecord[]>([]);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  const ads = useMemo(
    () =>
      records
        .map(companyAdAssetFromRecord)
        .sort((left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)),
    [records],
  );

  useEffect(() => {
    const unsubscribe = subscribeCmsRecords("company_ad_assets", setRecords, setMessage);
    return () => unsubscribe();
  }, []);

  function reasonFor(ad: CompanyAdAsset) {
    return reasonById[ad.id] ?? ad.moderationReason;
  }

  async function saveModeration(ad: CompanyAdAsset, next: "approved" | "restricted") {
    const reason = reasonFor(ad).trim();

    if (next === "restricted" && !reason) {
      setMessage("노출 제재 사유를 입력해야 합니다.");
      return;
    }

    setSavingId(ad.id);
    setMessage("기업 광고 제재 상태를 저장하는 중입니다.");

    try {
      await saveCmsRecord("company_ad_assets", {
        id: ad.id,
        title: ad.title,
        body: ad.body,
        ad_type: ad.adType,
        company_id: ad.companyId,
        status: next === "restricted" ? "restricted" : "live",
        asset_url: ad.assetUrl,
        asset_path: ad.assetPath ?? "",
        link_url: ad.linkUrl,
        moderation_status: next,
        moderation_reason: next === "restricted" ? reason : "",
        moderated_at: new Date().toISOString(),
        created_at: ad.createdAt,
        source_app: "admin",
        source_channel: "admin_company_ad_moderation",
      });
      setMessage(next === "restricted" ? "기업 광고를 노출 제재했습니다." : "기업 광고 노출을 승인했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? `기업 광고 제재 저장에 실패했습니다. ${error.message}` : "기업 광고 제재 저장에 실패했습니다.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-blue-700">기업 광고 검수</p>
          <h2 className="mt-1 text-xl font-normal text-slate-950">기업 광고 노출 제재</h2>
        </div>
        <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-normal text-slate-600">{ads.length}개 등록</span>
      </div>
      {message ? <p className="rounded-md bg-slate-50 p-3 text-sm font-normal text-slate-700">{message}</p> : null}
      <div className="grid gap-3">
        {ads.length ? (
          ads.map((ad) => (
            <article key={ad.id} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[190px_1fr_320px]">
              <div className="overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
                {ad.assetUrl ? <img src={ad.assetUrl} alt={ad.title} className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center text-sm font-normal text-slate-400">이미지 없음</div>}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-normal ${isRestrictedCompanyAd(ad) ? "bg-rose-100 text-rose-800" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
                    {moderationLabel(ad)}
                  </span>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-normal text-slate-600 ring-1 ring-slate-200">
                    {ad.adType === "popup" ? "팝업 광고" : "이미지 광고"}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-normal text-slate-950">{ad.title}</h3>
                <p className="mt-1 text-xs font-normal text-slate-500">{ad.companyId} / {ad.createdAt ? formatDateTime(ad.createdAt) : "등록일 없음"}</p>
                <p className="mt-3 text-sm font-normal leading-6 text-slate-600">{ad.body || "광고 설명이 없습니다."}</p>
                {isRestrictedCompanyAd(ad) ? (
                  <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-normal text-rose-900">
                    {companyAdRestrictionMessage}
                  </div>
                ) : null}
              </div>
              <div className="grid content-start gap-3">
                <label className="grid gap-2 text-sm font-normal text-slate-800">
                  제재 사유
                  <textarea
                    value={reasonFor(ad)}
                    onChange={(event) => setReasonById((current) => ({ ...current, [ad.id]: event.target.value }))}
                    className={`${inputClass()} min-h-28`}
                    placeholder="제재 사유를 입력합니다."
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveModeration(ad, "restricted")}
                    disabled={savingId === ad.id}
                    className="rounded-md bg-rose-700 px-4 py-3 text-sm font-normal text-white disabled:opacity-50"
                  >
                    노출 제재
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveModeration(ad, "approved")}
                    disabled={savingId === ad.id}
                    className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white disabled:opacity-50"
                  >
                    노출 승인
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-md bg-slate-50 p-8 text-center text-sm font-normal text-slate-500">등록된 기업 광고가 없습니다.</div>
        )}
      </div>
    </section>
  );
}
