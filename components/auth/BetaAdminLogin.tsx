"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { betaAccessAccounts, type BetaAccessAccount } from "@/data/accessCredentials";
import { nurseryExternalMappings, nurseryRoomSelections } from "@/data/nursery/a4Mapping";
import { normalizeBusinessNo, portalHomePaths, writePortalSession } from "@/lib/auth/session";
import { saveCompanySignupRequest, type CompanySignupRequestPayload } from "@/lib/firebase/signupRequestRepository";

type BetaAdminLoginProps = {
  role: BetaAccessAccount["role"];
};

type SignupState = {
  companyName: string;
  businessNo: string;
  representativeName: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  password: string;
  passwordConfirm: string;
  commerceLicenseNo: string;
  csPhone: string;
  returnAddress: string;
  businessLicenseName: string;
  bankbookName: string;
  agreed: boolean;
};

const initialSignup: SignupState = {
  companyName: "",
  businessNo: "",
  representativeName: "",
  managerName: "",
  managerPhone: "",
  managerEmail: "",
  password: "",
  passwordConfirm: "",
  commerceLicenseNo: "",
  csPhone: "",
  returnAddress: "",
  businessLicenseName: "",
  bankbookName: "",
  agreed: false,
};

function findAccount(role: BetaAccessAccount["role"], businessNo: string) {
  const normalized = normalizeBusinessNo(businessNo);
  return betaAccessAccounts.find(
    (account) => account.role === role && normalizeBusinessNo(account.businessNo) === normalized,
  );
}

function saveSignupRequestLocal(request: CompanySignupRequestPayload) {
  const key = "a5.company-signup-requests";
  const raw = window.localStorage.getItem(key);
  const current = raw ? (JSON.parse(raw) as CompanySignupRequestPayload[]) : [];
  window.localStorage.setItem(key, JSON.stringify([request, ...current.filter((item) => item.id !== request.id)]));
}

export function readLocalCompanySignupRequests() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem("a5.company-signup-requests");
    return raw ? (JSON.parse(raw) as CompanySignupRequestPayload[]) : [];
  } catch {
    return [];
  }
}

export function BetaAdminLogin({ role }: BetaAdminLoginProps) {
  const params = useSearchParams();
  const account = useMemo(() => betaAccessAccounts.find((item) => item.role === role), [role]);
  const [businessNo, setBusinessNo] = useState(account?.businessNo ?? "");
  const [password, setPassword] = useState(account?.defaultPassword ?? "1004");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signup, setSignup] = useState<SignupState>(initialSignup);
  const [nurseryStep, setNurseryStep] = useState<"login" | "agreements" | "room">("login");
  const [agreement, setAgreement] = useState({ service: false, privacy: false, marketing: false });

  const nextPath = params.get("next") || portalHomePaths[role];
  const isCompany = role === "company";
  const title = isCompany ? "기업 관리자 로그인" : "조리원 관리자 로그인";

  function completeLogin(matched: BetaAccessAccount, room?: { roomId: string; roomNumber: string; tabletId: string }) {
    writePortalSession(role, {
      role,
      accountId: matched.id,
      businessNo: matched.businessNo,
      displayName: matched.displayName,
      companyId: role === "company" ? matched.id : undefined,
      nurseryId: role === "nursery" ? matched.id : undefined,
      roomId: room?.roomId,
      roomName: room ? `${room.roomNumber}호` : undefined,
      tabletId: room?.tabletId,
      signedInAt: new Date().toISOString(),
      firstLoginCompletedAt: new Date().toISOString(),
    });

    window.location.assign(nextPath);
  }

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matched = findAccount(role, businessNo);

    if (!matched || password !== matched.defaultPassword) {
      setMessage("사업자등록번호 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (role === "nursery") {
      const mapping = nurseryExternalMappings.find(
        (item) => normalizeBusinessNo(item.businessRegistrationNo) === normalizeBusinessNo(businessNo),
      );

      if (!mapping) {
        setMessage("등록된 조리원이 아닙니다. 최고관리자에게 문의하세요.");
        return;
      }

      setMessage("");
      setNurseryStep("agreements");
      return;
    }

    completeLogin(matched);
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!signup.companyName || !signup.businessNo || !signup.managerName || !signup.managerPhone || !signup.managerEmail) {
      setMessage("필수 정보를 입력해 주세요.");
      return;
    }

    if (signup.password !== signup.passwordConfirm) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!signup.agreed) {
      setMessage("개인정보 및 운영 약관 동의가 필요합니다.");
      return;
    }

    const now = new Date().toISOString();
    const id = `company-request-${normalizeBusinessNo(signup.businessNo)}-${Date.now()}`;
    const request: CompanySignupRequestPayload = {
      id,
      companyName: signup.companyName,
      businessRegistrationNumber: signup.businessNo,
      representativeName: signup.representativeName,
      managerName: signup.managerName,
      managerPhone: signup.managerPhone,
      managerEmail: signup.managerEmail,
      commerceLicenseNo: signup.commerceLicenseNo,
      csPhone: signup.csPhone,
      returnAddress: signup.returnAddress,
      documentNames: [signup.businessLicenseName, signup.bankbookName].filter(Boolean),
      status: "pending_review",
      createdAt: now,
      updatedAt: now,
    };

    saveSignupRequestLocal(request);

    try {
      await saveCompanySignupRequest(request);
    } catch {
      // Local request remains available for the admin review screen.
    }

    setSignup(initialSignup);
    setMode("login");
    setMessage("회원가입 요청이 접수되었습니다. 최고관리자 승인 후 이용할 수 있습니다.");
  }

  function handleAgreementNext() {
    if (!agreement.service || !agreement.privacy) {
      setMessage("필수 약관과 개인정보 처리방침에 동의해 주세요.");
      return;
    }

    setMessage("");
    setNurseryStep("room");
  }

  function selectRoom(roomId: string, roomNumber: string, tabletId: string) {
    const matched = findAccount(role, businessNo);
    if (!matched) return;
    completeLogin(matched, { roomId, roomNumber, tabletId });
  }

  if (role === "nursery" && nurseryStep === "agreements") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">A5 CLOSED MALL</p>
          <h1 className="mt-2 text-3xl font-black">최초 이용 동의</h1>
          <div className="mt-6 grid gap-3">
            {[
              ["service", "운영 약관 동의"],
              ["privacy", "개인정보 처리방침 동의"],
              ["marketing", "마케팅 정보 수신 동의"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-md border border-slate-200 p-4 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={agreement[key as keyof typeof agreement]}
                  onChange={(event) => setAgreement((current) => ({ ...current, [key]: event.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          {message ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p> : null}
          <button type="button" onClick={handleAgreementNext} className="mt-6 h-12 w-full rounded-md bg-slate-950 text-sm font-black text-white">
            객실 선택으로 이동
          </button>
        </section>
      </main>
    );
  }

  if (role === "nursery" && nurseryStep === "room") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-3xl rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">ROOM SELECTION</p>
          <h1 className="mt-2 text-3xl font-black">객실을 선택해 주세요</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {nurseryRoomSelections.map((room) => (
              <button
                key={room.roomId}
                type="button"
                onClick={() => selectRoom(room.roomId, room.roomNumber, room.activeTabletId ?? "")}
                className="rounded-md border border-slate-200 p-5 text-left transition hover:border-slate-950 hover:bg-slate-50"
              >
                <p className="text-2xl font-black">{room.roomNumber}호</p>
                <p className="mt-2 text-sm font-bold text-slate-500">{room.activeTabletId}</p>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">A5 CLOSED MALL</p>
          <h1 className="mt-3 text-4xl font-black">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            사업자등록번호와 비밀번호로 운영 화면에 접근합니다.
          </p>
        </div>

        <section className="rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          {isCompany ? (
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
              <button type="button" onClick={() => setMode("login")} className={`h-10 rounded-md text-sm font-black ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500"}`}>
                로그인
              </button>
              <button type="button" onClick={() => setMode("signup")} className={`h-10 rounded-md text-sm font-black ${mode === "signup" ? "bg-white shadow-sm" : "text-slate-500"}`}>
                회원가입 요청
              </button>
            </div>
          ) : null}

          {mode === "login" ? (
            <form onSubmit={handleLogin}>
              <h2 className="text-2xl font-black">사업자 계정 확인</h2>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-black">
                  사업자등록번호
                  <input
                    value={businessNo}
                    onChange={(event) => setBusinessNo(event.target.value)}
                    className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold outline-none focus:border-slate-950"
                    placeholder="1004-1004-1004"
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
              {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-bold text-blue-800">{message}</p> : null}
              <button type="submit" className="mt-6 h-12 w-full rounded-md bg-slate-950 text-sm font-black text-white">
                로그인
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              <h2 className="text-2xl font-black">기업 회원가입 요청</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  ["companyName", "상호"],
                  ["businessNo", "사업자등록번호"],
                  ["representativeName", "대표자명"],
                  ["managerName", "담당자명"],
                  ["managerPhone", "담당자 휴대폰"],
                  ["managerEmail", "담당자 이메일"],
                  ["password", "비밀번호"],
                  ["passwordConfirm", "비밀번호 확인"],
                  ["commerceLicenseNo", "통신판매업 신고번호"],
                  ["csPhone", "CS 연락처"],
                  ["returnAddress", "반품지 주소"],
                  ["businessLicenseName", "사업자등록증 파일명"],
                  ["bankbookName", "통장 사본 파일명"],
                ].map(([key, label]) => (
                  <label key={key} className="grid gap-2 text-sm font-black">
                    {label}
                    <input
                      type={key.includes("password") ? "password" : "text"}
                      value={String(signup[key as keyof SignupState] ?? "")}
                      onChange={(event) => setSignup((current) => ({ ...current, [key]: event.target.value }))}
                      className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-slate-950"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={signup.agreed}
                  onChange={(event) => setSignup((current) => ({ ...current, agreed: event.target.checked }))}
                />
                개인정보 및 운영 약관에 동의합니다.
              </label>
              {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-bold text-blue-800">{message}</p> : null}
              <button type="submit" className="mt-6 h-12 w-full rounded-md bg-slate-950 text-sm font-black text-white">
                회원가입 요청
              </button>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
