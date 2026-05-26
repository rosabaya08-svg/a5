"use client";

import { useEffect, useMemo, useState } from "react";
import { readLocalCompanySignupRequests } from "@/components/auth/BetaAdminLogin";
import { saveCompanyPgApproval, type CompanySignupRequestPayload } from "@/lib/firebase/signupRequestRepository";
import { maskMerchantId } from "@/lib/payments/infinySettlementPolicy";
import type { PgMerchantStatus } from "@/types/commerce";

const seedRequests: CompanySignupRequestPayload[] = [
  {
    id: "company-request-100410041004-seed",
    companyName: "A5 테스트 기업",
    businessRegistrationNumber: "1004-1004-1004",
    representativeName: "테스트 대표",
    managerName: "테스트 담당자",
    managerPhone: "010-1004-1004",
    managerEmail: "test-company@a5.local",
    commerceLicenseNo: "제2026-A5-1004호",
    csPhone: "02-1004-1004",
    returnAddress: "서울시 강남구 테스트로 1004",
    documentNames: ["business-license.pdf", "bankbook.pdf"],
    status: "pending_review",
    infinyTransferStatus: "not_sent",
    pgMerchantStatus: "not_applied",
    createdAt: "2026-05-26T18:30:00+09:00",
    updatedAt: "2026-05-26T18:30:00+09:00",
  },
];

type PgReviewDraft = {
  transferStatus: NonNullable<CompanySignupRequestPayload["infinyTransferStatus"]>;
  merchantId: string;
  moduleKey: string;
  merchantStatus: PgMerchantStatus;
  memo: string;
  result?: string;
};

const transferStatusLabels: Record<PgReviewDraft["transferStatus"], string> = {
  not_sent: "인피니 전달 전",
  sent: "인피니 전달 완료",
  approved: "인피니 승인 완료",
  rejected: "인피니 반려",
};

const merchantStatusLabels: Record<PgMerchantStatus, string> = {
  not_applied: "신청 전",
  in_review: "인피니 심사 중",
  mid_issued: "MID 발급",
  active: "운영 가능",
  blocked: "차단",
};

function companyIdFor(request: CompanySignupRequestPayload) {
  const normalized = request.businessRegistrationNumber.replace(/\D/g, "");
  return request.approvedCompanyId || `company-${normalized || request.id}`;
}

function draftFor(request: CompanySignupRequestPayload): PgReviewDraft {
  return {
    transferStatus: request.infinyTransferStatus ?? "not_sent",
    merchantId: request.pgMerchantId ?? "",
    moduleKey: request.pgModuleKey ?? "",
    merchantStatus: request.pgMerchantStatus ?? "not_applied",
    memo: request.reviewMemo ?? "",
  };
}

function requestSummaryForInfiny(request: CompanySignupRequestPayload) {
  return [
    ["상호", request.companyName],
    ["사업자등록번호", request.businessRegistrationNumber],
    ["대표자", request.representativeName || "-"],
    ["담당자", `${request.managerName} / ${request.managerPhone}`],
    ["이메일", request.managerEmail],
    ["통신판매업", request.commerceLicenseNo || "-"],
    ["CS", request.csPhone || "-"],
    ["반품지", request.returnAddress || "-"],
  ];
}

function persistLocalReview(request: CompanySignupRequestPayload, draft: PgReviewDraft, status: CompanySignupRequestPayload["status"]) {
  const key = "a5.company-signup-requests";
  const current = readLocalCompanySignupRequests();
  const reviewed: CompanySignupRequestPayload = {
    ...request,
    status,
    infinyTransferStatus: draft.transferStatus,
    pgMerchantId: draft.merchantId,
    pgModuleKey: draft.moduleKey,
    pgMerchantStatus: draft.merchantStatus,
    approvedCompanyId: companyIdFor(request),
    reviewedAt: new Date().toISOString(),
    reviewMemo: draft.memo,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(key, JSON.stringify([reviewed, ...current.filter((item) => item.id !== request.id)]));
  return reviewed;
}

export function CompanySignupRequestsPanel() {
  const [requests, setRequests] = useState<CompanySignupRequestPayload[]>(seedRequests);
  const [drafts, setDrafts] = useState<Record<string, PgReviewDraft>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextRequests = [...readLocalCompanySignupRequests(), ...seedRequests];
      setRequests(nextRequests);
      setDrafts((current) => ({
        ...Object.fromEntries(nextRequests.map((request) => [request.id, draftFor(request)])),
        ...current,
      }));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const pendingCount = useMemo(() => requests.filter((request) => request.status !== "approved").length, [requests]);

  function updateDraft(requestId: string, patch: Partial<PgReviewDraft>) {
    setDrafts((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] ?? { transferStatus: "not_sent", merchantId: "", moduleKey: "", merchantStatus: "not_applied", memo: "" }),
        ...patch,
      },
    }));
  }

  async function markSent(request: CompanySignupRequestPayload) {
    const draft = { ...(drafts[request.id] ?? draftFor(request)), transferStatus: "sent" as const, merchantStatus: "in_review" as const };
    const reviewed = persistLocalReview(request, draft, "infiny_sent");
    setRequests((current) => current.map((item) => (item.id === request.id ? reviewed : item)));
    updateDraft(request.id, { ...draft, result: "인피니 전달 상태로 표시했습니다." });
  }

  async function approveWithMid(request: CompanySignupRequestPayload) {
    const draft = drafts[request.id] ?? draftFor(request);

    if (!draft.merchantId.trim() || !draft.moduleKey.trim()) {
      updateDraft(request.id, { result: "기업별 인피니 MID와 결제 모듈 키를 입력해야 승인할 수 있습니다." });
      return;
    }

    const nextDraft = {
      ...draft,
      transferStatus: "approved" as const,
      merchantStatus: draft.merchantStatus === "active" ? draft.merchantStatus : "mid_issued" as PgMerchantStatus,
    };
    const reviewed = persistLocalReview(request, nextDraft, "approved");
    setRequests((current) => current.map((item) => (item.id === request.id ? reviewed : item)));

    try {
      await saveCompanyPgApproval({
        request,
        companyId: companyIdFor(request),
        merchantId: nextDraft.merchantId,
        moduleKey: nextDraft.moduleKey,
        merchantStatus: nextDraft.merchantStatus,
        transferStatus: nextDraft.transferStatus,
        reviewStatus: "approved",
        reviewMemo: nextDraft.memo,
      });
      updateDraft(request.id, { ...nextDraft, result: "기업 승인과 기업별 MID/결제 모듈 키를 저장했습니다." });
    } catch {
      updateDraft(request.id, { ...nextDraft, result: "로컬 승인 처리됨. Firestore 저장은 권한 또는 네트워크 확인이 필요합니다." });
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">signup requests</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">회원가입 승인대기 / 인피니 MID 입력</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기업이 제출한 가입 정보를 인피니에 전달하고, 인피니가 기업별로 발급한 MID와 결제 모듈 키만 이 목록에서 입력합니다.
            기업 어드민은 입력 권한 없이 상태와 마스킹된 MID만 확인합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{pendingCount}건 대기</span>
      </div>

      <div className="mt-4 grid gap-3">
        {requests.map((request) => {
          const draft = drafts[request.id] ?? draftFor(request);
          const companyId = companyIdFor(request);

          return (
            <article key={request.id} className="grid gap-4 rounded-md border border-slate-100 bg-slate-50 p-3">
              <div className="grid gap-3 lg:grid-cols-[1fr_1.15fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-950">{request.companyName}</h3>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{request.status}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-600">{request.businessRegistrationNumber}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {request.managerName} / {request.managerPhone} / {request.managerEmail}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-500">서류: {request.documentNames.join(", ") || "제출 파일명 없음"}</p>
                  <p className="mt-2 text-xs font-bold text-slate-500">승인 companyId: {companyId}</p>
                </div>

                <div className="rounded-md bg-white p-3 ring-1 ring-slate-200">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">인피니 전달 정보</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    {requestSummaryForInfiny(request).map(([label, value]) => (
                      <div key={label} className="rounded-md bg-slate-50 p-2">
                        <p className="font-black text-slate-500">{label}</p>
                        <p className="mt-1 break-words font-bold text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-md border border-blue-100 bg-blue-50 p-3 lg:grid-cols-[1fr_1fr_220px_1fr]">
                <label className="grid gap-1 text-xs font-black text-slate-600">
                  인피니 MID
                  <input
                    value={draft.merchantId}
                    onChange={(event) => updateDraft(request.id, { merchantId: event.target.value })}
                    className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                    placeholder="기업별 MID"
                  />
                  <span className="font-bold text-slate-500">{maskMerchantId(draft.merchantId || undefined)}</span>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-600">
                  결제 모듈 키
                  <input
                    value={draft.moduleKey}
                    onChange={(event) => updateDraft(request.id, { moduleKey: event.target.value })}
                    className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                    placeholder="인피니가 기업별로 발급한 키"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-600">
                  MID 상태
                  <select
                    value={draft.merchantStatus}
                    onChange={(event) => updateDraft(request.id, { merchantStatus: event.target.value as PgMerchantStatus })}
                    className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  >
                    {Object.entries(merchantStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-600">
                  인피니 전달 상태
                  <select
                    value={draft.transferStatus}
                    onChange={(event) => updateDraft(request.id, { transferStatus: event.target.value as PgReviewDraft["transferStatus"] })}
                    className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  >
                    {Object.entries(transferStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-600 lg:col-span-4">
                  심사 메모
                  <textarea
                    value={draft.memo}
                    onChange={(event) => updateDraft(request.id, { memo: event.target.value })}
                    className="min-h-20 rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-950"
                    placeholder="인피니 전달/승인/반려 메모"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-black text-slate-600">
                  {draft.result || "인피니 승인 후 기업별 MID와 결제 모듈 키를 입력해야 해당 기업 상품 결제가 열립니다."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => markSent(request)} className="rounded-md border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-800">
                    인피니 전달 완료
                  </button>
                  <button type="button" onClick={() => approveWithMid(request)} className="rounded-md bg-slate-950 px-4 py-3 text-xs font-black text-white">
                    기업 승인 + MID 저장
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
