"use client";

import { useEffect, useState } from "react";
import { readLocalCompanySignupRequests } from "@/components/auth/BetaAdminLogin";
import type { CompanySignupRequestPayload } from "@/lib/firebase/signupRequestRepository";

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
    createdAt: "2026-05-26T18:30:00+09:00",
    updatedAt: "2026-05-26T18:30:00+09:00",
  },
];

export function CompanySignupRequestsPanel() {
  const [requests, setRequests] = useState<CompanySignupRequestPayload[]>(seedRequests);
  const [reviewed, setReviewed] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRequests([...readLocalCompanySignupRequests(), ...seedRequests]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">signup requests</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">회원가입 요청</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기업 로그인 화면에서 접수한 가입 심사 요청입니다. 승인 전에는 기업 콘솔 접근 권한을 부여하지 않습니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{requests.length}건</span>
      </div>

      <div className="mt-4 grid gap-3">
        {requests.map((request) => (
          <article key={request.id} className="grid gap-3 rounded-md border border-slate-100 bg-slate-50 p-3 lg:grid-cols-[1fr_auto]">
            <div>
              <h3 className="font-black text-slate-950">{request.companyName}</h3>
              <p className="mt-1 text-sm font-bold text-slate-600">{request.businessRegistrationNumber}</p>
              <p className="mt-1 text-sm text-slate-600">
                {request.managerName} / {request.managerPhone} / {request.managerEmail}
              </p>
              <p className="mt-2 text-xs font-bold text-slate-500">서류: {request.documentNames.join(", ") || "제출 파일명 없음"}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {["승인", "보류", "반려"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setReviewed((current) => ({ ...current, [request.id]: label }))}
                  className="h-10 rounded-md bg-slate-950 px-4 text-xs font-black text-white"
                >
                  {label}
                </button>
              ))}
              {reviewed[request.id] ? <p className="text-center text-xs font-black text-emerald-700">{reviewed[request.id]} 처리됨</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
