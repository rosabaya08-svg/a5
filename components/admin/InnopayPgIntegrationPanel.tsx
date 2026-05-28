"use client";

import { useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { mockCompanies } from "@/data/mockCompanies";
import { getFirebaseAuthClient, getFirebaseDb } from "@/lib/firebase/client";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { maskMerchantId } from "@/lib/payments/infinySettlementPolicy";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type RuntimeConfig = {
  apiBaseUrl: string;
  paymentMode: "sms" | "vbank" | "rest";
  smsEnabled: boolean;
  vbankEnabled: boolean;
  realCallsEnabled: boolean;
  smsSvcPrdtCd: "03" | "04";
  vbankNotiUrl: string;
};

type CredentialInput = {
  companyId: string;
  companyName: string;
  mid: string;
  merchantKey: string;
  licenseKey: string;
  cancelPwd: string;
  webhookSecret: string;
  status: "not_applied" | "in_review" | "mid_issued" | "active" | "blocked";
  smsCard: boolean;
  vbank: boolean;
};

const storageKey = "a5.admin.innopay-rest-pg-integration";

const endpointRows = [
  ["SMS 카드결제", "POST", "/api/smsPayApi", "0000"],
  ["통합 취소", "POST", "/api/cancelApi", "2001"],
  ["가상계좌 발급", "POST", "/api/vbankApi", "4100"],
  ["가상계좌 상태조회", "POST", "/api/vacctInquery", "4100 / 4200"],
  ["가상계좌 취소", "POST", "/api/vbankCancel", "4100"],
  ["거래조회", "GET", "/v1/transactions/{tid|orders/{moid}}", "HTTP OK"],
  ["가상계좌 Noti", "POST", "paymentsInnopayVbankNoti", "0000 응답"],
];

const statusLabels: Record<CredentialInput["status"], string> = {
  not_applied: "신청 전",
  in_review: "심사 중",
  mid_issued: "MID 발급",
  active: "운영 가능",
  blocked: "차단",
};

function defaultRuntime(): RuntimeConfig {
  return {
    apiBaseUrl: "https://api.innopay.co.kr",
    paymentMode: "sms",
    smsEnabled: true,
    vbankEnabled: false,
    realCallsEnabled: false,
    smsSvcPrdtCd: "03",
    vbankNotiUrl: "https://asia-northeast3-a5-closed-mall.cloudfunctions.net/paymentsInnopayVbankNoti",
  };
}

function defaultCredentials(): CredentialInput[] {
  return mockCompanies.map((company) => ({
    companyId: company.id,
    companyName: company.name,
    mid: company.pgProfile?.merchantId ?? "",
    merchantKey: "",
    licenseKey: "",
    cancelPwd: "",
    webhookSecret: "",
    status: company.pgProfile?.merchantStatus ?? "not_applied",
    smsCard: true,
    vbank: false,
  }));
}

function readInitialState(): { runtime: RuntimeConfig; credentials: CredentialInput[] } {
  const fallback = { runtime: defaultRuntime(), credentials: defaultCredentials() };
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<{ runtime: RuntimeConfig; credentials: CredentialInput[] }>;
    return {
      runtime: { ...fallback.runtime, ...parsed.runtime },
      credentials: parsed.credentials?.length ? parsed.credentials.map((row) => ({ ...defaultCredentials()[0], ...row })) : fallback.credentials,
    };
  } catch {
    return fallback;
  }
}

function inputClass() {
  return "h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-600";
}

function passwordClass(value: string) {
  return `${inputClass()} ${value ? "border-emerald-300 bg-emerald-50" : ""}`;
}

function maskSecret(value: string) {
  if (!value) return "미입력";
  return "입력됨";
}

function readinessFor(row: CredentialInput, runtime: RuntimeConfig) {
  const smsReady = runtime.smsEnabled && row.smsCard && row.mid.trim() && row.merchantKey.trim() && row.status === "active";
  const vbankReady = runtime.vbankEnabled && row.vbank && row.mid.trim() && row.licenseKey.trim() && row.status === "active";
  const cancelReady = row.mid.trim() && row.cancelPwd.trim();

  return {
    smsReady: Boolean(smsReady),
    vbankReady: Boolean(vbankReady),
    cancelReady: Boolean(cancelReady),
    fullyReady: Boolean((smsReady || vbankReady) && cancelReady),
  };
}

async function postAdminPaymentFunction(url: string, payload: Record<string, unknown>) {
  if (!url) throw new Error("Firebase Functions 결제 모듈 URL이 설정되지 않았습니다.");
  const auth = getFirebaseAuthClient();
  const idToken = await auth?.currentUser?.getIdToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error?.message || data?.message || "PG 연동 저장 요청이 실패했습니다.");
  }

  return data;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

function Badge({ tone, children }: { tone: "blue" | "green" | "red" | "amber" | "slate"; children: React.ReactNode }) {
  const tones = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-900",
    slate: "bg-slate-100 text-slate-700",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tones[tone]}`}>{children}</span>;
}

export function InnopayPgIntegrationPanel() {
  const initial = useMemo(() => readInitialState(), []);
  const [runtime, setRuntime] = useState<RuntimeConfig>(initial.runtime);
  const [credentials, setCredentials] = useState<CredentialInput[]>(initial.credentials);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const endpoints = useMemo(() => getPaymentEndpointReadiness(), []);
  const metrics = useMemo(() => {
    const rows = credentials.map((row) => readinessFor(row, runtime));
    const active = credentials.filter((row) => row.status === "active").length;
    const smsReady = rows.filter((row) => row.smsReady).length;
    const vbankReady = rows.filter((row) => row.vbankReady).length;
    const cancelReady = rows.filter((row) => row.cancelReady).length;
    const total = Math.max(credentials.length, 1);

    return {
      active,
      smsReady,
      vbankReady,
      cancelReady,
      progress: Math.round(((smsReady + cancelReady + (runtime.vbankEnabled ? vbankReady : smsReady)) / (total * 3)) * 100),
    };
  }, [credentials, runtime]);

  function updateRuntime(patch: Partial<RuntimeConfig>) {
    setRuntime((current) => ({ ...current, ...patch }));
  }

  function updateCredential(companyId: string, patch: Partial<CredentialInput>) {
    setCredentials((current) => current.map((row) => (row.companyId === companyId ? { ...row, ...patch } : row)));
  }

  async function saveIntegration() {
    const db = getFirebaseDb();
    setSaveState({ status: "saving", message: "인피니 PG 연동값을 저장하는 중입니다." });

    try {
      if (!db) throw new Error("Firebase web config is missing.");

      window.localStorage.setItem(storageKey, JSON.stringify({ runtime, credentials }));

      await setDoc(
        doc(db, "pg_provider_settings", "infiny"),
        {
          provider: "infiny",
          environment: "test",
          mode: "innopay_rest",
          api_base_url: runtime.apiBaseUrl,
          apiBaseUrl: runtime.apiBaseUrl,
          payment_mode: runtime.paymentMode,
          innopay_sms_api_enabled: runtime.smsEnabled,
          innopay_vbank_api_enabled: runtime.vbankEnabled,
          innopay_real_calls_enabled: runtime.realCallsEnabled,
          sms_svc_prdt_cd: runtime.smsSvcPrdtCd,
          vbank_noti_url: runtime.vbankNotiUrl,
          documented_endpoints: endpointRows.map(([label, method, path, successCode]) => ({ label, method, path, successCode })),
          raw_secret_stored: false,
          secret_storage_policy: "functions_encrypted_vault_or_secret_manager",
          updated_at: serverTimestamp(),
        },
        { merge: true },
      );

      await Promise.all(
        credentials.map((row) =>
          postAdminPaymentFunction(endpoints.endpoints.adminPgCredentialSave, {
            companyId: row.companyId,
            companyName: row.companyName,
            provider: "infiny",
            environment: "test",
            mid: row.mid,
            secretKey: row.licenseKey || undefined,
            merchantPassword: row.cancelPwd || undefined,
            signKey: row.merchantKey || undefined,
            webhookSecret: row.webhookSecret || undefined,
            status: row.status,
          }),
        ),
      );

      setSaveState({
        status: "saved",
        message: "PG 연동값을 저장했습니다. SMS는 MID+Merchant-Key, 가상계좌는 MID+licenseKey, 취소는 cancelPwd 기준으로 작동합니다.",
      });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "PG 연동값 저장에 실패했습니다.",
      });
    }
  }

  return (
    <section className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">innopay rest api</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">인피니 PG 연동 운영 대시보드</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                A5는 인피니에서 문서로 확인된 REST API만 호출합니다. `INFINY_API_BASE_URL=https://api.innopay.co.kr`를 넣어도
                문서에 없는 `/payments/confirm` 경로는 만들지 않습니다.
              </p>
            </div>
            <Badge tone={runtime.realCallsEnabled ? "green" : "amber"}>{runtime.realCallsEnabled ? "실호출 허용" : "실호출 잠금"}</Badge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["활성 MID", `${metrics.active}개`],
              ["SMS 결제 준비", `${metrics.smsReady}개`],
              ["가상계좌 준비", `${metrics.vbankReady}개`],
              ["취소 준비", `${metrics.cancelReady}개`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-black text-slate-600">
              <span>연동 준비율</span>
              <span>{metrics.progress}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={metrics.progress} />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">call flow</p>
          <h3 className="mt-1 text-xl font-black">A5 결제 확정 흐름</h3>
          <div className="mt-4 grid gap-2 text-sm">
            {[
              "1. paymentsReady: QR, 금액, 재고, 회사 MID 검증",
              "2. paymentsStartInnopaySms: /api/smsPayApi 호출",
              "3. paymentsSyncInnopaySms: /v1/transactions 거래조회",
              "4. 승인 확인 후 paymentsConfirm으로 주문/재고 확정",
              "5. 취소는 /api/cancelApi, Noti는 0000 응답",
            ].map((item) => (
              <p key={item} className="rounded-md bg-white/10 p-3 font-bold">{item}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">인피니 API 런타임 설정</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">운영 전에는 실호출 잠금을 유지하고, 테스트 MID로 SMS 결제요청과 거래조회를 먼저 확인합니다.</p>
          </div>
          <Badge tone="blue">문서 API 고정</Badge>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <label className="grid gap-1 text-sm font-black text-slate-700 lg:col-span-2">
            INNOPAY_API_BASE_URL
            <input value={runtime.apiBaseUrl} onChange={(event) => updateRuntime({ apiBaseUrl: event.target.value })} className={inputClass()} />
          </label>

          <label className="grid gap-1 text-sm font-black text-slate-700">
            결제 모드
            <select value={runtime.paymentMode} onChange={(event) => updateRuntime({ paymentMode: event.target.value as RuntimeConfig["paymentMode"] })} className={inputClass()}>
              <option value="sms">SMS 카드결제 우선</option>
              <option value="vbank">가상계좌 우선</option>
              <option value="rest">REST 통합</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm font-black text-slate-700">
            SMS 서비스구분
            <select value={runtime.smsSvcPrdtCd} onChange={(event) => updateRuntime({ smsSvcPrdtCd: event.target.value as RuntimeConfig["smsSvcPrdtCd"] })} className={inputClass()}>
              <option value="03">03 SMS 카드결제</option>
              <option value="04">04 SMS 결제</option>
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm font-black text-slate-800">
            <input type="checkbox" checked={runtime.smsEnabled} onChange={(event) => updateRuntime({ smsEnabled: event.target.checked })} />
            SMS API 사용
          </label>
          <label className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm font-black text-slate-800">
            <input type="checkbox" checked={runtime.vbankEnabled} onChange={(event) => updateRuntime({ vbankEnabled: event.target.checked })} />
            가상계좌 API 사용
          </label>
          <label className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm font-black text-red-800">
            <input type="checkbox" checked={runtime.realCallsEnabled} onChange={(event) => updateRuntime({ realCallsEnabled: event.target.checked })} />
            실 PG 호출 허용
          </label>
          <label className="grid gap-1 text-sm font-black text-slate-700">
            가상계좌 Noti URL
            <input value={runtime.vbankNotiUrl} onChange={(event) => updateRuntime({ vbankNotiUrl: event.target.value })} className={inputClass()} />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">문서 기준 엔드포인트 매핑</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-3">기능</th>
                <th className="px-3 py-3">Method</th>
                <th className="px-3 py-3">A5가 호출하는 경로</th>
                <th className="px-3 py-3">성공 기준</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {endpointRows.map(([label, method, path, success]) => (
                <tr key={label}>
                  <td className="px-3 py-3 font-black text-slate-950">{label}</td>
                  <td className="px-3 py-3 font-bold text-blue-700">{method}</td>
                  <td className="px-3 py-3 font-mono text-xs font-bold text-slate-700">{path}</td>
                  <td className="px-3 py-3 font-bold text-slate-700">{success}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">기업별 MID / 키값 입력</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              입력한 원문 키는 저장 요청 시 Functions에서 암호화됩니다. 화면에는 저장 여부만 남기고, Firestore 평문 저장은 하지 않습니다.
            </p>
          </div>
          <Badge tone="slate">MID는 최고관리자만 입력</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {credentials.map((row) => {
            const ready = readinessFor(row, runtime);
            return (
              <div key={row.companyId} className="grid gap-3 rounded-md border border-slate-200 p-3 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr]">
                <div>
                  <p className="text-xs font-black text-slate-500">입점사</p>
                  <p className="mt-1 font-black text-slate-950">{row.companyName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{row.companyId}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone={ready.smsReady ? "green" : "amber"}>SMS {ready.smsReady ? "가능" : "대기"}</Badge>
                    <Badge tone={ready.cancelReady ? "green" : "amber"}>취소 {ready.cancelReady ? "가능" : "대기"}</Badge>
                  </div>
                </div>

                <label className="grid gap-1 text-xs font-black text-slate-500">
                  MID
                  <input value={row.mid} onChange={(event) => updateCredential(row.companyId, { mid: event.target.value })} className={inputClass()} placeholder="testpay02m / 운영 MID" />
                  <span className="font-bold text-slate-400">{maskMerchantId(row.mid || undefined)}</span>
                </label>

                <label className="grid gap-1 text-xs font-black text-slate-500">
                  Merchant-Key
                  <input type="password" value={row.merchantKey} onChange={(event) => updateCredential(row.companyId, { merchantKey: event.target.value })} className={passwordClass(row.merchantKey)} autoComplete="new-password" />
                  <span className="font-bold text-slate-400">거래조회: {maskSecret(row.merchantKey)}</span>
                </label>

                <label className="grid gap-1 text-xs font-black text-slate-500">
                  licenseKey
                  <input type="password" value={row.licenseKey} onChange={(event) => updateCredential(row.companyId, { licenseKey: event.target.value })} className={passwordClass(row.licenseKey)} autoComplete="new-password" />
                  <span className="font-bold text-slate-400">가상계좌: {maskSecret(row.licenseKey)}</span>
                </label>

                <label className="grid gap-1 text-xs font-black text-slate-500">
                  cancelPwd
                  <input type="password" value={row.cancelPwd} onChange={(event) => updateCredential(row.companyId, { cancelPwd: event.target.value })} className={passwordClass(row.cancelPwd)} autoComplete="new-password" />
                  <span className="font-bold text-slate-400">취소 API: {maskSecret(row.cancelPwd)}</span>
                </label>

                <label className="grid gap-1 text-xs font-black text-slate-500">
                  webhook secret
                  <input type="password" value={row.webhookSecret} onChange={(event) => updateCredential(row.companyId, { webhookSecret: event.target.value })} className={passwordClass(row.webhookSecret)} autoComplete="new-password" />
                </label>

                <label className="grid gap-1 text-xs font-black text-slate-500">
                  발급 상태
                  <select value={row.status} onChange={(event) => updateCredential(row.companyId, { status: event.target.value as CredentialInput["status"] })} className={inputClass()}>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-xs font-black text-slate-700">
                  <input type="checkbox" checked={row.smsCard} onChange={(event) => updateCredential(row.companyId, { smsCard: event.target.checked })} />
                  SMS 카드결제 허용
                </label>

                <label className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-xs font-black text-slate-700">
                  <input type="checkbox" checked={row.vbank} onChange={(event) => updateCredential(row.companyId, { vbank: event.target.checked })} />
                  가상계좌 허용
                </label>

                <div className="rounded-md bg-slate-50 p-3 text-xs font-bold text-slate-600">
                  <p className="font-black text-slate-950">운영 판정</p>
                  <p className="mt-1">{ready.fullyReady ? "실결제 전환 후보" : "필수값 대기"}</p>
                  <p className="mt-1">상태: {statusLabels[row.status]}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm font-black ${saveState.status === "error" ? "text-red-700" : saveState.status === "saved" ? "text-emerald-700" : "text-slate-600"}`}>
            {saveState.message || "저장 전에는 실호출 잠금을 유지하세요. 운영 MID로 전환할 때만 실 PG 호출을 허용합니다."}
          </p>
          <button type="button" onClick={saveIntegration} disabled={saveState.status === "saving"} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
            {saveState.status === "saving" ? "저장 중" : "PG 연동값 저장"}
          </button>
        </div>
      </section>
    </section>
  );
}
