"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { callPayupAdmin } from "@/lib/payup/adminClient";

const roles = [
  "SUPER_ADMIN",
  "FINANCE_ADMIN",
  "OPERATIONS_ADMIN",
  "SUPPORT_ADMIN",
  "AUDITOR",
  "COMPANY_ADMIN",
  "SUPPLIER_ADMIN",
  "PARTNER_ADMIN",
  "A5LS_ADMIN",
] as const;

type AccessMember = {
  id: string;
  uid?: string;
  email?: string;
  display_name?: string;
  roles?: string[];
  organization_ids?: string[];
  business_numbers?: string[];
  channel_ids?: string[];
  status?: string;
  updated_at_iso?: string;
};

type Approval = {
  id: string;
  action_type?: string;
  target_id?: string;
  status?: string;
  reason?: string;
  requested_by_email?: string;
  approved_by_email?: string;
  requested_at_iso?: string;
  expires_at_iso?: string;
  payload?: Record<string, unknown>;
};

type MemberDraft = {
  email: string;
  role: string;
  organizationIds: string;
  businessNumbers: string;
  channelIds: string;
  status: "ACTIVE" | "SUSPENDED";
  reason: string;
  approvalRequestId: string;
};

const emptyDraft: MemberDraft = {
  email: "",
  role: "OPERATIONS_ADMIN",
  organizationIds: "",
  businessNumbers: "",
  channelIds: "A5S",
  status: "ACTIVE",
  reason: "PayUp 운영 역할 부여",
  approvalRequestId: "",
};

function csvValue(value: unknown) {
  const source = Array.isArray(value) ? value.join(" / ") : String(value ?? "");
  return `"${source.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function splitValues(value: string) {
  return value.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean);
}

function statusClass(value?: string) {
  const status = String(value ?? "").toUpperCase();
  if (["ACTIVE", "APPROVED", "CONSUMED"].includes(status)) return "bg-emerald-100 text-emerald-800";
  if (["SUSPENDED", "REJECTED", "EXPIRED"].includes(status)) return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

export function PayupAccessControlWorkspace() {
  const [members, setMembers] = useState<AccessMember[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [draft, setDraft] = useState<MemberDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("서버 권한 원장을 불러오는 중입니다.");

  const payload = useMemo(() => ({
    uid: "",
    roles: [draft.role],
    status: draft.status,
    organizationIds: splitValues(draft.organizationIds),
    businessNumbers: splitValues(draft.businessNumbers).map((value) => value.replace(/[^0-9]/g, "")),
    channelIds: splitValues(draft.channelIds),
  }), [draft]);

  async function load() {
    setBusy(true);
    const [memberResult, approvalResult] = await Promise.all([
      callPayupAdmin<{ ok: true; list: AccessMember[] }>("payupAdminAccess", { action: "list", limit: 500 }),
      callPayupAdmin<{ ok: true; list: Approval[] }>("payupAdminApprovals", { action: "list", limit: 500 }),
    ]);
    if (memberResult.ok) setMembers(memberResult.data.list ?? []);
    if (approvalResult.ok) setApprovals(approvalResult.data.list ?? []);
    const errors = [memberResult, approvalResult].filter((result) => !result.ok).map((result) => !result.ok ? result.error : "");
    setMessage(errors.length ? errors.join(" / ") : "전체 액세스 원장과 2인 승인 큐를 불러왔습니다.");
    setBusy(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function requestApproval() {
    if (!draft.email.trim()) {
      setMessage("권한 대상 이메일을 입력하세요.");
      return;
    }
    setBusy(true);
    const result = await callPayupAdmin<{ ok: true; requestId: string }>("payupAdminApprovals", {
      action: "request",
      actionType: "ACCESS_CHANGE",
      targetId: draft.email.trim().toLowerCase(),
      payload,
      reason: draft.reason,
    });
    if (result.ok) {
      setDraft((current) => ({ ...current, approvalRequestId: result.data.requestId }));
      setMessage(`2인 승인요청을 생성했습니다: ${result.data.requestId}`);
      await load();
    } else {
      setMessage(result.error);
    }
    setBusy(false);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const result = await callPayupAdmin<{ ok: true; uid: string; roles: string[] }>("payupAdminAccess", {
      action: "upsert",
      email: draft.email.trim().toLowerCase(),
      roles: [draft.role],
      status: draft.status,
      organizationIds: payload.organizationIds,
      businessNumbers: payload.businessNumbers,
      channelIds: payload.channelIds,
      reason: draft.reason,
      approvalRequestId: draft.approvalRequestId,
    });
    if (result.ok) {
      setMessage(`${draft.email} 계정의 서버 Custom Claims와 access_members 원장을 갱신했습니다.`);
      setDraft(emptyDraft);
      await load();
    } else {
      setMessage(result.error);
    }
    setBusy(false);
  }

  async function decide(requestId: string, action: "approve" | "reject") {
    const reason = window.prompt(action === "approve" ? "승인 사유를 입력하세요." : "반려 사유를 입력하세요.", action === "approve" ? "권한 범위 검토 완료" : "권한 범위 재검토 필요");
    if (reason === null) return;
    setBusy(true);
    const result = await callPayupAdmin<{ ok: true; status: string }>("payupAdminApprovals", { action, requestId, reason });
    setMessage(result.ok ? `${requestId} 요청을 ${result.data.status} 처리했습니다.` : result.error);
    await load();
    setBusy(false);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-blue-200 bg-blue-50 p-5 text-blue-950">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">A5S Access Control Plane</p>
        <h2 className="mt-2 text-2xl font-black">전체 액세스 관장</h2>
        <p className="mt-2 text-sm font-semibold leading-6">
          이메일 하드코딩이 아니라 Firebase ID Token, Custom Claims, access_members 원장과 역할별 정책으로 A5S·A5WS·A5LS 접근을 관리합니다.
          SUPER_ADMIN 추가·회수와 계정 중지는 요청자와 승인자가 다른 2인 승인으로만 실행됩니다.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={saveMember} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">관리자·하위사업자 권한 설정</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-black text-slate-600 md:col-span-2">
              Firebase 사용자 이메일
              <input required value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold" placeholder="admin@example.com" />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600">
              역할
              <select value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold">
                {roles.map((role) => <option key={role}>{role}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600">
              계정상태
              <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as MemberDraft["status"] }))} className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold">
                <option>ACTIVE</option><option>SUSPENDED</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600 md:col-span-2">
              조직 ID · 쉼표 또는 줄바꿈
              <textarea value={draft.organizationIds} onChange={(event) => setDraft((current) => ({ ...current, organizationIds: event.target.value }))} className="min-h-20 rounded-md border border-slate-200 p-3 text-sm font-bold" placeholder="org-withcommerce, org-foodmart" />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600">
              사업자번호
              <textarea value={draft.businessNumbers} onChange={(event) => setDraft((current) => ({ ...current, businessNumbers: event.target.value }))} className="min-h-20 rounded-md border border-slate-200 p-3 text-sm font-bold" placeholder="7458703132" />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600">
              채널
              <textarea value={draft.channelIds} onChange={(event) => setDraft((current) => ({ ...current, channelIds: event.target.value }))} className="min-h-20 rounded-md border border-slate-200 p-3 text-sm font-bold" placeholder="A5S, A5WS, A5LS" />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600 md:col-span-2">
              변경 사유
              <input value={draft.reason} onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))} className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold" />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-600 md:col-span-2">
              2인 승인요청 ID · SUPER_ADMIN 추가/회수·계정중지 시 필수
              <input value={draft.approvalRequestId} onChange={(event) => setDraft((current) => ({ ...current, approvalRequestId: event.target.value }))} className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold" placeholder="approval-..." />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void requestApproval()} className="rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 disabled:opacity-50">2인 승인요청 생성</button>
            <button type="submit" disabled={busy} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">권한 원장·Claims 적용</button>
          </div>
        </form>

        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-lg font-black text-slate-950">역할 분리 기준</h3><p className="mt-1 text-xs font-semibold text-slate-500">ADMIN 자동 전권 부여를 제거합니다.</p></div>
            <button type="button" onClick={() => void load()} disabled={busy} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-black">새로고침</button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 font-black text-slate-600"><tr><th className="p-3">역할</th><th className="p-3">핵심 범위</th><th className="p-3">금융 실행</th></tr></thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                <tr><td className="p-3 font-black">SUPER_ADMIN</td><td className="p-3">전체 정책·조직·채널 관장</td><td className="p-3">2인 승인 대상 실행</td></tr>
                <tr><td className="p-3 font-black">FINANCE_ADMIN</td><td className="p-3">거래·정산·취소·HOLD</td><td className="p-3">전체취소 승인·실행</td></tr>
                <tr><td className="p-3 font-black">OPERATIONS_ADMIN</td><td className="p-3">하위사업자·주문·동기화</td><td className="p-3">지급·취소 실행 불가</td></tr>
                <tr><td className="p-3 font-black">SUPPORT_ADMIN</td><td className="p-3">마스킹 주문·취소요청</td><td className="p-3">실행 불가</td></tr>
                <tr><td className="p-3 font-black">AUDITOR</td><td className="p-3">전체 읽기 전용</td><td className="p-3">실행 불가</td></tr>
                <tr><td className="p-3 font-black">COMPANY / SUPPLIER / PARTNER / A5LS</td><td className="p-3">자기 조직·사업자 범위</td><td className="p-3">실행 불가</td></tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <p className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 shadow-sm">{message}</p>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4">
          <div><h3 className="font-black text-slate-950">전체 액세스 원장</h3><p className="mt-1 text-xs font-semibold text-slate-500">Secret·카드·계좌 원문은 이 원장에 저장하지 않습니다.</p></div>
          <button type="button" onClick={() => downloadCsv("payup-access-members.csv", ["이메일", "UID", "역할", "조직", "사업자번호", "채널", "상태", "수정일"], members.map((item) => [item.email, item.uid, item.roles, item.organization_ids, item.business_numbers, item.channel_ids, item.status, item.updated_at_iso]))} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-black">엑셀 CSV</button>
        </div>
        <div className="overflow-x-auto"><table className="min-w-full border-collapse text-left text-xs"><thead className="bg-slate-100 font-black text-slate-600"><tr>{["이메일", "역할", "조직", "사업자번호", "채널", "상태", "수정일"].map((header) => <th key={header} className="whitespace-nowrap p-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{members.map((member) => <tr key={member.id} className="font-semibold text-slate-700 hover:bg-slate-50"><td className="p-3">{member.email || member.id}</td><td className="p-3">{member.roles?.join(" / ") || "-"}</td><td className="p-3">{member.organization_ids?.join(" / ") || "-"}</td><td className="p-3">{member.business_numbers?.join(" / ") || "-"}</td><td className="p-3">{member.channel_ids?.join(" / ") || "-"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[11px] font-black ${statusClass(member.status)}`}>{member.status || "-"}</span></td><td className="p-3">{member.updated_at_iso || "-"}</td></tr>)}</tbody></table></div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-slate-950">2인 승인 큐</h3><p className="mt-1 text-xs font-semibold text-slate-500">요청자는 자기 요청을 승인할 수 없고, 승인값과 실행값의 해시가 일치해야 합니다.</p></div>
        <div className="overflow-x-auto"><table className="min-w-full border-collapse text-left text-xs"><thead className="bg-slate-100 font-black text-slate-600"><tr>{["요청ID", "작업", "대상", "요청자", "상태", "만료", "처리"].map((header) => <th key={header} className="whitespace-nowrap p-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{approvals.map((approval) => <tr key={approval.id} className="font-semibold text-slate-700"><td className="p-3">{approval.id}</td><td className="p-3">{approval.action_type}</td><td className="p-3">{approval.target_id}</td><td className="p-3">{approval.requested_by_email}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[11px] font-black ${statusClass(approval.status)}`}>{approval.status}</span></td><td className="p-3">{approval.expires_at_iso || "-"}</td><td className="p-3">{approval.status === "PENDING" ? <div className="flex gap-1"><button type="button" disabled={busy} onClick={() => void decide(approval.id, "approve")} className="rounded bg-emerald-700 px-2 py-1 font-black text-white">승인</button><button type="button" disabled={busy} onClick={() => void decide(approval.id, "reject")} className="rounded bg-red-700 px-2 py-1 font-black text-white">반려</button></div> : "-"}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
