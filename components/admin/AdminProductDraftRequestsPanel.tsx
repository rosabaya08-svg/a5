"use client";

import { useEffect, useMemo, useState } from "react";
import {
  productDraftFromCmsRecord,
  type ProductDraft,
} from "@/lib/company/productDraft";
import { requestAdminProductReview } from "@/lib/company/productReviewClient";
import { subscribeCmsRecords, type CmsRecord } from "@/lib/firebase/contentRepository";
import { formatCurrency } from "@/lib/utils/format";

type ReviewState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type ApprovalItem = {
  id: string;
  kind: "new_product" | "product_edit";
  status: "draft" | "pending_approval";
  updatedAt: string;
  productName: string;
  companyId: string;
  category: string;
  price: number;
  optionSummary: string;
  linkedDocuments?: ProductDraft["linkedSignupDocuments"];
  changes?: Array<{ label: string; before: string; after: string }>;
};

const editFieldLabels: Record<string, string> = {
  name: "상품명",
  category: "카테고리",
  price: "폐쇄몰 가격",
  stock: "재고",
  external_product_code: "외부 상품코드",
  status: "상태",
  summary: "상품 요약",
};

function stringValue(record: CmsRecord | Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function numberValue(record: CmsRecord | Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function recordValue(record: CmsRecord | Record<string, unknown>, key: string) {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function arrayValue(record: CmsRecord | Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function changedFieldNames(record: CmsRecord) {
  const raw = record.changed_fields;

  if (Array.isArray(raw)) {
    return new Set(raw.map((item) => String(item)));
  }

  if (raw && typeof raw === "object") {
    return new Set(
      Object.entries(raw as Record<string, unknown>)
        .filter(([, value]) => value === true)
        .map(([key]) => key),
    );
  }

  return new Set<string>();
}

function isReviewWaitingStatus(record: CmsRecord) {
  const status = stringValue(record, "status") || stringValue(record, "approval_status");
  return status === "pending_approval" || status === "draft";
}

function isProductDraftRequestRecord(record: CmsRecord) {
  const sourceApp = stringValue(record, "source_app");
  const companyId = stringValue(record, "company_id") || stringValue(record, "companyId");
  return Boolean(companyId) && sourceApp === "company" && isReviewWaitingStatus(record);
}

function isProductEditRequestRecord(record: CmsRecord) {
  const sourceChannel = stringValue(record, "source_channel");
  const companyId = stringValue(record, "company_id") || stringValue(record, "companyId");
  const productId = stringValue(record, "product_id") || stringValue(record, "productId");
  return Boolean(companyId && productId) && sourceChannel === "company_product_edit" && isReviewWaitingStatus(record);
}

function draftToApprovalItem(draft: ProductDraft): ApprovalItem {
  return {
    id: draft.id,
    kind: "new_product",
    status: draft.status,
    updatedAt: draft.updatedAt,
    productName: draft.productName || "상품명 미입력",
    companyId: draft.companyId,
    category: [draft.categoryLabel, draft.subcategory].filter(Boolean).join(" / ") || "분류 미입력",
    price: draft.pricing.closedMallPrice,
    optionSummary: `${draft.variants.length}개 SKU`,
    linkedDocuments: draft.linkedSignupDocuments,
  };
}

function editChanges(record: CmsRecord) {
  const requested = recordValue(record, "requested");
  const original = recordValue(record, "original");
  const changed = changedFieldNames(record);
  const changes = Object.entries(editFieldLabels)
    .filter(([key]) => changed.has(key) || requested[key] !== undefined)
    .map(([key, label]) => ({
      label,
      before: String(original[key] ?? "-"),
      after: key === "price" || key === "stock" ? numberValue(requested, key).toLocaleString("ko-KR") : String(requested[key] ?? "-"),
    }));
  const detailRecord = recordValue(requested, "detail_record");
  const optionRecords = arrayValue(requested, "option_records");
  const suspendedOptionRecords = arrayValue(requested, "suspended_option_records");
  const gallery = arrayValue(requested, "gallery");
  const originalOptionIds = arrayValue(original, "option_ids");

  if (changed.has("product_detail_pages") || Object.keys(detailRecord).length > 0) {
    changes.push({
      label: "상세페이지",
      before: "-",
      after: Object.keys(detailRecord).length > 0 ? "승인 후 상세페이지 반영" : "변경 요청",
    });
  }

  if (changed.has("product_options") || optionRecords.length > 0 || suspendedOptionRecords.length > 0) {
    changes.push({
      label: "옵션/재고",
      before: `${originalOptionIds.length}개`,
      after: `${optionRecords.length}개 활성 / ${suspendedOptionRecords.length}개 중지`,
    });
  }

  if (changed.has("media") || gallery.length > 0) {
    changes.push({
      label: "이미지/미디어",
      before: "-",
      after: `${gallery.length}개 파일/URL`,
    });
  }

  return changes;
}

function editRequestToApprovalItem(record: CmsRecord): ApprovalItem {
  const requested = recordValue(record, "requested");
  const status = stringValue(record, "status") === "draft" ? "draft" : "pending_approval";
  const changes = editChanges(record);

  return {
    id: record.id,
    kind: "product_edit",
    status,
    updatedAt: stringValue(record, "requested_at") || stringValue(record, "updated_at") || "",
    productName: stringValue(requested, "name") || stringValue(record, "title") || stringValue(record, "product_id") || "수정 상품",
    companyId: stringValue(record, "company_id") || stringValue(record, "companyId"),
    category: stringValue(requested, "category") || "기존 카테고리 유지",
    price: numberValue(requested, "price"),
    optionSummary: changes.length ? `${changes.length}개 변경` : "변경 항목 확인 필요",
    changes,
  };
}

function sortApprovalItems(left: ApprovalItem, right: ApprovalItem) {
  if (left.status !== right.status) return left.status === "pending_approval" ? -1 : 1;
  return right.updatedAt.localeCompare(left.updatedAt);
}

export function AdminProductDraftRequestsPanel() {
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [editRequests, setEditRequests] = useState<CmsRecord[]>([]);
  const [reason, setReason] = useState("");
  const [reviewState, setReviewState] = useState<ReviewState>({ status: "idle", message: "" });
  const [readState, setReadState] = useState<ReviewState>({ status: "idle", message: "" });
  const reviewItems = useMemo(
    () => [...drafts.map(draftToApprovalItem), ...editRequests.map(editRequestToApprovalItem)].sort(sortApprovalItems),
    [drafts, editRequests],
  );
  const item = reviewItems[0] ?? null;

  useEffect(() => {
    const unsubscribeDrafts = subscribeCmsRecords(
      "product_detail_pages",
      (records) => {
        setDrafts(
          records
            .filter(isProductDraftRequestRecord)
            .map(productDraftFromCmsRecord)
            .filter((next): next is ProductDraft => Boolean(next)),
        );
        setReadState({ status: "saved", message: "" });
      },
      (message) => setReadState({ status: "error", message }),
    );
    const unsubscribeEdits = subscribeCmsRecords(
      "company_product_edit_requests",
      (records) => {
        setEditRequests(records.filter(isProductEditRequestRecord));
        setReadState({ status: "saved", message: "" });
      },
      (message) => setReadState({ status: "error", message }),
    );

    return () => {
      unsubscribeDrafts();
      unsubscribeEdits();
    };
  }, []);

  async function review(status: "approved" | "rejected" | "draft") {
    if (!item) return;

    setReviewState({ status: "saving", message: "검수 결과를 저장하는 중입니다." });

    try {
      await requestAdminProductReview({ draftId: item.id, status, reviewMemo: reason });

      if (item.kind === "new_product") {
        setDrafts((current) =>
          status === "draft"
            ? current.map((draft) => draft.id === item.id ? { ...draft, status: "draft" } : draft)
            : current.filter((draft) => draft.id !== item.id),
        );
      } else {
        setEditRequests((current) =>
          status === "draft"
            ? current.map((request) => request.id === item.id ? { ...request, status: "draft", approval_status: "draft" } : request)
            : current.filter((request) => request.id !== item.id),
        );
      }

      setReason("");
      setReviewState({
        status: "saved",
        message:
          status === "approved"
            ? item.kind === "product_edit"
              ? "상품 수정 요청을 승인하고 폐쇄몰 상품에 반영했습니다."
              : "상품 승인 기록을 저장하고 폐쇄몰 상품에 반영했습니다."
            : status === "rejected"
              ? "상품 요청을 반려했습니다."
              : "상품 요청을 보류 상태로 저장했습니다.",
      });
    } catch (error) {
      setReviewState({
        status: "error",
        message: error instanceof Error ? error.message : "운영 저장소 기록에 실패했습니다. 권한 또는 네트워크 상태를 확인해 주세요.",
      });
    }
  }

  if (!item) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-normal text-slate-950">기업 상품 승인 요청</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">신규 상품 등록 또는 기존 상품 수정 승인 요청이 없습니다.</p>
        {readState.status === "error" ? (
          <p className="mt-2 rounded-md bg-red-50 p-3 text-xs font-normal text-red-700">{readState.message}</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">승인 요청</p>
          <h2 className="mt-1 text-lg font-normal text-slate-950">
            {item.kind === "product_edit" ? "등록 상품 수정 승인" : "기업 상품 등록 승인"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            승인하면 실제 폐쇄몰 카탈로그의 products/product_options에 반영됩니다. 반려 또는 보류는 live 상품을 수정하지 않습니다.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-normal text-emerald-800 ring-1 ring-emerald-200">
          {item.status === "pending_approval" ? "승인 요청" : "임시 저장"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {[
          ["상품명", item.productName],
          ["입점사", item.companyId],
          ["분류", item.category],
          ["폐쇄몰 가격", item.price ? formatCurrency(item.price) : "기존 가격 유지"],
          ["요청 구분", item.kind === "product_edit" ? item.optionSummary : item.optionSummary],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-white p-3">
            <p className="text-xs font-normal text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-normal text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {item.kind === "product_edit" ? (
        <div className="mt-4 rounded-md bg-white p-3 ring-1 ring-emerald-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-normal text-slate-950">수정 요청 변경 항목</h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-normal text-emerald-800 ring-1 ring-emerald-200">
              {item.changes?.length ?? 0}건
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {item.changes?.length ? (
              item.changes.map((change) => (
                <div key={change.label} className="grid gap-1 rounded-md bg-slate-50 p-2 text-xs font-normal text-slate-600 md:grid-cols-[120px_1fr_1fr]">
                  <p className="font-normal text-slate-950">{change.label}</p>
                  <p>기존: {change.before}</p>
                  <p>변경: {change.after}</p>
                </div>
              ))
            ) : (
              <p className="text-xs font-normal text-slate-500">변경 항목을 읽지 못했습니다. 반려 후 기업관리자에서 다시 요청해야 합니다.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-md bg-white p-3 ring-1 ring-emerald-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-normal text-slate-950">회원가입 연동 서류</h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-normal text-emerald-800 ring-1 ring-emerald-200">
              {item.linkedDocuments?.length ?? 0}건
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {item.linkedDocuments?.length ? (
              item.linkedDocuments.map((document) => (
                <div key={document.id} className="grid gap-1 rounded-md bg-slate-50 p-2 text-xs font-normal text-slate-600">
                  <p className="font-normal text-slate-950">{document.documentLabel ?? "회원가입 서류"} / {document.fileName}</p>
                  <p className="break-all">{document.storagePath}</p>
                </div>
              ))
            ) : (
              <p className="text-xs font-normal text-slate-500">연동된 회원가입 서류가 없습니다.</p>
            )}
          </div>
        </div>
      )}

      <label className="mt-4 grid gap-2 text-sm font-normal text-slate-800">
        검수 메모 / 반려 사유
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-24 rounded-md border border-emerald-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-emerald-500"
          placeholder="승인, 보류, 반려 사유를 남깁니다."
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm font-normal ${reviewState.status === "error" ? "text-red-700" : reviewState.status === "saved" ? "text-emerald-700" : "text-slate-600"}`}>
          {reviewState.message || "승인/보류/반려 결과를 운영 Firestore에 기록합니다."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void review("approved")} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white">
            승인
          </button>
          <button type="button" onClick={() => void review("draft")} className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900">
            보류
          </button>
          <button type="button" onClick={() => void review("rejected")} className="rounded-md bg-red-50 px-4 py-3 text-sm font-normal text-red-700 ring-1 ring-red-200">
            반려
          </button>
        </div>
      </div>
    </section>
  );
}
