"use client";

import { useState } from "react";
import {
  buildProductDraftCmsRecord,
  COMPANY_PRODUCT_DRAFT_STORAGE_KEY,
  normalizeDraft,
  type ProductDraft,
} from "@/lib/company/productDraft";
import { saveCmsRecord } from "@/lib/firebase/contentRepository";
import { formatCurrency } from "@/lib/utils/format";

type ReviewState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

function readLatestDraft() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COMPANY_PRODUCT_DRAFT_STORAGE_KEY);
    return raw ? normalizeDraft(JSON.parse(raw) as ProductDraft) : null;
  } catch {
    return null;
  }
}

export function AdminProductDraftRequestsPanel() {
  const [draft] = useState<ProductDraft | null>(() => readLatestDraft());
  const [reason, setReason] = useState("");
  const [reviewState, setReviewState] = useState<ReviewState>({ status: "idle", message: "" });

  if (!draft) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black text-slate-950">기업 상품 등록 요청</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">브라우저에 저장된 기업 상품 draft가 없습니다.</p>
      </section>
    );
  }

  async function review(status: "approved" | "rejected" | "draft") {
    if (!draft) return;

    setReviewState({ status: "saving", message: "검수 결과를 저장하는 중입니다." });

    try {
      await saveCmsRecord("product_detail_pages", {
        ...buildProductDraftCmsRecord(draft, draft.status === "pending_approval" ? "pending_approval" : "draft"),
        status,
        approval_status: status,
        source_app: "admin",
        reviewed_at: new Date().toISOString(),
        review_memo: reason,
      });
      setReviewState({
        status: "saved",
        message: status === "approved" ? "상품 승인 기록을 저장했습니다." : status === "rejected" ? "상품 반려 기록을 저장했습니다." : "보류 상태로 저장했습니다.",
      });
    } catch {
      setReviewState({ status: "error", message: "운영 저장소 기록에 실패했습니다. 권한 또는 네트워크 상태를 확인해 주세요." });
    }
  }

  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">approval request</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">기업 상품 등록 요청</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            기업 상품등록에서 저장/승인 요청된 draft를 최고관리자가 검수하는 영역입니다.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
          {draft.status === "pending_approval" ? "승인 요청" : "임시 저장"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {[
          ["상품명", draft.productName || "미입력"],
          ["입점사", draft.companyId],
          ["분류", `${draft.categoryLabel} / ${draft.subcategory}`],
          ["폐쇄몰 기본가", formatCurrency(draft.pricing.closedMallPrice)],
          ["옵션 SKU", `${draft.variants.length}개`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-white p-3">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <label className="mt-4 grid gap-2 text-sm font-black text-slate-800">
        검수 메모 / 반려 사유
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-24 rounded-md border border-emerald-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-emerald-500"
          placeholder="승인, 보류, 반려 사유를 남깁니다."
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm font-black ${reviewState.status === "error" ? "text-red-700" : reviewState.status === "saved" ? "text-emerald-700" : "text-slate-600"}`}>
          {reviewState.message || "승인/보류/반려 결과를 product_detail_pages 문서에 기록합니다."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => review("approved")} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
            승인
          </button>
          <button type="button" onClick={() => review("draft")} className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900">
            보류
          </button>
          <button type="button" onClick={() => review("rejected")} className="rounded-md bg-red-50 px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-200">
            반려
          </button>
        </div>
      </div>
    </section>
  );
}
