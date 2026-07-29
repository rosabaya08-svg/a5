"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultPayupFeatureFlags, type PayupFeatureFlag, type PayupFeatureFlagKey } from "@/data/admin/payupSandbox";
import { callPayupAdmin } from "@/lib/payup/adminClient";

const criticalFlags = new Set<PayupFeatureFlagKey>(["PAYUP_MASTER", "FINAL_APPROVAL", "FULL_CANCEL"]);

type ServerFlag = {
  id?: string;
  key?: string;
  enabled?: boolean;
  locked?: boolean;
  reason?: string;
  updated_at_iso?: string;
};

type Approval = {
  id: string;
  action_type?: string;
  target_id?: string;
  status?: string;
  requested_by_email?: string;
  approved_by_email?: string;
  requested_at_iso?: string;
  expires_at_iso?: string;
  consumed_at_iso?: string;
  payload?: { key?: string; enabled?: boolean };
};

function tone(value: string) {
  const status = value.toUpperCase();
  if (["ON", "APPROVED", "CONSUMED"].includes(status)) return "bg-emerald-100 text-emerald-800";
  if (["REJECTED", "EXPIRED", "OFF"].includes(status)) return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-900";
}

function mergeFlags(server: ServerFlag[]): PayupFeatureFlag[] {
  const byKey = new Map(server.map((flag) => [String(flag.key ?? "").toUpperCase(), flag]));
  return defaultPayupFeatureFlags.map((template) => {
    const current = byKey.get(template.key);
    return {
      ...template,
      enabled: current?.enabled === true,
      locked: template.locked || current?.locked === true,
    };
  });
}

export function PayupSwitchboardWorkspace() {
  const [flags, setFlags] = useState<PayupFeatureFlag[]>(defaultPayupFeatureFlags);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [approvalIds, setApprovalIds] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("서버 배전판과 2인 승인 큐를 불러오는 중입니다.");
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => [...new Set(flags.map((flag) => flag.group))], [flags]);

  async function load() {
    setBusy(true);
    const result = await callPayupAdmin<{ ok: true; list: ServerFlag[]; approvals: Approval[] }>("payupAdminFeatureFlags", { action: "list" });
    if (!result.ok) {
      setMessage(`서버 배전판을 불러오지 못했습니다: ${result.error}`);
      setBusy(false);
      return;
    }
    const nextFlags = mergeFlags(result.data.list ?? []);
    const nextApprovals = result.data.approvals ?? [];
    setFlags(nextFlags);
    setApprovals(nextApprovals);
    setApprovalIds((current) => {
      const next = { ...current };
      for (const flag of nextFlags) {
        if (!criticalFlags.has(flag.key)) continue;
        const approved = nextApprovals.find((approval) => approval.status === "APPROVED" && !approval.consumed_at_iso && approval.payload?.key === flag.key && approval.payload?.enabled === true);
        if (approved) next[flag.key] = approved.id;
      }
      return next;
    });
    setMessage("서버 배전판과 2인 승인 큐를 동기화했습니다.");
    setBusy(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function requestApproval(flag: PayupFeatureFlag) {
    if (!criticalFlags.has(flag.key)) return;
    setBusy(true);
    const result = await callPayupAdmin<{ ok: true; requestId: string }>("payupAdminApprovals", {
      action: "request",
      actionType: "FEATURE_FLAG_ENABLE",
      targetId: flag.key,
      payload: { key: flag.key, enabled: true },
      reason: `${flag.label} 회로 활성화 요청`,
    });
    if (result.ok) {
      setApprovalIds((current) => ({ ...current, [flag.key]: result.data.requestId }));
      setMessage(`${flag.label} 2인 승인요청을 생성했습니다. 다른 승인권자가 승인한 뒤 같은 ID로 ON 하세요.`);
      await load();
    } else {
      setMessage(result.error);
    }
    setBusy(false);
  }

  async function decideApproval(approval: Approval, action: "approve" | "reject") {
    const reason = window.prompt(action === "approve" ? "승인 사유" : "반려 사유", action === "approve" ? "PayUp 연결·의존성·배분원장 검토 완료" : "운영 조건 미충족");
    if (reason === null) return;
    setBusy(true);
    const result = await callPayupAdmin<{ ok: true; status: string }>("payupAdminApprovals", { action, requestId: approval.id, reason });
    setMessage(result.ok ? `${approval.id} 요청을 ${result.data.status} 처리했습니다.` : result.error);
    await load();
    setBusy(false);
  }

  async function toggle(flag: PayupFeatureFlag) {
    if (flag.locked) {
      setMessage(`${flag.label}은 ${flag.lockReason ?? "정책"} 때문에 영구 잠금 상태입니다.`);
      return;
    }
    const enabled = !flag.enabled;
    const approvalRequestId = criticalFlags.has(flag.key) && enabled ? approvalIds[flag.key] ?? "" : "";
    if (criticalFlags.has(flag.key) && enabled && !approvalRequestId) {
      await requestApproval(flag);
      return;
    }

    setBusy(true);
    const result = await callPayupAdmin<{ ok: true; flag: string; enabled: boolean }>("payupAdminFeatureFlags", {
      action: "update",
      key: flag.key,
      enabled,
      approvalRequestId,
      reason: `A5S 기업관리자 PayUp 배전판 ${enabled ? "ON" : "OFF"}`,
    });
    if (result.ok) {
      setMessage(`${flag.label}을 서버에서 ${enabled ? "ON" : "OFF"}으로 변경했습니다.`);
      if (approvalRequestId) setApprovalIds((current) => ({ ...current, [flag.key]: "" }));
      await load();
    } else {
      setMessage(result.error);
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-blue-200 bg-blue-50 p-5 text-blue-950">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">PAYUP ELECTRICAL SWITCHBOARD</p>
        <h2 className="mt-2 text-2xl font-black">서버 배전판·2인 승인 통합</h2>
        <p className="mt-2 text-sm font-semibold leading-6">PAYUP_MASTER, FINAL_APPROVAL, FULL_CANCEL을 ON 하려면 요청자와 다른 승인자가 승인해야 합니다. 의존 회로와 고정 IP·Secret이 준비되지 않으면 서버가 ON을 거부합니다.</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-700">{message}</p>
        <button type="button" onClick={() => void load()} disabled={busy} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-black disabled:opacity-50">서버 새로고침</button>
      </div>

      {groups.map((group) => (
        <section key={group} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-950 px-4 py-3 text-sm font-black text-white">{group}</div>
          <div className="divide-y divide-slate-100">
            {flags.filter((flag) => flag.group === group).map((flag) => {
              const critical = criticalFlags.has(flag.key);
              return (
                <article key={flag.key} className="grid gap-3 p-4 xl:grid-cols-[1fr_290px_130px] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{flag.label}</h3><code className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{flag.key}</code>{critical ? <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-800">2인 승인</span> : null}{flag.locked ? <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-black text-red-800">LOCKED</span> : null}</div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{flag.description}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">{flag.lockReason ? `잠금: ${flag.lockReason}` : flag.dependency ? `의존성: ${flag.dependency}` : "독립 회로"}</p>
                  </div>
                  <div>
                    {critical && !flag.enabled ? (
                      <div className="grid gap-2 rounded-md bg-blue-50 p-3">
                        <input value={approvalIds[flag.key] ?? ""} onChange={(event) => setApprovalIds((current) => ({ ...current, [flag.key]: event.target.value }))} placeholder="승인요청 ID" className="h-10 rounded-md border border-blue-200 bg-white px-3 text-xs font-bold" />
                        <button type="button" disabled={busy} onClick={() => void requestApproval(flag)} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">2인 승인요청 생성</button>
                      </div>
                    ) : <div className="rounded-md bg-slate-50 p-3 text-xs font-bold text-slate-600">{flag.enabled ? "현재 서버 회로가 활성화되어 있습니다." : "일반 운영 회로"}</div>}
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-black ${tone(flag.enabled ? "ON" : "OFF")}`}>{flag.enabled ? "ON" : "OFF"}</span>
                    <button type="button" role="switch" aria-checked={flag.enabled} disabled={busy || flag.locked} onClick={() => void toggle(flag)} className={`relative h-8 w-16 rounded-full transition disabled:cursor-not-allowed ${flag.locked ? "bg-slate-200" : flag.enabled ? "bg-emerald-600" : "bg-slate-300"}`}><span className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${flag.enabled ? "left-9" : "left-1"}`} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-100 px-4 py-3"><h3 className="font-black text-slate-950">FEATURE_FLAG_ENABLE 승인 큐</h3><p className="mt-1 text-xs font-semibold text-slate-500">요청자는 자기 요청을 승인할 수 없습니다.</p></div>
        <div className="overflow-x-auto"><table className="min-w-full border-collapse text-left text-xs"><thead className="bg-slate-50 font-black text-slate-600"><tr>{["요청 ID", "회로", "요청자", "상태", "승인자", "만료", "처리"].map((header) => <th key={header} className="whitespace-nowrap border-b border-slate-200 p-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{approvals.map((approval) => <tr key={approval.id} className="font-semibold text-slate-700"><td className="p-3 font-mono">{approval.id}</td><td className="p-3">{approval.payload?.key ?? approval.target_id}</td><td className="p-3">{approval.requested_by_email || "-"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 font-black ${tone(approval.status || "PENDING")}`}>{approval.status || "PENDING"}</span></td><td className="p-3">{approval.approved_by_email || "-"}</td><td className="p-3">{approval.expires_at_iso || "-"}</td><td className="p-3">{approval.status === "PENDING" ? <div className="flex gap-1"><button type="button" disabled={busy} onClick={() => void decideApproval(approval, "approve")} className="rounded bg-emerald-700 px-2 py-1 font-black text-white">승인</button><button type="button" disabled={busy} onClick={() => void decideApproval(approval, "reject")} className="rounded bg-red-700 px-2 py-1 font-black text-white">반려</button></div> : approval.status === "APPROVED" && !approval.consumed_at_iso ? <button type="button" onClick={() => setApprovalIds((current) => ({ ...current, [approval.payload?.key ?? approval.target_id ?? ""]: approval.id }))} className="rounded bg-blue-700 px-2 py-1 font-black text-white">ID 적용</button> : "-"}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
