"use client";

import { useState, type FormEvent } from "react";
import { callPayupAdmin } from "@/lib/payup/adminClient";

const inviteRoles = ["COMPANY_ADMIN", "SUPPLIER_ADMIN", "PARTNER_ADMIN", "A5LS_ADMIN"] as const;

function splitValues(value: string) {
  return value.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean);
}

export function PartnerFirebaseInvitationWorkspace() {
  const [role, setRole] = useState<(typeof inviteRoles)[number]>("PARTNER_ADMIN");
  const [message, setMessage] = useState("신규 공급사·A5WS 파트너·A5LS 운영사 Firebase 계정을 생성하고 비밀번호 설정 링크를 한 번만 발급합니다.");
  const [setupLink, setSetupLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setSetupLink("");
    const channelDefault = role === "PARTNER_ADMIN" ? ["A5WS"] : role === "A5LS_ADMIN" ? ["A5LS"] : ["A5S"];
    const result = await callPayupAdmin<{
      ok: true;
      uid: string;
      email: string;
      created: boolean;
      passwordSetupLink: string;
      roles: string[];
      organizationIds: string[];
      businessNumbers: string[];
      channelIds: string[];
    }>("payupAdminPartnerInvite", {
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      displayName: String(form.get("displayName") ?? "").trim(),
      roles: [role],
      organizationIds: splitValues(String(form.get("organizationIds") ?? "")),
      businessNumbers: splitValues(String(form.get("businessNumbers") ?? "")).map((value) => value.replace(/[^0-9]/g, "")),
      channelIds: splitValues(String(form.get("channelIds") ?? "")) || channelDefault,
      reason: String(form.get("reason") ?? "").trim(),
    });
    if (result.ok) {
      setSetupLink(result.data.passwordSetupLink);
      setMessage(`${result.data.email} Firebase 계정과 ${result.data.roles.join(" / ")} Claim을 적용했습니다. 비밀번호 설정 링크는 아래에 한 번만 표시됩니다.`);
      event.currentTarget.reset();
    } else {
      setMessage(result.error);
    }
    setBusy(false);
  }

  async function copyLink() {
    if (!setupLink) return;
    await navigator.clipboard.writeText(setupLink);
    setMessage("비밀번호 설정 링크를 복사했습니다. 본인 확인된 담당자에게 안전한 채널로 전달하세요.");
  }

  return (
    <section className="rounded-md border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">FIREBASE PARTNER INVITATION</p><h2 className="mt-2 text-xl font-black">기업·A5WS·A5LS 계정 간편 초대</h2></div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Custom Claims</span>
      </div>
      <form onSubmit={invite} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-black text-slate-600">담당자 이메일<input name="email" required type="email" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600">표시 이름<input name="displayName" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600">역할<select value={role} onChange={(event) => setRole(event.target.value as (typeof inviteRoles)[number])} className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold">{inviteRoles.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-black text-slate-600">채널<input name="channelIds" defaultValue={role === "PARTNER_ADMIN" ? "A5WS" : role === "A5LS_ADMIN" ? "A5LS" : "A5S"} className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600 md:col-span-2">조직 ID<input name="organizationIds" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" placeholder="org-foodmart" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600 md:col-span-2">사업자번호<input name="businessNumbers" required inputMode="numeric" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" placeholder="숫자 10자리" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600 md:col-span-2 xl:col-span-3">초대 사유<input name="reason" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" placeholder="예: A5WS 판매 파트너 승인" /></label>
        <button type="submit" disabled={busy} className="h-11 self-end rounded-md bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50">{busy ? "계정 생성 중" : "Firebase 계정·Claim 생성"}</button>
      </form>
      <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700">{message}</p>
      {setupLink ? <div className="mt-3 rounded-md border-2 border-amber-400 bg-amber-50 p-4"><p className="text-sm font-black text-amber-900">비밀번호 설정 링크 · 한 번만 표시</p><div className="mt-2 flex flex-wrap gap-2"><input readOnly value={setupLink} className="h-11 min-w-0 flex-1 rounded-md border border-amber-300 bg-white px-3 text-xs font-bold" /><button type="button" onClick={() => void copyLink()} className="rounded-md bg-amber-700 px-4 text-sm font-black text-white">링크 복사</button></div></div> : null}
    </section>
  );
}
