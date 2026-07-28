"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { getFirebaseAuthClient, getFirebaseDb } from "@/lib/firebase/client";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type CancelRequestAction = "approve_pg_cancel" | "approve_manual" | "reject";

type CancelRequestRecord = {
  id: string;
  orderNo: string;
  companyId: string;
  requestedBy: string;
  status: string;
  amount: number;
  reason: string;
  providerMessage: string;
  createdAt: string;
  reviewedAt: string;
  reviewMemo: string;
  pgCancelCalled: boolean;
};

type ActionState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type ReviewResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  providerMessage?: string;
  error?: {
    message?: string;
  };
};

const finalStatuses = new Set(["pg_cancelled", "approved_manual_review", "rejected"]);

const statusLabels: Record<string, string> = {
  manual_review_required: "검토 필요",
  pg_cancel_blocked: "PG 취소 보류",
  pg_cancel_failed: "PG 취소 실패",
  pg_cancelled: "PG 취소 완료",
  approved_manual_review: "수동 처리 승인",
  rejected: "반려",
};

function text(value: unknown, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDate(value: unknown) {
  if (typeof value === "string" && value) return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const timestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

function mapCancelRequest(id: string, data: DocumentData): CancelRequestRecord {
  return {
    id,
    orderNo: text(data.order_no ?? data.orderNo, "-"),
    companyId: text(data.company_id ?? data.companyId, "-"),
    requestedBy: text(data.requested_by ?? data.requestedBy, "-"),
    status: text(data.status, "manual_review_required"),
    amount: numberValue(data.amount),
    reason: text(data.reason, "-"),
    providerMessage: text(data.provider_message ?? data.providerMessage ?? data.provider_block_reason),
    createdAt: isoDate(data.created_at ?? data.createdAt),
    reviewedAt: text(data.reviewed_at ?? data.reviewedAt),
    reviewMemo: text(data.review_memo ?? data.reviewMemo),
    pgCancelCalled: data.pg_cancel_called === true,
  };
}

function statusTone(status: string) {
  if (status === "pg_cancelled" || status === "approved_manual_review") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "rejected" || status === "pg_cancel_failed") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "pg_cancel_blocked") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-blue-50 text-blue-800 ring-blue-200";
}

export function AdminCancelRequestsPanel() {
  const [requests, setRequests] = useState<CancelRequestRecord[]>([]);
  const [readState, setReadState] = useState<ActionState>({ status: "idle", message: "취소/환불 요청을 불러오는 중입니다." });
  const [memoById, setMemoById] = useState<Record<string, string>>({});
  const [actionStateById, setActionStateById] = useState<Record<string, ActionState>>({});
  const paymentEndpoints = useMemo(() => getPaymentEndpointReadiness(), []);

  useEffect(() => {
    const db = getFirebaseDb();
    let unsubscribe: Unsubscribe = () => undefined;

    if (!db) {
      setReadState({ status: "error", message: "Firebase 설정이 없어 취소/환불 요청을 불러올 수 없습니다." });
      return () => unsubscribe();
    }

    unsubscribe = onSnapshot(
      query(collection(db, "cancel_requests")),
      (snapshot) => {
        const nextRequests = snapshot.docs
          .map((doc) => mapCancelRequest(doc.id, doc.data()))
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        setRequests(nextRequests);
        setReadState({ status: "saved", message: "취소/환불 요청을 실시간으로 수신 중입니다." });
      },
      (error) => setReadState({ status: "error", message: `cancel_requests 읽기 실패: ${error.message}` }),
    );

    return () => unsubscribe();
  }, []);

  const counts = useMemo(() => {
    const pending = requests.filter((request) => !finalStatuses.has(request.status)).length;
    const pgDone = requests.filter((request) => request.status === "pg_cancelled").length;
    const blocked = requests.filter((request) => request.status === "pg_cancel_blocked" || request.status === "pg_cancel_failed").length;

    return { pending, pgDone, blocked };
  }, [requests]);

  async function reviewRequest(requestId: string, action: CancelRequestAction) {
    const endpoint = paymentEndpoints.endpoints.adminCancelRequestReview;
    if (!endpoint) {
      setActionStateById((current) => ({
        ...current,
        [requestId]: { status: "error", message: "관리자 취소/환불 검토 함수 URL이 설정되지 않았습니다." },
      }));
      return;
    }

    setActionStateById((current) => ({
      ...current,
      [requestId]: { status: "saving", message: "검토 결과를 저장하는 중입니다." },
    }));

    try {
      const auth = getFirebaseAuthClient();
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : "";
      if (!token) throw new Error("최고관리자 Firebase ID 토큰이 필요합니다.");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          action,
          reviewMemo: memoById[requestId]?.trim() || "최고관리자 취소/환불 검토 처리",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as ReviewResponse;

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error?.message || payload.message || `검토 처리 실패: ${response.status}`);
      }

      setActionStateById((current) => ({
        ...current,
        [requestId]: { status: "saved", message: payload.message || "검토 결과를 저장했습니다." },
      }));
    } catch (error) {
      setActionStateById((current) => ({
        ...current,
        [requestId]: {
          status: "error",
          message: error instanceof Error ? error.message : "검토 처리에 실패했습니다.",
        },
      }));
    }
  }

  return (
    <section className="rounded-md border border-rose-200 bg-rose-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-rose-700">취소/환불 대기열</p>
          <h2 className="mt-1 text-lg font-normal text-slate-950">취소/환불 검토 요청</h2>
          <p className="mt-2 text-sm font-normal leading-6 text-slate-700">
            고객과 기업관리자가 남긴 요청을 검토합니다. 브라우저는 직접 주문/결제 문서를 수정하지 않고, 승인/반려는 Firebase Functions를 통해서만 처리합니다.
          </p>
        </div>
        <span className={`rounded-md px-3 py-2 text-xs font-normal ${readState.status === "error" ? "bg-red-100 text-red-700" : "bg-white text-rose-800"}`}>
          {readState.message}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md bg-white p-3">
          <p className="text-xs font-normal text-rose-700">검토 필요</p>
          <p className="mt-1 text-xl font-normal text-slate-950">{counts.pending}건</p>
        </div>
        <div className="rounded-md bg-white p-3">
          <p className="text-xs font-normal text-rose-700">PG 취소 완료</p>
          <p className="mt-1 text-xl font-normal text-slate-950">{counts.pgDone}건</p>
        </div>
        <div className="rounded-md bg-white p-3">
          <p className="text-xs font-normal text-rose-700">보류/실패</p>
          <p className="mt-1 text-xl font-normal text-slate-950">{counts.blocked}건</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {requests.length ? requests.map((request) => {
          const actionState = actionStateById[request.id] ?? { status: "idle", message: "" };
          const actionDisabled = actionState.status === "saving" || finalStatuses.has(request.status);

          return (
            <article key={request.id} className="rounded-md border border-rose-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-normal text-slate-950">{request.orderNo}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-normal ring-1 ${statusTone(request.status)}`}>
                      {statusLabels[request.status] ?? request.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-normal text-slate-500">
                    {request.companyId} / {request.requestedBy} / {formatDateTime(request.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-normal text-slate-500">요청 금액</p>
                  <p className="mt-1 text-lg font-normal text-slate-950">{formatCurrency(request.amount)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm font-normal text-slate-700 lg:grid-cols-2">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-normal text-slate-500">요청 사유</p>
                  <p className="mt-1 leading-6">{request.reason}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-normal text-slate-500">PG/검토 메시지</p>
                  <p className="mt-1 leading-6">{request.providerMessage || request.reviewMemo || "아직 처리 메시지가 없습니다."}</p>
                </div>
              </div>

              <label className="mt-3 grid gap-2 text-xs font-normal text-slate-600">
                최고관리자 검토 메모
                <textarea
                  value={memoById[request.id] ?? ""}
                  onChange={(event) => setMemoById((current) => ({ ...current, [request.id]: event.target.value }))}
                  className="min-h-20 rounded-md border border-rose-100 bg-white px-3 py-3 text-sm font-normal text-slate-950 outline-none focus:border-rose-400"
                  placeholder="승인/반려 사유, PayUp 대조 메모, 고객 안내 내용을 남깁니다."
                  disabled={finalStatuses.has(request.status)}
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className={`text-xs font-normal ${actionState.status === "error" ? "text-red-700" : "text-emerald-700"}`}>
                  {actionState.message || (request.reviewedAt ? `검토 완료: ${formatDateTime(request.reviewedAt)}` : "대기 중")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => reviewRequest(request.id, "approve_manual")}
                    disabled={actionDisabled}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-900 disabled:opacity-50"
                  >
                    수동 처리 승인
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewRequest(request.id, "approve_pg_cancel")}
                    disabled={actionDisabled}
                    className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white disabled:opacity-50"
                  >
                    PayUp 취소 승인
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewRequest(request.id, "reject")}
                    disabled={actionDisabled}
                    className="rounded-md bg-red-50 px-3 py-2 text-xs font-normal text-red-700 ring-1 ring-red-200 disabled:opacity-50"
                  >
                    반려
                  </button>
                </div>
              </div>
            </article>
          );
        }) : (
          <div className="rounded-md bg-white p-4 text-sm font-normal text-slate-600">접수된 취소/환불 요청이 없습니다.</div>
        )}
      </div>
    </section>
  );
}
