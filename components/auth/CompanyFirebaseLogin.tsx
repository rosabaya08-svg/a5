"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import { portalHomePaths, writePortalSession } from "@/lib/auth/session";

const companyPortalRoles = new Set(["COMPANY_ADMIN", "SUPPLIER_ADMIN", "PARTNER_ADMIN", "A5LS_ADMIN"]);

function claimRoles(claims: Record<string, unknown>) {
  const values = [claims.role, claims.a5_role, claims.company_role, ...(Array.isArray(claims.roles) ? claims.roles : [])];
  return [...new Set(values.map((value) => String(value ?? "").trim().toUpperCase()).filter(Boolean))];
}

function claimString(claims: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = String(claims[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

export function CompanyFirebaseLogin() {
  const params = useSearchParams();
  const nextPath = params.get("next") || portalHomePaths.company;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("A5S 기업관리자가 승인한 Firebase 계정으로 로그인하세요.");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const auth = getFirebaseAuthClient();
    if (!auth) {
      setMessage("Firebase 기업 로그인 설정이 없습니다.");
      return;
    }
    setBusy(true);
    setMessage("Firebase 로그인과 A5S 조직·채널 Claim을 확인하고 있습니다.");
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const token = await credential.user.getIdTokenResult(true);
      const claims = token.claims as Record<string, unknown>;
      const roles = claimRoles(claims);
      const accessStatus = claimString(claims, "access_status").toUpperCase();
      const organizationId = claimString(claims, "organization_id", "company_id");
      const businessNumber = claimString(claims, "business_number", "business_no").replace(/[^0-9]/g, "");
      const channelIds = Array.isArray(claims.channel_ids) ? claims.channel_ids.map((value) => String(value)) : [];
      const allowedRole = roles.some((role) => companyPortalRoles.has(role));

      if (!allowedRole || accessStatus !== "ACTIVE" || !organizationId || businessNumber.length !== 10) {
        await signOut(auth);
        throw new Error("승인된 기업·공급사·A5WS 파트너 역할과 조직 범위가 없습니다. A5S 기업관리자에게 권한을 요청하세요.");
      }
      if (roles.includes("PARTNER_ADMIN") && channelIds.length > 0 && !channelIds.includes("A5WS")) {
        await signOut(auth);
        throw new Error("이 파트너 계정에는 A5WS 채널 권한이 없습니다.");
      }

      writePortalSession("company", {
        role: "company",
        accountId: credential.user.uid,
        businessNo: businessNumber,
        displayName: credential.user.displayName || credential.user.email || organizationId,
        companyId: organizationId,
        signedInAt: new Date().toISOString(),
        firstLoginCompletedAt: new Date().toISOString(),
      });
      window.location.assign(nextPath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "기업 Firebase 로그인에 실패했습니다.");
      setBusy(false);
    }
  }

  async function resetPassword() {
    const auth = getFirebaseAuthClient();
    const normalizedEmail = email.trim().toLowerCase();
    if (!auth || !normalizedEmail) {
      setMessage("비밀번호 재설정 이메일을 받을 계정 이메일을 먼저 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setMessage("Firebase 비밀번호 재설정 이메일을 발송했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "비밀번호 재설정 이메일을 보내지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">A5S · A5WS FIREBASE CLAIM LOGIN</p>
          <h1 className="mt-3 text-4xl font-black">기업·파트너 로그인</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">Firebase 인증 후 서버가 역할, 조직 ID, 사업자번호와 채널 범위를 확인합니다. 브라우저 세션만으로는 판매·정산 로그에 접근할 수 없습니다.</p>
          <div className="mt-6 grid gap-2 text-sm font-bold text-slate-200"><p>공급사: SUPPLIER_ADMIN</p><p>A5WS 파트너: PARTNER_ADMIN + A5WS</p><p>A5LS 운영사: A5LS_ADMIN</p></div>
        </div>
        <form onSubmit={login} className="rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <h2 className="text-2xl font-black">Firebase 계정 확인</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-black">이메일<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold" autoComplete="username" /></label>
            <label className="grid gap-2 text-sm font-black">비밀번호<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold" autoComplete="current-password" /></label>
          </div>
          <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-900">{message}</p>
          <button type="submit" disabled={busy} className="mt-6 h-12 w-full rounded-md bg-slate-950 text-sm font-black text-white disabled:opacity-50">{busy ? "권한 확인 중" : "기업·A5WS 로그인"}</button>
          <button type="button" disabled={busy} onClick={() => void resetPassword()} className="mt-2 h-11 w-full rounded-md bg-slate-100 text-sm font-black text-slate-800 disabled:opacity-50">Firebase 비밀번호 재설정</button>
          <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">신규 기업·파트너는 A5S 기업관리자의 전체 액세스 관장에서 Firebase 계정과 Claim 승인을 받은 뒤 이용합니다.</p>
        </form>
      </section>
    </main>
  );
}
