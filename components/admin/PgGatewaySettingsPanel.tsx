"use client";

import { useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { mockCompanies } from "@/data/mockCompanies";
import { saveCmsRecord, type CmsCollectionName } from "@/lib/firebase/contentRepository";
import { getFirebaseAuthClient, getFirebaseDb } from "@/lib/firebase/client";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import {
  buildPgEnvTemplate,
  defaultInfinyPgRuntimeConfig,
  evaluateInfinyPgProvisioning,
  INFINY_PG_SETTINGS_STORAGE_KEY,
  type InfinyMerchantConfig,
  type InfinyPgProvisioningState,
  type InfinyPgRuntimeConfig,
} from "@/lib/payments/infinyPgProvisioning";
import {
  A5_PLATFORM_FEE_RATE,
  calculateInfinySettlement,
  INFINY_PG_FEE_RATE,
  INFINY_PROVIDER_LABEL,
  maskMerchantId,
} from "@/lib/payments/infinySettlementPolicy";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { PgMerchantStatus, PgProvider } from "@/types/commerce";

const pgGatewayCollection = "pg_gateway_settings" as CmsCollectionName;
const providerOptions: PgProvider[] = ["infiny", "mock", "toss", "portone", "kcp", "nice"];
const providerLabels: Record<PgProvider, string> = {
  infiny: "인피니 PG",
  mock: "모의 결제",
  toss: "토스페이먼츠",
  portone: "포트원",
  kcp: "KCP",
  nice: "나이스페이먼츠",
};

const merchantStatusLabels: Record<PgMerchantStatus, string> = {
  not_applied: "신청 전",
  in_review: "인피니 심사 중",
  mid_issued: "MID 발급",
  active: "운영 가능",
  blocked: "차단",
};

const runtimeTextFields: Array<{ key: keyof InfinyPgRuntimeConfig; label: string; placeholder: string }> = [
  { key: "clientKey", label: "공개 client key *", placeholder: "브라우저 공개키" },
  { key: "channelKey", label: "channel key *", placeholder: "인피니 채널 키" },
  { key: "merchantId", label: "대표/플랫폼 MID", placeholder: "별도 발급 시에만 입력" },
  { key: "apiBaseUrl", label: "결제 API base URL *", placeholder: "https://.../payments" },
  { key: "confirmUrl", label: "승인 confirm endpoint", placeholder: "https://.../payments/confirm" },
  { key: "cancelUrl", label: "취소 cancel endpoint", placeholder: "https://.../payments/cancel" },
  { key: "statusUrl", label: "상태 status endpoint", placeholder: "https://.../payments/status" },
  { key: "scriptUrl", label: "공식 스크립트/SDK URL", placeholder: "https://..." },
  { key: "requestFunctionName", label: "브라우저 결제 호출 함수명 *", placeholder: "INNOPAY.requestPayment" },
  { key: "webhookUrl", label: "webhook URL *", placeholder: "https://.../webhook" },
  { key: "webhookSignatureHeader", label: "Webhook 서명 헤더명 *", placeholder: "x-pg-signature" },
  { key: "successUrl", label: "결제 성공 URL *", placeholder: "https://.../payment/success" },
  { key: "failUrl", label: "결제 실패 URL *", placeholder: "https://.../payment/fail" },
  { key: "secretKeyRef", label: "PG_SECRET_KEY Secret Manager 참조 *", placeholder: "projects/.../secrets/PG_SECRET_KEY" },
  { key: "webhookSecretRef", label: "PG_WEBHOOK_SECRET 참조 *", placeholder: "projects/.../secrets/PG_WEBHOOK_SECRET" },
];

const runtimeCheckFields: Array<{ key: keyof InfinyPgRuntimeConfig; label: string }> = [
  { key: "officialModuleReceived", label: "인피니 공식 모듈/SDK 수령" },
  { key: "officialDocsReviewed", label: "공식 문서 검토 완료" },
  { key: "splitSettlementEnabled", label: "기업별 MID 분할정산 사용" },
  { key: "amountRecalculationEnabled", label: "서버 금액 재계산 적용" },
  { key: "webhookSignatureEnabled", label: "Webhook 서명 검증 적용" },
];

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type MerchantSecretInputs = {
  secretKey: string;
  merchantPassword: string;
  signKey: string;
  webhookSecret: string;
};

type MerchantSecretState = Record<string, MerchantSecretInputs>;

function initialMerchantRows(): InfinyMerchantConfig[] {
  return mockCompanies.map((company) => normalizeMerchantRow({
    companyId: company.id,
    companyName: company.name,
    companyStatus: company.status,
    merchantId: company.pgProfile?.merchantId ?? "",
    merchantSerialNo: "",
    moduleKey: company.pgProfile?.moduleKey ?? "",
    terminalId: "",
    secretKeyRef: "",
    merchantPasswordRef: "",
    signKeyRef: "",
    webhookSecretRef: "",
    merchantStatus: company.pgProfile?.merchantStatus ?? "not_applied",
  }));
}

function normalizeMerchantRow(row: Partial<InfinyMerchantConfig>): InfinyMerchantConfig {
  return {
    companyId: row.companyId ?? "",
    companyName: row.companyName ?? row.companyId ?? "",
    companyStatus: row.companyStatus ?? "approved",
    merchantId: row.merchantId ?? "",
    merchantSerialNo: row.merchantSerialNo ?? "",
    moduleKey: row.moduleKey ?? "",
    terminalId: row.terminalId ?? "",
    secretKeyRef: row.secretKeyRef ?? "",
    merchantPasswordRef: row.merchantPasswordRef ?? "",
    signKeyRef: row.signKeyRef ?? "",
    webhookSecretRef: row.webhookSecretRef ?? "",
    merchantStatus: row.merchantStatus ?? "not_applied",
  };
}

function readInitialState(): InfinyPgProvisioningState {
  const fallback: InfinyPgProvisioningState = {
    id: "infiny-pg-runtime",
    runtime: defaultInfinyPgRuntimeConfig,
    merchants: initialMerchantRows(),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(INFINY_PG_SETTINGS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<InfinyPgProvisioningState>;

    return {
      id: parsed.id || fallback.id,
      runtime: { ...defaultInfinyPgRuntimeConfig, ...parsed.runtime },
      merchants: parsed.merchants?.length ? parsed.merchants.map(normalizeMerchantRow) : fallback.merchants,
      updatedAt: parsed.updatedAt || fallback.updatedAt,
    };
  } catch {
    return fallback;
  }
}

function inputClass() {
  return "h-12 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-500";
}

function emptyMerchantSecrets(): MerchantSecretInputs {
  return { secretKey: "", merchantPassword: "", signKey: "", webhookSecret: "" };
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
    throw new Error(data?.error?.message || data?.message || "Firebase Functions PG 요청이 실패했습니다.");
  }
  return data;
}

export function PgGatewaySettingsPanel() {
  const [state, setState] = useState<InfinyPgProvisioningState>(() => readInitialState());
  const [merchantSecrets, setMerchantSecrets] = useState<MerchantSecretState>({});
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const readiness = useMemo(() => evaluateInfinyPgProvisioning(state.runtime, state.merchants), [state.runtime, state.merchants]);
  const feePreview = useMemo(() => calculateInfinySettlement(100000), []);
  const envTemplate = useMemo(() => buildPgEnvTemplate(state.runtime), [state.runtime]);
  const paymentEndpoints = useMemo(() => getPaymentEndpointReadiness(), []);

  function updateRuntime<K extends keyof InfinyPgRuntimeConfig>(key: K, value: InfinyPgRuntimeConfig[K]) {
    setState((current) => ({
      ...current,
      runtime: { ...current.runtime, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateMerchant(companyId: string, patch: Partial<InfinyMerchantConfig>) {
    setState((current) => ({
      ...current,
      merchants: current.merchants.map((row) => (row.companyId === companyId ? { ...row, ...patch } : row)),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateMerchantSecret(companyId: string, patch: Partial<MerchantSecretInputs>) {
    setMerchantSecrets((current) => ({
      ...current,
      [companyId]: { ...(current[companyId] ?? emptyMerchantSecrets()), ...patch },
    }));
  }

  async function saveSettings() {
    const nextState = { ...state, updatedAt: new Date().toISOString() };
    const db = getFirebaseDb();
    setSaveState({ status: "saving", message: "인피니 PG 설정과 기업별 MID를 저장하는 중입니다." });

    try {
      if (!db) throw new Error("Firebase web config is missing.");

      window.localStorage.setItem(INFINY_PG_SETTINGS_STORAGE_KEY, JSON.stringify(nextState));

      await saveCmsRecord(pgGatewayCollection, {
        id: nextState.id,
        title: "인피니 PG 런타임 설정",
        status: readiness.ready ? "live" : "draft",
        approval_status: readiness.ready ? "live" : "draft",
        source_app: "admin",
        provider: nextState.runtime.provider,
        environment: nextState.runtime.environment,
        public_client_key_set: Boolean(nextState.runtime.clientKey),
        public_client_key: nextState.runtime.clientKey || null,
        channel_key_set: Boolean(nextState.runtime.channelKey),
        channel_key: nextState.runtime.channelKey || null,
        representative_merchant_id: nextState.runtime.merchantId || null,
        api_base_url: nextState.runtime.apiBaseUrl,
        confirm_url: nextState.runtime.confirmUrl,
        cancel_url: nextState.runtime.cancelUrl,
        status_url: nextState.runtime.statusUrl,
        script_url: nextState.runtime.scriptUrl,
        global_name: "",
        request_function_name: nextState.runtime.requestFunctionName,
        success_url: nextState.runtime.successUrl,
        fail_url: nextState.runtime.failUrl,
        webhook_url: nextState.runtime.webhookUrl,
        webhook_signature_header: nextState.runtime.webhookSignatureHeader,
        webhook_signature_algorithm: nextState.runtime.webhookSignatureAlgorithm,
        secret_key_ref: nextState.runtime.secretKeyRef,
        webhook_secret_ref: nextState.runtime.webhookSecretRef,
        split_settlement_enabled: nextState.runtime.splitSettlementEnabled,
        official_module_received: nextState.runtime.officialModuleReceived,
        official_docs_reviewed: nextState.runtime.officialDocsReviewed,
        amount_recalculation_enabled: nextState.runtime.amountRecalculationEnabled,
        webhook_signature_enabled: nextState.runtime.webhookSignatureEnabled,
        readiness,
        merchants: nextState.merchants,
      });

      await setDoc(
        doc(db, "pg_provider_settings", "infiny"),
        {
          id: "infiny",
          provider: nextState.runtime.provider,
          environment: nextState.runtime.environment,
          status: readiness.ready ? "active" : "testing",
          public_client_key_set: Boolean(nextState.runtime.clientKey),
          public_client_key: nextState.runtime.clientKey || null,
          channel_key_set: Boolean(nextState.runtime.channelKey),
          channel_key: nextState.runtime.channelKey || null,
          api_base_url: nextState.runtime.apiBaseUrl,
          confirm_url: nextState.runtime.confirmUrl,
          cancel_url: nextState.runtime.cancelUrl,
          status_url: nextState.runtime.statusUrl,
          script_url: nextState.runtime.scriptUrl,
          global_name: "",
          request_function_name: nextState.runtime.requestFunctionName,
          success_url: nextState.runtime.successUrl,
          fail_url: nextState.runtime.failUrl,
          webhook_url: nextState.runtime.webhookUrl,
          webhook_signature_header: nextState.runtime.webhookSignatureHeader,
          webhook_signature_algorithm: nextState.runtime.webhookSignatureAlgorithm,
          secret_key_ref: nextState.runtime.secretKeyRef,
          webhook_secret_ref: nextState.runtime.webhookSecretRef,
          raw_secret_stored: false,
          secret_storage_policy: "firebase_functions_secret_manager",
          readiness,
          updated_at: serverTimestamp(),
        },
        { merge: true },
      );

      await Promise.all(
        nextState.merchants.map((row) => {
          const secrets = merchantSecrets[row.companyId] ?? emptyMerchantSecrets();
          return postAdminPaymentFunction(paymentEndpoints.endpoints.adminPgCredentialSave, {
            companyId: row.companyId,
            companyName: row.companyName,
            provider: nextState.runtime.provider,
            environment: nextState.runtime.environment,
            mid: row.merchantId,
            merchantSerialNo: row.merchantSerialNo,
            moduleKey: row.moduleKey,
            terminalId: row.terminalId,
            secretKeyRef: row.secretKeyRef,
            merchantPasswordRef: row.merchantPasswordRef,
            signKeyRef: row.signKeyRef,
            webhookSecretRef: row.webhookSecretRef,
            secretKey: secrets.secretKey || undefined,
            merchantPassword: secrets.merchantPassword || undefined,
            signKey: secrets.signKey || undefined,
            webhookSecret: secrets.webhookSecret || undefined,
            status: row.merchantStatus,
          });
        }),
      );

      setState(nextState);
      setSaveState({
        status: "saved",
        message: readiness.ready
          ? "PG 설정과 기업별 MID를 저장했습니다. 결제 준비 단계에서 각 기업 MID가 결제 payload로 전달됩니다."
          : `저장했습니다. 운영 결제 오픈 전 남은 필수 항목 ${readiness.blockers.length}개를 완료해야 합니다.`,
      });
    } catch (error) {
      console.error(error);
      setSaveState({ status: "error", message: "PG 설정 저장에 실패했습니다. 최고관리자 권한, Firebase 설정, Firestore 규칙을 확인해 주세요." });
    }
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">payment critical path</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">인피니 PG / 기업별 MID 관리</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              인피니에서 기업별 MID, client key, channel key, webhook URL, 공식 모듈 정보를 받으면 이 화면에 입력합니다. 실결제는 장바구니
              상품의 기업 ID로 companies 문서의 활성 MID를 조회한 뒤 진행합니다.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${readiness.ready ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
            {readiness.ready ? "연동 준비 완료" : "필수값 대기"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["PG사", INFINY_PROVIDER_LABEL],
            ["인피니 수수료", formatPercent(INFINY_PG_FEE_RATE)],
            ["A5 주문 수수료", formatPercent(A5_PLATFORM_FEE_RATE)],
            ["운영 가능 MID", `${readiness.activeMerchantCount}개`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-500">{label}</p>
              <p className="mt-1 text-base font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-slate-700">
            PG사
            <select value={state.runtime.provider} onChange={(event) => updateRuntime("provider", event.target.value as PgProvider)} className={inputClass()}>
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {providerLabels[provider]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700">
            운영 환경
            <select value={state.runtime.environment} onChange={(event) => updateRuntime("environment", event.target.value as "test" | "production")} className={inputClass()}>
              <option value="test">Sandbox/Test</option>
              <option value="production">Production</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700">
            Webhook 서명 알고리즘
            <select
              value={state.runtime.webhookSignatureAlgorithm}
              onChange={(event) => updateRuntime("webhookSignatureAlgorithm", event.target.value as "sha256" | "sha512")}
              className={inputClass()}
            >
              <option value="sha256">HMAC SHA-256</option>
              <option value="sha512">HMAC SHA-512</option>
            </select>
          </label>

          {runtimeTextFields.map(({ key, label, placeholder }) => (
            <label key={key} className="grid gap-2 text-sm font-black text-slate-700">
              {label}
              <input
                value={String(state.runtime[key] ?? "")}
                onChange={(event) => updateRuntime(key, event.target.value as never)}
                className={inputClass()}
                placeholder={placeholder}
              />
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {runtimeCheckFields.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm font-black text-slate-800">
              <input type="checkbox" checked={Boolean(state.runtime[key])} onChange={(event) => updateRuntime(key, event.target.checked as never)} />
              {label}
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-black">남은 필수 항목</p>
            <div className="mt-2 grid gap-2">
              {readiness.blockers.length ? (
                readiness.blockers.map((blocker) => (
                  <p key={blocker} className="font-bold">
                    - {blocker}
                  </p>
                ))
              ) : (
                <p className="font-bold text-emerald-800">모든 필수 항목이 준비되었습니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-950 p-4 text-white">
            <p className="text-sm font-black">배포 환경변수 템플릿</p>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-3 text-xs leading-5">{envTemplate}</pre>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm font-black ${saveState.status === "error" ? "text-red-700" : saveState.status === "saved" ? "text-emerald-700" : "text-slate-600"}`}>
            {saveState.message || "비밀키 원문은 입력하지 말고 Secret Manager 참조명만 기록합니다."}
          </p>
          <button type="button" onClick={saveSettings} disabled={saveState.status === "saving"} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
            PG 설정 저장
          </button>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">기업별 인피니 MID 발급 현황</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">기업 어드민에는 상태만 노출하고, MID 입력/변경은 최고관리자에서 관리합니다.</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">기업 입력 불가</span>
        </div>

        <div className="mt-4 grid gap-3">
          {state.merchants.map((row) => {
            const secrets = merchantSecrets[row.companyId] ?? emptyMerchantSecrets();
            const credentialReady = Boolean(
              row.merchantId.trim() &&
                row.merchantSerialNo.trim() &&
                row.moduleKey.trim() &&
                (row.secretKeyRef.trim() || secrets.secretKey.trim()) &&
                (row.merchantPasswordRef.trim() || secrets.merchantPassword.trim()) &&
                (row.signKeyRef.trim() || secrets.signKey.trim()) &&
                (row.webhookSecretRef.trim() || secrets.webhookSecret.trim()) &&
                row.merchantStatus === "active",
            );

            return (
            <div key={row.companyId} className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_1fr_1fr]">
              <div>
                <p className="text-xs font-black text-slate-500">기업명</p>
                <p className="mt-1 font-black text-slate-950">{row.companyName}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{row.companyId}</p>
              </div>

              <label className="grid gap-1 text-xs font-black text-slate-500">
                인피니 MID
                <input
                  value={row.merchantId}
                  onChange={(event) => updateMerchant(row.companyId, { merchantId: event.target.value })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  placeholder="INF-COMPANY-000000"
                />
              </label>

              <label className="grid gap-1 text-xs font-black text-slate-500">
                시리얼번호
                <input
                  value={row.merchantSerialNo}
                  onChange={(event) => updateMerchant(row.companyId, { merchantSerialNo: event.target.value })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  placeholder="인피니 발급 시리얼"
                />
              </label>

              <label className="grid gap-1 text-xs font-black text-slate-500">
                모듈키
                <input
                  value={row.moduleKey}
                  onChange={(event) => updateMerchant(row.companyId, { moduleKey: event.target.value })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  placeholder="moduleKey / channelKey"
                />
              </label>

              <label className="grid gap-1 text-xs font-black text-slate-500">
                터미널 ID
                <input
                  value={row.terminalId}
                  onChange={(event) => updateMerchant(row.companyId, { terminalId: event.target.value })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  placeholder="선택 입력"
                />
              </label>

              <label className="grid gap-1 text-xs font-black text-slate-500">
                PG Secret 참조
                <input
                  value={row.secretKeyRef}
                  onChange={(event) => updateMerchant(row.companyId, { secretKeyRef: event.target.value })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  placeholder="Secret Manager 참조명"
                />
              </label>

              <label className="grid gap-1 text-xs font-black text-slate-500">
                가맹점 비밀번호 참조
                <input
                  value={row.merchantPasswordRef}
                  onChange={(event) => updateMerchant(row.companyId, { merchantPasswordRef: event.target.value })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  placeholder="원문이 아닌 참조명"
                />
              </label>

              <label className="grid gap-1 text-xs font-black text-slate-500">
                SignKey 참조
                <input
                  value={row.signKeyRef}
                  onChange={(event) => updateMerchant(row.companyId, { signKeyRef: event.target.value })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  placeholder="원문이 아닌 참조명"
                />
              </label>

              <label className="grid gap-1 text-xs font-black text-slate-500">
                Webhook Secret 참조
                <input
                  value={row.webhookSecretRef}
                  onChange={(event) => updateMerchant(row.companyId, { webhookSecretRef: event.target.value })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  placeholder="원문이 아닌 참조명"
                />
              </label>

              {[
                ["secretKey", "PG Secret Key"],
                ["merchantPassword", "가맹점 비밀번호"],
                ["signKey", "Sign Key"],
                ["webhookSecret", "Webhook Secret"],
              ].map(([key, label]) => (
                <label key={key} className="grid gap-1 text-xs font-black text-slate-500">
                  {label}
                  <input
                    type="password"
                    value={merchantSecrets[row.companyId]?.[key as keyof MerchantSecretInputs] ?? ""}
                    onChange={(event) => updateMerchantSecret(row.companyId, { [key]: event.target.value } as Partial<MerchantSecretInputs>)}
                    className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                    placeholder="저장 시 Firebase Functions에서 암호화"
                    autoComplete="new-password"
                  />
                </label>
              ))}

              <label className="grid gap-1 text-xs font-black text-slate-500">
                발급 상태
                <select
                  value={row.merchantStatus}
                  onChange={(event) => updateMerchant(row.companyId, { merchantStatus: event.target.value as PgMerchantStatus })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                >
                  {Object.entries(merchantStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-md bg-slate-50 p-3 text-xs font-bold text-slate-600">
                <p className="font-black text-slate-950">결제 적용</p>
                <p className="mt-1">{credentialReady ? "결제 준비 payload 사용 가능" : "필수 발급값 대기"}</p>
                <p className="mt-1">{maskMerchantId(row.merchantId || undefined)}</p>
                <p className="mt-1">Secret 원문 저장 안 함</p>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <h3 className="text-lg font-black text-slate-950">운영 체크 순서</h3>
        {[
          "인피니에서 공식 모듈/SDK, client key, channel key, 기업별 MID, webhook 검증 방식을 수령합니다.",
          "PG_SECRET_KEY와 PG_WEBHOOK_SECRET 원문은 Secret Manager 또는 Functions runtime config에만 저장합니다.",
          "최고관리자가 기업별 MID를 companies/{companyId}에 저장하면 QR 결제 준비 단계에서 해당 MID를 조회합니다.",
          "결제 승인 전 서버에서 주문금액을 재계산하고, webhook 서명 검증이 켜져야 운영 결제를 열 수 있습니다.",
          `100,000원 결제 기준 인피니 ${formatCurrency(feePreview.pgFeeAmount)}, A5 ${formatCurrency(feePreview.platformFeeAmount)}, 기업 정산 예정 ${formatCurrency(feePreview.payoutAmount)}입니다.`,
        ].map((item, index) => (
          <p key={item} className="rounded-md bg-slate-50 p-3 font-bold">
            {index + 1}. {item}
          </p>
        ))}
      </section>
    </section>
  );
}
