"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAdminAuthClient } from "@/lib/firebase/client";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";

export type PgCommerceChannel = "a5s" | "a5ws" | "a5ls";

type ProgramRow = {
  id: string;
  programName: string;
  operatorBusinessId: string;
  operatorLegalName: string;
  pgMerchantOwnerBusinessId: string;
  pgMerchantOwnerLegalName: string;
  sourcePartnerLegalName: string;
  checkoutMode: string;
  settlementMode: string;
  status: string;
};

type CredentialRow = {
  merchantId: string;
  merchantIdMasked: string;
  environment: "test" | "production";
  status: string;
  credentialReady: boolean;
  encryptedSecretStored: boolean;
  credentialFingerprint: string;
  lastConnectionTest: {
    status: string;
    providerCalled: boolean;
    environment: string;
    code: string;
    testedAt: string;
  };
};

type PartnerRow = {
  id: string;
  partnerBusinessId: string;
  partnerLegalName: string;
  roles: string[];
  onboardingStatus: string;
  contractStatus: string;
};

type ProgramResponse = {
  ok: boolean;
  configurationStatus: string;
  program: ProgramRow;
  credential: CredentialRow;
  partners: PartnerRow[];
  counts: { partners: number; listings: number; paymentIntents: number };
};

type PageState = "loading" | "ready" | "saving" | "testing" | "error";

const channelLabels: Record<PgCommerceChannel, string> = {
  a5s: "산지바로",
  a5ws: "홀세일",
  a5ls: "루쏘",
};

const roleLabels: Record<string, string> = {
  supplier: "공급사",
  product_owner: "상품 소유자",
  reseller: "리셀러",
  fulfillment_operator: "배송 담당",
  settlement_recipient: "정산 수령자",
};

const emptyCredential: CredentialRow = {
  merchantId: "",
  merchantIdMasked: "MID 미등록",
  environment: "production",
  status: "not_configured",
  credentialReady: false,
  encryptedSecretStored: false,
  credentialFingerprint: "",
  lastConnectionTest: { status: "not_tested", providerCalled: false, environment: "", code: "", testedAt: "" },
};

function inputClass() {
  return "h-11 w-full rounded-sm border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none focus:border-emerald-500";
}

async function tokenFor(user: User | null) {
  return user ? user.getIdToken(true) : "";
}

export function AdminA5sPayupMerchantSettingsPanel({ channel = "a5s" }: { channel?: PgCommerceChannel }) {
  const endpoints = useMemo(() => getPaymentEndpointReadiness().endpoints, []);
  const [user, setUser] = useState<User | null>(null);
  const [program, setProgram] = useState<ProgramRow | null>(null);
  const [credential, setCredential] = useState<CredentialRow>(emptyCredential);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [counts, setCounts] = useState({ partners: 0, listings: 0, paymentIntents: 0 });
  const [state, setState] = useState<PageState>("loading");
  const [message, setMessage] = useState("서버에서 채널 구조와 PG 저장 상태를 확인하는 중입니다.");
  const [authKey, setAuthKey] = useState("");
  const [partnerForm, setPartnerForm] = useState({ partnerBusinessId: "", partnerLegalName: "", roles: ["supplier", "settlement_recipient"] });

  useEffect(() => {
    const auth = getFirebaseAdminAuthClient();
    if (!auth) {
      const timer = window.setTimeout(() => {
        setState("error");
        setMessage("Firebase 최고관리자 인증 설정을 찾지 못했습니다.");
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return onAuthStateChanged(auth, setUser);
  }, []);

  const load = useCallback(async (currentUser: User | null) => {
    const endpoint = endpoints.adminProgramPgRead;
    const token = await tokenFor(currentUser);
    if (!endpoint || !token) {
      setState("error");
      setMessage(!endpoint ? "PG 안전 조회 함수 주소가 설정되지 않았습니다." : "최고관리자 Firebase 로그인이 필요합니다.");
      return;
    }
    setState("loading");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel }),
    });
    const payload = await response.json().catch(() => ({})) as Partial<ProgramResponse> & { error?: { message?: string } };
    if (!response.ok || payload.ok === false || !payload.program) {
      setState("error");
      setMessage(payload.error?.message || "채널 PG 정보를 불러오지 못했습니다.");
      return;
    }
    setProgram(payload.program);
    setCredential(payload.credential || emptyCredential);
    setPartners(payload.partners || []);
    setCounts(payload.counts || { partners: 0, listings: 0, paymentIntents: 0 });
    setState("ready");
    setMessage(payload.configurationStatus === "program_missing" ? "채널 기본 구조를 확인했습니다. 실제 사업자 ID와 PayUp 정보를 저장해야 합니다." : "서버에 저장된 채널 구조와 PG 상태를 불러왔습니다.");
  }, [channel, endpoints.adminProgramPgRead]);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setTimeout(() => void load(user), 0);
    return () => window.clearTimeout(timer);
  }, [load, user]);

  async function saveProgram() {
    if (!program) return;
    const token = await tokenFor(user);
    const endpoint = endpoints.adminProgramPgSave;
    if (!endpoint || !token) return;
    if (!credential.encryptedSecretStored && !authKey.trim()) {
      setState("error");
      setMessage("최초 저장에는 PayUp 인증키가 필요합니다.");
      return;
    }
    setState("saving");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        channel,
        operatorBusinessId: program.operatorBusinessId,
        operatorLegalName: program.operatorLegalName,
        pgMerchantOwnerBusinessId: program.pgMerchantOwnerBusinessId,
        pgMerchantOwnerLegalName: program.pgMerchantOwnerLegalName,
        merchantId: credential.merchantId,
        environment: credential.environment,
        status: program.status === "active" ? "active" : "configuration_required",
        authKey: authKey.trim() || undefined,
      }),
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; error?: { message?: string } };
    if (!response.ok || payload.ok === false) {
      setState("error");
      setMessage(payload.error?.message || "PG 설정 저장에 실패했습니다.");
      return;
    }
    setAuthKey("");
    await load(user);
    setMessage("사업 구조와 PayUp 설정을 분리 저장했습니다. 기존 인증키는 새 키를 입력하지 않으면 유지됩니다.");
  }

  async function testConnection() {
    const token = await tokenFor(user);
    const endpoint = endpoints.adminProgramPgConnectionTest;
    if (!endpoint || !token) return;
    setState("testing");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel }),
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; error?: { message?: string }; connectionTest?: { code?: string } };
    await load(user);
    setMessage(response.ok && payload.ok !== false ? `PayUp 비과금 연결검사가 통과했습니다. 코드 ${payload.connectionTest?.code || "확인됨"}` : payload.error?.message || "PayUp 연결검사에 실패했습니다.");
  }

  async function savePartner() {
    const token = await tokenFor(user);
    const endpoint = endpoints.adminProgramPartnerSave;
    if (!endpoint || !token) return;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel, ...partnerForm, onboardingStatus: "pending", contractStatus: "pending" }),
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; error?: { message?: string } };
    if (!response.ok || payload.ok === false) {
      setState("error");
      setMessage(payload.error?.message || "하위 업체 저장에 실패했습니다.");
      return;
    }
    setPartnerForm({ partnerBusinessId: "", partnerLegalName: "", roles: ["supplier", "settlement_recipient"] });
    await load(user);
    setMessage("하위 업체 관계를 저장했습니다. 사업자 검증과 계약 확인 전에는 정산 대상으로 활성화되지 않습니다.");
  }

  function updateProgram(key: keyof ProgramRow, value: string) {
    setProgram((current) => current ? { ...current, [key]: value } : current);
  }

  return (
    <section className="grid gap-4">
      <div className={`rounded-md border px-4 py-3 text-sm ${state === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
        {message}
      </div>

      {program ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Summary label="결제 주체" value={program.pgMerchantOwnerLegalName || "확인 전"} />
            <Summary label="하위 업체" value={`${counts.partners}개`} />
            <Summary label="결제 요청" value={`${counts.paymentIntents}건`} />
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-normal text-slate-950">{channelLabels[channel]} 사업 구조</h3>
            <p className="mt-1 text-sm text-slate-600">상위 결제 사업자와 하위 공급·정산 업체를 분리합니다. A5 mall 업체별 직접계약 PG와 공유하지 않습니다.</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field label="운영 사업자 ID" value={program.operatorBusinessId} onChange={(value) => updateProgram("operatorBusinessId", value)} />
              <Field label="운영 법인명" value={program.operatorLegalName} onChange={(value) => updateProgram("operatorLegalName", value)} />
              <Field label="PayUp 계약 사업자 ID" value={program.pgMerchantOwnerBusinessId} onChange={(value) => updateProgram("pgMerchantOwnerBusinessId", value)} />
              <Field label="PayUp 계약 법인명" value={program.pgMerchantOwnerLegalName} onChange={(value) => updateProgram("pgMerchantOwnerLegalName", value)} />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-normal text-slate-950">PayUp 상위 가맹점</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Field label="가맹점 ID" value={credential.merchantId} onChange={(value) => setCredential((current) => ({ ...current, merchantId: value }))} />
              <label className="grid gap-2 text-sm text-slate-700">환경<select className={inputClass()} value={credential.environment} onChange={(event) => setCredential((current) => ({ ...current, environment: event.target.value as "test" | "production" }))}><option value="production">운영</option><option value="test">테스트</option></select></label>
              <Field label="새 인증키" type="password" value={authKey} onChange={setAuthKey} placeholder={credential.encryptedSecretStored ? "교체할 때만 입력" : "최초 저장 필수"} />
            </div>
            <div className="mt-4 grid gap-2 rounded-sm bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
              <p>암호화 저장: {credential.encryptedSecretStored ? "저장됨" : "미등록"}</p>
              <p>키 지문: {credential.credentialFingerprint || "없음"}</p>
              <p>마지막 연결검사: {credential.lastConnectionTest.status}</p>
              <p>실제 PayUp 호출: {credential.lastConnectionTest.providerCalled ? "확인" : "미확인"}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={saveProgram} disabled={state === "saving"} className="rounded-sm bg-slate-950 px-4 py-3 text-sm text-white disabled:bg-slate-300">구조와 PG 저장</button>
              <button type="button" onClick={testConnection} disabled={!credential.encryptedSecretStored || state === "testing"} className="rounded-sm border border-emerald-600 px-4 py-3 text-sm text-emerald-800 disabled:border-slate-200 disabled:text-slate-400">비과금 연결검사</button>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-normal text-slate-950">하위 업체 및 정산 역할</h3>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <Field label="사업자 ID" value={partnerForm.partnerBusinessId} onChange={(value) => setPartnerForm((current) => ({ ...current, partnerBusinessId: value }))} />
              <Field label="법인명" value={partnerForm.partnerLegalName} onChange={(value) => setPartnerForm((current) => ({ ...current, partnerLegalName: value }))} />
              <button type="button" onClick={savePartner} className="mt-auto h-11 rounded-sm bg-emerald-700 px-4 text-sm text-white">하위 업체 추가</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead><tr className="border-b bg-slate-50 text-slate-600"><th className="p-3">업체</th><th className="p-3">역할</th><th className="p-3">온보딩</th><th className="p-3">계약</th></tr></thead>
                <tbody>{partners.length ? partners.map((partner) => <tr key={partner.id} className="border-b"><td className="p-3"><span className="block text-slate-950">{partner.partnerLegalName || "법인명 확인 전"}</span><span className="text-xs text-slate-500">{partner.partnerBusinessId}</span></td><td className="p-3">{partner.roles.map((role) => roleLabels[role] || role).join(", ")}</td><td className="p-3">{partner.onboardingStatus}</td><td className="p-3">{partner.contractStatus}</td></tr>) : <tr><td className="p-5 text-slate-500" colSpan={4}>등록된 하위 업체가 없습니다. PG 미등록과 거래 0건은 별도 상태입니다.</td></tr>}</tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="grid gap-2 text-sm text-slate-700">{label}<input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={inputClass()} autoComplete={type === "password" ? "new-password" : undefined} /></label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg text-slate-950">{value}</p></div>;
}
