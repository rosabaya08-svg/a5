import { getPgServerReadiness } from "./providerRuntime";
import type { MockPgApproval, PaymentProviderId } from "./types";

export type PgProviderCandidate = "toss" | "portone" | "kcp" | "nice" | "unknown";

export type PgProviderOperation =
  | "createPaymentIntent"
  | "requestPayment"
  | "confirmPayment"
  | "handleWebhook"
  | "cancelPayment"
  | "refundPayment";

export type PgProviderAdapterSlot = {
  provider: PaymentProviderId;
  candidate: PgProviderCandidate;
  enabled: false;
  publicKeys: string[];
  serverSecrets: string[];
  endpointKeys: string[];
  blockedOperations: string[];
  supportedCandidates: Exclude<PgProviderCandidate, "unknown">[];
  operationPlan: Record<PgProviderOperation, string>;
  handoff: string[];
};

export type ProviderCreateIntentInput = {
  paymentIntentId: string;
  orderNo: string;
  orderName: string;
  amount: number;
  currency: "KRW";
  successUrl?: string;
  failUrl?: string;
};

export type ProviderRequestInput = ProviderCreateIntentInput & {
  clientKey?: string;
  channelKey?: string;
};

export type ProviderConfirmInput = {
  paymentIntentId: string;
  orderNo: string;
  amount: number;
  providerPaymentKey?: string;
};

export type ProviderWebhookInput = {
  eventId: string;
  signature?: string;
  rawBodyBlocked: true;
};

export type ProviderCancelInput = {
  orderNo: string;
  paymentKey?: string;
  amount: number;
  reason: string;
};

export type ProviderRefundInput = ProviderCancelInput & {
  refundReasonCode?: string;
};

export type ProviderBlockedResult = {
  ok: false;
  code: string;
  message: string;
  candidate: PgProviderCandidate;
  operation: PgProviderOperation;
  realPgCalled: false;
};

export type ProviderConfirmResult =
  | { ok: true; approval: MockPgApproval; candidate: PgProviderCandidate; operation: "confirmPayment"; realPgCalled: false }
  | ProviderBlockedResult;

export function resolveProviderCandidate(value?: string): PgProviderCandidate {
  const provider = String(value ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");

  if (provider === "toss" || provider === "tosspayments") return "toss";
  if (provider === "portone" || provider === "iamport") return "portone";
  if (provider === "kcp") return "kcp";
  if (provider === "nice" || provider === "nicepay") return "nice";

  return "unknown";
}

export function providerCandidateToId(candidate: PgProviderCandidate): PaymentProviderId {
  if (candidate === "toss" || candidate === "portone" || candidate === "kcp" || candidate === "nice") return candidate;
  return "pg_contract";
}

export function getProviderAdapterSlot(providerName?: string): PgProviderAdapterSlot {
  const readiness = getPgServerReadiness();
  const candidate = resolveProviderCandidate(providerName ?? readiness.provider);

  return {
    provider: providerCandidateToId(candidate),
    candidate,
    enabled: false,
    publicKeys: ["NEXT_PUBLIC_PG_PROVIDER", "NEXT_PUBLIC_PG_CLIENT_KEY"],
    serverSecrets: ["PG_SECRET_KEY", "PG_MERCHANT_ID", "PG_CHANNEL_KEY", "PG_WEBHOOK_SECRET"],
    endpointKeys: ["NEXT_PUBLIC_PAYMENT_SUCCESS_URL", "NEXT_PUBLIC_PAYMENT_FAIL_URL", "PAYMENT_WEBHOOK_URL", "NEXT_PUBLIC_PAYMENT_API_BASE_URL"],
    blockedOperations: ["real_approval", "real_cancel", "real_refund", "real_settlement"],
    supportedCandidates: ["toss", "portone", "kcp", "nice"],
    operationPlan: {
      createPaymentIntent: "Map A5 order snapshot into provider prepare/request payload after server amount recalculation.",
      requestPayment: "Browser opens the provider module with public client key only.",
      confirmPayment: "Functions calls provider confirm with PG_SECRET_KEY after amount/QR/stock validation.",
      handleWebhook: "Functions verifies PG_WEBHOOK_SECRET signature before any payment state transition.",
      cancelPayment: "Functions calls cancel API only after refund and settlement hold approval.",
      refundPayment: "Interface-only until refund policy, partial refund, and settlement reconciliation are approved.",
    },
    handoff: [
      "Keep PG_SECRET_KEY on Firebase Functions runtime or Secret Manager only.",
      "Do not expose server secrets to Next.js static export or Cloudflare Pages.",
      "Implement official SDK/API call only inside provider adapter after PG contract review.",
      "Keep server amount recalculation before confirmPayment.",
      "Keep webhook idempotency and audit log writes before status transitions.",
    ],
  };
}

export async function createProviderPaymentIntent(input: ProviderCreateIntentInput): Promise<ProviderBlockedResult> {
  void input;
  return blocked("createPaymentIntent", "Provider prepare/create intent branch is not wired to a real PG SDK/API yet.");
}

export async function requestProviderPayment(input: ProviderRequestInput): Promise<ProviderBlockedResult> {
  void input;
  return blocked("requestPayment", "Browser PG module loading is prepared but real SDK import/open is not enabled in this server adapter.");
}

export async function confirmPaymentWithConfiguredProvider(input: ProviderConfirmInput): Promise<ProviderConfirmResult> {
  const readiness = getPgServerReadiness();
  const candidate = resolveProviderCandidate(readiness.provider);

  return {
    ok: true,
    candidate,
    operation: "confirmPayment",
    realPgCalled: false,
    approval: {
      provider: "mock",
      status: "approved_mock",
      mockTid: `MOCK-FN-${input.orderNo}`,
      approvedAt: new Date().toISOString(),
      message: readiness.readyForAdapter
        ? `${candidate} keys appear ready, but provider adapter is still mock-only. No real PG API was used.`
        : "Mock approval only. No PG secret or real API was used.",
    },
  };
}

export async function handleProviderWebhook(input: ProviderWebhookInput): Promise<ProviderBlockedResult> {
  void input;
  return blocked("handleWebhook", "Webhook signature verification waits for PG_WEBHOOK_SECRET and the official provider algorithm.");
}

export async function cancelProviderPayment(input: ProviderCancelInput): Promise<ProviderBlockedResult> {
  void input;
  return blocked("cancelPayment", "Real PG cancel is blocked until refund policy and settlement hold rules are approved.");
}

export async function refundProviderPayment(input: ProviderRefundInput): Promise<ProviderBlockedResult> {
  void input;
  return blocked("refundPayment", "Real PG refund is blocked until refund policy, partial refund rules, and settlement reconciliation are approved.");
}

function blocked(operation: PgProviderOperation, message: string): ProviderBlockedResult {
  const readiness = getPgServerReadiness();
  return {
    ok: false,
    code: "PG_PROVIDER_ADAPTER_NOT_IMPLEMENTED",
    message,
    candidate: resolveProviderCandidate(readiness.provider),
    operation,
    realPgCalled: false,
  };
}
