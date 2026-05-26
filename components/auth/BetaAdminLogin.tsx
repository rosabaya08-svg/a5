"use client";

import { useMemo, useState } from "react";
import { betaAccessAccounts, type BetaAccessAccount } from "@/data/accessCredentials";

type BetaAdminLoginProps = {
  role: BetaAccessAccount["role"];
};

function normalizeBusinessNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function findAccount(role: BetaAccessAccount["role"], businessNo: string) {
  const normalized = normalizeBusinessNo(businessNo);
  return betaAccessAccounts.find(
    (account) => account.role === role && normalizeBusinessNo(account.businessNo) === normalized,
  );
}

export function BetaAdminLogin({ role }: BetaAdminLoginProps) {
  const account = useMemo(() => betaAccessAccounts.find((item) => item.role === role), [role]);
  const [businessNo, setBusinessNo] = useState(account?.businessNo ?? "");
  const [password, setPassword] = useState(account?.defaultPassword ?? "1004");
  const [message, setMessage] = useState("");

  const labels =
    role === "company"
      ? {
          title: "기업 어드민 로그인",
          eyebrow: "Company Admin",
          helper: "입점사는 사업자등록번호와 베타 기본 비밀번호로 데모 화면에 진입합니다.",
          next: "/company/dashboard",
        }
      : {
          title: "산후조리원 어드민 로그인",
          eyebrow: "Nursery Admin",
          helper: "산후조리원은 사업자등록번호와 베타 기본 비밀번호로 객실/태블릿/주문 운영 화면에 진입합니다.",
          next: "/nursery/dashboard",
        };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matched = findAccount(role, businessNo);

    if (!matched || password !== matched.defaultPassword) {
      setMessage("사업자등록번호 또는 비밀번호가 일치하지 않습니다. 베타 기본 비밀번호는 1004입니다.");
      return;
    }

    const session = {
      role,
      accountId: matched.id,
      businessNo: matched.businessNo,
      displayName: matched.displayName,
      loginMode: "mock-beta",
      signedInAt: new Date().toISOString(),
    };

    window.localStorage.setItem(`a5.${role}.session`, JSON.stringify(session));
    window.location.href = matched.nextPath;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">{labels.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black">{labels.title}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">{labels.helper}</p>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-md bg-white/10 p-4">
              <p className="font-black text-white">로그인 아이디</p>
              <p className="mt-1 text-slate-300">사업자등록번호</p>
            </div>
            <div className="rounded-md bg-white/10 p-4">
              <p className="font-black text-white">베타 기본 비밀번호</p>
              <p className="mt-1 text-slate-300">1004</p>
            </div>
            <div className="rounded-md border border-amber-300/40 bg-amber-300/10 p-4 text-amber-100">
              실제 운영 계정은 Firebase Auth 초대/비밀번호 재설정/Custom Claims로 발급해야 하며, 기본 비밀번호 운영 사용은 금지입니다.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">A5 closed mall beta</p>
              <h2 className="mt-2 text-2xl font-black">사업자 계정 확인</h2>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">mock/test beta</span>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-black">
              사업자등록번호
              <input
                value={businessNo}
                onChange={(event) => setBusinessNo(event.target.value)}
                className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold outline-none focus:border-slate-950"
                placeholder="000-00-00000"
              />
            </label>
            <label className="grid gap-2 text-sm font-black">
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold outline-none focus:border-slate-950"
                placeholder="1004"
              />
            </label>
          </div>

          {message ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{message}</div>
          ) : null}

          <button type="submit" className="mt-6 h-12 w-full rounded-md bg-slate-950 text-sm font-black text-white">
            로그인
          </button>
          <a href={labels.next} className="mt-3 block text-center text-xs font-bold text-slate-500">
            이미 로그인된 베타 세션이면 운영 화면으로 이동
          </a>
        </form>
      </section>
    </main>
  );
}
