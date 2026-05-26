"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { betaAccessAccounts, type BetaAccessAccount } from "@/data/accessCredentials";
import { normalizeBusinessNo, portalHomePaths, writePortalSession } from "@/lib/auth/session";
import { saveCmsRecord } from "@/lib/firebase/contentRepository";
import { requestSignagePartnerNurseryAutoSignup } from "@/lib/firebase/nurseryAutoSignupClient";
import { saveCompanySignupRequest, type CompanySignupRequestPayload } from "@/lib/firebase/signupRequestRepository";
import {
  buildNurseryAutoSignupCmsRecord,
  buildNurseryProfileFromSignagePartnerFallback,
  createManualNurseryProfile,
  findLocalNurseryProfile,
  NURSERY_DEFAULT_PASSWORD,
  saveNurseryAutoSignupProfile,
  validateNurseryProfileInput,
  type NurseryAutoSignupInput,
  type NurseryAutoSignupProfile,
} from "@/lib/nursery/nurseryAutoSignup";

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

type NurserySignupState = NurseryAutoSignupInput & {
  password: string;
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

const initialNurserySignup: NurserySignupState = {
  nurseryName: "",
  businessRegistrationNo: "",
  representativeName: "",
  managerName: "",
  managerPhone: "",
  managerEmail: "",
  businessAddress: "",
  roomCount: "",
  password: NURSERY_DEFAULT_PASSWORD,
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

function buildNurseryProfileFromBetaAccount(matched: BetaAccessAccount): NurseryAutoSignupProfile {
  const fallback = buildNurseryProfileFromSignagePartnerFallback(matched.businessNo);
  const now = new Date().toISOString();

  return (
    fallback ?? {
      id: matched.businessNo,
      nurseryId: matched.id,
      businessRegistrationNo: matched.businessNo,
      businessRegistrationNoNormalized: normalizeBusinessNo(matched.businessNo),
      nurseryName: matched.displayName,
      representativeName: "",
      managerName: "",
      managerPhone: "",
      managerEmail: "",
      businessAddress: "",
      roomCount: "",
      defaultPassword: matched.defaultPassword,
      source: "manual_profile",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    }
  );
}

async function persistNurseryProfile(profile: NurseryAutoSignupProfile) {
  saveNurseryAutoSignupProfile(profile);

  try {
    await saveCmsRecord("nursery_auto_signup_profiles", buildNurseryAutoSignupCmsRecord(profile));
  } catch {
    // Local session remains usable; Firestore can be synced again from the login flow.
  }
}

export function BetaAdminLogin({ role }: BetaAdminLoginProps) {
  const params = useSearchParams();
  const account = useMemo(() => betaAccessAccounts.find((item) => item.role === role), [role]);
  const [businessNo, setBusinessNo] = useState(account?.businessNo ?? "");
  const [password, setPassword] = useState(account?.defaultPassword ?? NURSERY_DEFAULT_PASSWORD);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signup, setSignup] = useState<SignupState>(initialSignup);
  const [nurserySignup, setNurserySignup] = useState<NurserySignupState>({
    ...initialNurserySignup,
    businessRegistrationNo: role === "nursery" ? account?.businessNo ?? "" : "",
  });
  const [companyStep, setCompanyStep] = useState<"login" | "agreements">("login");
  const [pendingCompanyAccount, setPendingCompanyAccount] = useState<BetaAccessAccount | null>(null);
  const [nurseryStep, setNurseryStep] = useState<"login" | "agreements">("login");
  const [pendingNurseryProfile, setPendingNurseryProfile] = useState<NurseryAutoSignupProfile | null>(null);
  const [agreement, setAgreement] = useState({ service: false, privacy: false, marketing: false });
  const [saving, setSaving] = useState(false);

  const nextPath = params.get("next") || portalHomePaths[role];
  const isCompany = role === "company";
  const title = isCompany ? "기업 관리자 로그인" : "산후조리원 어드민 로그인";
  const subtitle = isCompany
    ? "사업자등록번호와 비밀번호로 기업 운영 화면에 접속합니다."
    : "사업자등록번호로 signage-partner 등록 여부를 확인하고 산후조리원 운영 화면에 접속합니다.";

  function completeCompanyLogin(matched: BetaAccessAccount, consentedAt: string) {
    writePortalSession(role, {
      role,
      accountId: matched.id,
      businessNo: matched.businessNo,
      displayName: matched.displayName,
      companyId: matched.id,
      signedInAt: new Date().toISOString(),
      firstLoginCompletedAt: consentedAt,
      termsAcceptedAt: consentedAt,
      privacyAcceptedAt: consentedAt,
      marketingConsentAt: consentedAt,
    });

    window.location.assign(nextPath);
  }

  function completeNurseryLogin(profile: NurseryAutoSignupProfile, consentedAt: string) {
    writePortalSession("nursery", {
      role: "nursery",
      accountId: profile.businessRegistrationNo,
      businessNo: profile.businessRegistrationNo,
      displayName: profile.nurseryName,
      nurseryId: profile.nurseryId,
      signedInAt: new Date().toISOString(),
      firstLoginCompletedAt: consentedAt,
      termsAcceptedAt: profile.termsAcceptedAt ?? consentedAt,
      privacyAcceptedAt: profile.privacyAcceptedAt ?? consentedAt,
      marketingConsentAt: profile.marketingConsentAt ?? consentedAt,
    });

    window.location.assign(nextPath);
  }

  async function resolveNurseryProfile() {
    const matched = findAccount("nursery", businessNo);

    if (matched) {
      return buildNurseryProfileFromBetaAccount(matched);
    }

    const approvedLocal = findLocalNurseryProfile(businessNo);

    if (approvedLocal?.status === "approved") {
      return approvedLocal;
    }

    const remoteProfile = await requestSignagePartnerNurseryAutoSignup(businessNo);

    if (remoteProfile) {
      return remoteProfile;
    }

    const fallbackProfile = buildNurseryProfileFromSignagePartnerFallback(businessNo);

    if (fallbackProfile) {
      return fallbackProfile;
    }

    return approvedLocal;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (role === "nursery") {
      if (password !== NURSERY_DEFAULT_PASSWORD) {
        setMessage("비밀번호가 일치하지 않습니다. 산후조리원 기본 비밀번호는 1004입니다.");
        return;
      }

      setSaving(true);
      const profile = await resolveNurseryProfile();
      setSaving(false);

      if (!profile) {
        setNurserySignup((current) => ({ ...current, businessRegistrationNo: businessNo }));
        setMode("signup");
        setMessage("등록된 사업자번호를 찾지 못했습니다. 자동 가입 정보를 입력해 주세요.");
        return;
      }

      await persistNurseryProfile(profile);

      if (profile.status !== "approved") {
        setMessage("자동 가입 요청이 접수되어 검토 중입니다. 승인 후 이용할 수 있습니다.");
        return;
      }

      setPendingNurseryProfile(profile);
      setNurseryStep("agreements");
      return;
    }

    const matched = findAccount(role, businessNo);

    if (!matched || password !== matched.defaultPassword) {
      setMessage("사업자등록번호 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    setPendingCompanyAccount(matched);
    setCompanyStep("agreements");
  }

  async function handleCompanySignup(event: React.FormEvent<HTMLFormElement>) {
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

  async function handleNurserySignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const input: NurseryAutoSignupInput = {
      businessRegistrationNo: nurserySignup.businessRegistrationNo,
      nurseryName: nurserySignup.nurseryName,
      representativeName: nurserySignup.representativeName,
      managerName: nurserySignup.managerName,
      managerPhone: nurserySignup.managerPhone,
      managerEmail: nurserySignup.managerEmail,
      businessAddress: nurserySignup.businessAddress,
      roomCount: nurserySignup.roomCount,
    };
    const missing = validateNurseryProfileInput(input);

    if (missing.length > 0) {
      setMessage(`필수 정보를 입력해 주세요: ${missing.join(", ")}`);
      return;
    }

    if (nurserySignup.password !== NURSERY_DEFAULT_PASSWORD) {
      setMessage("산후조리원 기본 비밀번호는 1004로 고정됩니다.");
      return;
    }

    setSaving(true);
    const remoteProfile =
      (await requestSignagePartnerNurseryAutoSignup(input.businessRegistrationNo)) ??
      buildNurseryProfileFromSignagePartnerFallback(input.businessRegistrationNo);
    const profile: NurseryAutoSignupProfile = remoteProfile
      ? {
          ...remoteProfile,
          nurseryName: input.nurseryName || remoteProfile.nurseryName,
          representativeName: input.representativeName || remoteProfile.representativeName,
          managerName: input.managerName || remoteProfile.managerName,
          managerPhone: input.managerPhone || remoteProfile.managerPhone,
          managerEmail: input.managerEmail || remoteProfile.managerEmail,
          businessAddress: input.businessAddress || remoteProfile.businessAddress,
          roomCount: input.roomCount || remoteProfile.roomCount,
          status: "approved",
          updatedAt: new Date().toISOString(),
        }
      : createManualNurseryProfile(input);

    await persistNurseryProfile(profile);
    setSaving(false);

    if (profile.status === "approved") {
      setBusinessNo(profile.businessRegistrationNo);
      setPendingNurseryProfile(profile);
      setMessage("");
      setNurseryStep("agreements");
      return;
    }

    setNurserySignup(initialNurserySignup);
    setMode("login");
    setMessage("자동 가입 요청이 접수되었습니다. 사업자 확인 후 이용할 수 있습니다.");
  }

  async function handleAgreementNext() {
    if (!agreement.service || !agreement.privacy || !agreement.marketing) {
      setMessage("운영 약관, 개인정보 처리방침, 마케팅 정보 수신 동의를 모두 체크해야 이용할 수 있습니다.");
      return;
    }

    if (!pendingNurseryProfile) {
      if (role === "company" && pendingCompanyAccount) {
        const consentedAt = new Date().toISOString();
        setMessage("");
        completeCompanyLogin(pendingCompanyAccount, consentedAt);
        return;
      }

      setMessage("계정을 다시 확인해 주세요.");
      return;
    }

    const consentedAt = new Date().toISOString();
    const consentedProfile: NurseryAutoSignupProfile = {
      ...pendingNurseryProfile,
      termsAcceptedAt: consentedAt,
      privacyAcceptedAt: consentedAt,
      marketingConsentAt: consentedAt,
      firstLoginCompletedAt: consentedAt,
      updatedAt: consentedAt,
    };

    setSaving(true);
    saveNurseryAutoSignupProfile(consentedProfile);

    try {
      await saveCmsRecord("nursery_auto_signup_profiles", buildNurseryAutoSignupCmsRecord(consentedProfile));
    } catch {
      // The local session still carries the consent record for the nursery admin page.
    }

    setSaving(false);
    setMessage("");
    completeNurseryLogin(consentedProfile, consentedAt);
  }

  const companySignupFields: Array<[keyof SignupState, string, string]> = [
    ["companyName", "상호", "예: A5 테스트 기업"],
    ["businessNo", "사업자등록번호", "1004-1004-1004"],
    ["representativeName", "대표자명", "홍길동"],
    ["managerName", "담당자명", "담당자"],
    ["managerPhone", "담당자 휴대폰", "010-0000-0000"],
    ["managerEmail", "담당자 이메일", "manager@example.com"],
    ["password", "비밀번호", ""],
    ["passwordConfirm", "비밀번호 확인", ""],
    ["commerceLicenseNo", "통신판매업 신고번호", ""],
    ["csPhone", "CS 연락처", ""],
    ["returnAddress", "반품지 주소", ""],
    ["businessLicenseName", "사업자등록증 파일명", ""],
    ["bankbookName", "통장 사본 파일명", ""],
  ];

  const nurserySignupFields: Array<[keyof NurserySignupState, string, string]> = [
    ["nurseryName", "산후조리원명 *필수", "예: A5 테스트 산후조리원"],
    ["businessRegistrationNo", "사업자등록번호 *필수", "1004-1004-1004"],
    ["representativeName", "대표자명 *필수", ""],
    ["managerName", "담당자명 *필수", ""],
    ["managerPhone", "담당자 연락처 *필수", "010-0000-0000"],
    ["managerEmail", "담당자 이메일 *필수", "manager@example.com"],
    ["businessAddress", "사업장 주소 *필수", ""],
    ["roomCount", "객실 수 *필수", "예: 20"],
    ["password", "기본 비밀번호", NURSERY_DEFAULT_PASSWORD],
  ];

  if ((role === "nursery" && nurseryStep === "agreements") || (role === "company" && companyStep === "agreements")) {
    const consentDisplayName =
      role === "company" ? pendingCompanyAccount?.displayName : pendingNurseryProfile?.nurseryName;
    const consentRoleLabel = role === "company" ? "기업 관리자" : "산후조리원 관리자";

    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <p className="text-xs font-black tracking-[0.16em] text-slate-500">with.commerce</p>
          <h1 className="mt-2 text-3xl font-black">최초 이용 동의</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {consentDisplayName} 계정으로 {consentRoleLabel} 화면을 시작하기 전에 필수 동의를 확인합니다.
          </p>
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
          <button disabled={saving} type="button" onClick={handleAgreementNext} className="mt-6 h-12 w-full rounded-md bg-slate-950 text-sm font-black text-white disabled:opacity-60">
            {saving ? "동의 기록 저장 중" : `${consentRoleLabel} 화면으로 이동`}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black tracking-[0.18em] text-rose-300">with.commerce</p>
          <h1 className="mt-3 text-4xl font-black">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">{subtitle}</p>
          <div className="mt-6 grid gap-3 rounded-md bg-white/10 p-4 text-sm text-slate-200">
            <p className="font-black">아이디</p>
            <p>{isCompany ? "기업 사업자등록번호" : "signage-partner에 등록된 산후조리원 사업자등록번호"}</p>
            <p className="font-black">기본 비밀번호</p>
            <p>{isCompany ? "승인된 기업 계정 비밀번호" : NURSERY_DEFAULT_PASSWORD}</p>
          </div>
        </div>

        <section className="rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`h-10 rounded-md text-sm font-black ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              className={`h-10 rounded-md text-sm font-black ${mode === "signup" ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              {isCompany ? "회원가입 요청" : "자동 가입"}
            </button>
          </div>

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
              <button disabled={saving} type="submit" className="mt-6 h-12 w-full rounded-md bg-slate-950 text-sm font-black text-white disabled:opacity-60">
                {saving ? "확인 중" : "로그인"}
              </button>
            </form>
          ) : isCompany ? (
            <form onSubmit={handleCompanySignup}>
              <h2 className="text-2xl font-black">기업 회원가입 요청</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {companySignupFields.map(([key, label, placeholder]) => (
                  <label key={key} className="grid gap-2 text-sm font-black">
                    {label}
                    <input
                      type={key.includes("password") ? "password" : "text"}
                      value={String(signup[key] ?? "")}
                      onChange={(event) => setSignup((current) => ({ ...current, [key]: event.target.value }))}
                      className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-slate-950"
                      placeholder={placeholder}
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
          ) : (
            <form onSubmit={handleNurserySignup}>
              <h2 className="text-2xl font-black">산후조리원 자동 가입</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                사업자등록번호가 signage-partner에 등록되어 있으면 즉시 계정을 만들고, 확인되지 않으면 가입 요청으로 접수합니다.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {nurserySignupFields.map(([key, label, placeholder]) => (
                  <label key={key} className="grid gap-2 text-sm font-black">
                    {label}
                    <input
                      type={key === "password" ? "password" : "text"}
                      value={String(nurserySignup[key] ?? "")}
                      readOnly={key === "password"}
                      onChange={(event) => setNurserySignup((current) => ({ ...current, [key]: event.target.value }))}
                      className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-slate-950 read-only:bg-slate-50"
                      placeholder={placeholder}
                    />
                  </label>
                ))}
              </div>
              {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-bold text-blue-800">{message}</p> : null}
              <button disabled={saving} type="submit" className="mt-6 h-12 w-full rounded-md bg-slate-950 text-sm font-black text-white disabled:opacity-60">
                {saving ? "확인 중" : "자동 가입 진행"}
              </button>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
