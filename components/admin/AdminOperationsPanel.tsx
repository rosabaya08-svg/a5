"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { repositoryConnectionItems } from "@/data/admin/operations";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import {
  readLocalCompanySignupRequests,
  subscribeCompanySignupRequests,
  type CompanySignupRequestPayload,
} from "@/lib/firebase/signupRequestRepository";
import { formatDateTime } from "@/lib/utils/format";
import type { AdminApprovalStatus, CompanyApprovalItem } from "@/types/admin";

const approvalLabel: Record<AdminApprovalStatus, string> = {
  pending_review: "검토 대기",
  approved: "승인",
  rejected: "반려",
  needs_fix: "수정 요청",
  blocked: "차단",
};

const approvalTone: Record<AdminApprovalStatus, string> = {
  pending_review: "bg-amber-100 text-amber-900 ring-amber-200",
  approved: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  rejected: "bg-red-100 text-red-800 ring-red-200",
  needs_fix: "bg-violet-100 text-violet-800 ring-violet-200",
  blocked: "bg-red-100 text-red-800 ring-red-200",
};

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "amber" | "red" | "green" | "purple" }) {
  const classes = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-100 text-blue-800 ring-blue-200",
    amber: "bg-amber-100 text-amber-900 ring-amber-200",
    red: "bg-red-100 text-red-800 ring-red-200",
    green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    purple: "bg-violet-100 text-violet-800 ring-violet-200",
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-normal ring-1 ${classes[tone]}`}>{children}</span>;
}

function ApprovalStatusBadge({ status }: { status: AdminApprovalStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-normal ring-1 ${approvalTone[status]}`}>{approvalLabel[status]}</span>;
}

function companyIdForSignupRequest(request: CompanySignupRequestPayload) {
  const normalized = request.businessRegistrationNumber.replace(/\D/g, "");
  return request.approvedCompanyId || `company-${normalized || request.id}`;
}

function approvalStatusForSignupRequest(request: CompanySignupRequestPayload): AdminApprovalStatus {
  if (request.status === "approved") return "approved";
  if (request.status === "rejected") return "rejected";
  if (request.status === "on_hold") return "needs_fix";
  return "pending_review";
}

function riskFlagsForSignupRequest(request: CompanySignupRequestPayload) {
  const risks: string[] = [];

  if (request.documentUploadStatus === "failed") risks.push("서류 업로드 실패");
  if (!request.documentNames.length) risks.push("서류 확인 필요");
  if (!request.commerceLicenseNo) risks.push("통신판매업 신고번호 검토 필요");
  if (!request.csPhone) risks.push("CS 연락처 보강 필요");
  if (!request.returnAddress) risks.push("반품지 주소 누락");

  return risks.length > 0 ? risks : ["서류 검토 대기"];
}

function companyApprovalFromSignupRequest(request: CompanySignupRequestPayload): CompanyApprovalItem {
  return {
    id: request.id,
    companyName: request.companyName || "상호 미입력",
    managerName: request.managerName || request.managerEmail || "담당자 미입력",
    businessRegistrationNumber: request.businessRegistrationNumber || "-",
    mailOrderRegistrationNumber: request.commerceLicenseNo || "-",
    submittedAt: request.createdAt,
    status: approvalStatusForSignupRequest(request),
    documents: request.documentNames.length ? request.documentNames : ["서류 미업로드"],
    riskFlags: riskFlagsForSignupRequest(request),
    repositoryPath: `companies/${companyIdForSignupRequest(request)}`,
  };
}

function mergeCompanyApprovalRows(signupRows: CompanyApprovalItem[]) {
  const merged = [...signupRows];
  const seen = new Set<string>();

  return merged.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function useCompanyApprovalRows() {
  const [signupRequests, setSignupRequests] = useState<CompanySignupRequestPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const localTimer = window.setTimeout(() => {
      const localRequests = readLocalCompanySignupRequests();
      if (localRequests.length > 0) {
        setSignupRequests(localRequests);
      }
    }, 0);

    const unsubscribe = subscribeCompanySignupRequests(
      (remoteRequests) => {
        const localById = new Map(readLocalCompanySignupRequests().map((request) => [request.id, request]));
        const remoteById = new Map(remoteRequests.map((request) => [request.id, request]));
        const merged = [...remoteById.values(), ...localById.values().filter((request) => !remoteById.has(request.id))];

        setSignupRequests(merged);
        setLoading(false);
        setErrorMessage("");
      },
      (error) => {
        setLoading(false);
        setErrorMessage(error.message);
      },
    );

    return () => {
      window.clearTimeout(localTimer);
      unsubscribe();
    };
  }, []);

  const rows = useMemo(
    () => mergeCompanyApprovalRows(signupRequests.map(companyApprovalFromSignupRequest)),
    [signupRequests],
  );

  return { rows, loading, errorMessage };
}

export function CompanyApprovalQueuePanel() {
  const { rows, loading, errorMessage } = useCompanyApprovalRows();

  return (
    <section>
      <FilterBar
        title="입점사 승인/반려 큐"
        filters={["전체", "검토 대기", "수정 요청", "서류 보강", "SUPER_ADMIN 필요"]}
        mode="toolbar"
        resultCount={rows.length}
        searchPlaceholder="상호, 사업자등록번호, 통신판매업 신고번호"
      />
      <DataTable
        columns={["입점사", "사업자/통신판매", "서류", "위험", "상태", "저장 경로"]}
        isLoading={loading}
        errorMessage={errorMessage ? `가입 요청 Firestore 조회 실패: ${errorMessage}` : undefined}
        rows={rows.map((company) => ({
          id: company.id,
          cells: [
            <div key="company">
              <p className="font-normal text-slate-950">{company.companyName}</p>
              <p className="mt-1 text-xs text-slate-500">{company.managerName} / {formatDateTime(company.submittedAt)}</p>
            </div>,
            <div key="biz" className="text-xs leading-5">
              <p>사업자: {company.businessRegistrationNumber}</p>
              <p>통신판매: {company.mailOrderRegistrationNumber}</p>
            </div>,
            <div key="docs" className="flex flex-wrap gap-1">
              {company.documents.map((doc) => <Pill key={doc}>{doc}</Pill>)}
            </div>,
            <div key="risks" className="grid gap-1">
              {company.riskFlags.map((risk) => <Pill key={risk} tone="amber">{risk}</Pill>)}
            </div>,
            <ApprovalStatusBadge key="status" status={company.status} />,
            <code key="path" className="text-xs text-slate-600">{company.repositoryPath}</code>,
          ],
        }))}
        sortLabel="정렬: 제출일 최신순"
        paginationLabel={`1-${rows.length} / ${rows.length}`}
      />
      <p className="mt-3 text-xs font-normal text-slate-500">
        승인, 보류, 반려, MID 저장은 상단의 회원가입 승인대기 영역에서 서버 함수로 처리됩니다.
      </p>
    </section>
  );
}

export function RepositoryConnectionPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal uppercase tracking-[0.12em] text-blue-600">저장소 계약</p>
          <h2 className="mt-1 text-lg font-normal text-slate-950">Firestore repository 연결 가능 구조</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            관리자 화면은 Firestore repository로 읽을 수 있는 구조를 전제로 하며, write는 SUPER_ADMIN claim 또는 Functions 전용으로 제한합니다.
          </p>
        </div>
        <Pill tone="red">최고관리자 쓰기 게이트</Pill>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {repositoryConnectionItems.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-normal text-slate-950">{item.label}</h3>
                <p className="mt-1 text-xs font-normal text-slate-500">{item.firestoreCollection}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Pill tone={item.currentMode === "repository_ready" ? "green" : item.currentMode === "server_write_only" ? "blue" : "amber"}>{item.currentMode}</Pill>
                <Pill tone={item.writePolicy === "SUPER_ADMIN_required" ? "red" : "amber"}>{item.writePolicy}</Pill>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
