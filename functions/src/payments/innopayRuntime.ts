import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { decryptCredential } from "./credentialCrypto";

export type InnopayRuntimeSettings = {
  apiBaseUrl: string;
  paymentMode: "sms" | "vbank" | "rest";
  smsEnabled: boolean;
  vbankEnabled: boolean;
  realCallsEnabled: boolean;
  smsSvcPrdtCd: "03" | "04";
};

export type InnopayCompanyCredentials = {
  mid: string;
  merchantKey?: string;
  licenseKey?: string;
  cancelPwd?: string;
  companyName?: string;
  raw: Record<string, unknown>;
};

export async function readInnopayRuntimeSettings(db: Firestore = getAdminDb()): Promise<InnopayRuntimeSettings> {
  const snapshot = await db.collection("pg_provider_settings").doc("infiny").get();
  const data = snapshot.data() ?? {};
  const envRealCalls = envFlag("INNOPAY_REAL_CALLS_ENABLED");
  const envSms = envFlag("INNOPAY_SMS_API_ENABLED");
  const envVbank = envFlag("INNOPAY_VBANK_API_ENABLED");
  const paymentMode = asPaymentMode(data.payment_mode ?? data.paymentMode ?? env("INNOPAY_PAYMENT_MODE"));

  return {
    apiBaseUrl: text(data.api_base_url ?? data.apiBaseUrl) || env("INNOPAY_API_BASE_URL") || env("PG_API_BASE_URL") || env("INFINY_API_BASE_URL") || "https://api.innopay.co.kr",
    paymentMode,
    smsEnabled: booleanValue(data.innopay_sms_api_enabled ?? data.smsEnabled) || envSms || envRealCalls,
    vbankEnabled: booleanValue(data.innopay_vbank_api_enabled ?? data.vbankEnabled) || envVbank || envRealCalls,
    realCallsEnabled: booleanValue(data.innopay_real_calls_enabled ?? data.realCallsEnabled) || envRealCalls,
    smsSvcPrdtCd: text(data.sms_svc_prdt_cd ?? data.smsSvcPrdtCd) === "04" ? "04" : env("INNOPAY_SMS_SVC_PRDT_CD") === "04" ? "04" : "03",
  };
}

export async function readInnopayCompanyCredentials(companyId: string, db: Firestore = getAdminDb()): Promise<InnopayCompanyCredentials> {
  const snapshot = companyId ? await db.collection("company_pg_credentials").doc(companyId).get() : undefined;
  const data = snapshot?.data() ?? {};

  return {
    mid: text(data.mid ?? data.merchant_id ?? data.merchantId) || env("INNOPAY_DEFAULT_MID") || env("PG_MERCHANT_ID"),
    merchantKey: decryptOptional(data.encrypted_sign_key) || env("INNOPAY_DEFAULT_MERCHANT_KEY") || env("INNOPAY_MERCHANT_KEY"),
    licenseKey: decryptOptional(data.encrypted_secret_key) || env("INNOPAY_DEFAULT_LICENSE_KEY") || env("INNOPAY_LICENSE_KEY"),
    cancelPwd: decryptOptional(data.encrypted_merchant_password) || env("INNOPAY_DEFAULT_CANCEL_PWD") || env("INNOPAY_CANCEL_PWD"),
    companyName: text(data.company_name ?? data.companyName),
    raw: data,
  };
}

function decryptOptional(value: unknown): string | undefined {
  try {
    return decryptCredential(value);
  } catch {
    return undefined;
  }
}

function asPaymentMode(value: unknown): "sms" | "vbank" | "rest" {
  const mode = text(value).toLowerCase();
  return mode === "vbank" || mode === "rest" ? mode : "sms";
}

function booleanValue(value: unknown): boolean {
  return value === true || String(value ?? "").trim().toLowerCase() === "true";
}

function envFlag(name: string): boolean {
  return env(name).toLowerCase() === "true";
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
