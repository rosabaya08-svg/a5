import { getPgServerReadiness } from "./providerRuntime";
import type { PaymentProviderId } from "./types";

export type PgProviderCandidate = "toss" | "portone" | "kcp" | "nice" | "unknown";

export type PgProviderAdapterSlot = {
  provider: PaymentProviderId;
  candidate: PgProviderCandidate;
  enabled: false;
  publicKeys: string[];
  serverSecrets: string[];
  blockedOperations: string[];
  handoff: string[];
};

export function resolveProviderCandidate(value?: string): PgProviderCandidate {
  const provider = String(value ?? "").trim().toLowerCase();

  if (provider === "toss" || provider === "tosspayments") return "toss";
  if (provider === "portone" || provider === "iamport") return "portone";
  if (provider === "kcp") return "kcp";
  if (provider === "nice" || provider === "nicepay") return "nice";

  return "unknown";
}

export function getProviderAdapterSlot(providerName?: string): PgProviderAdapterSlot {
  const readiness = getPgServerReadiness();
  const candidate = resolveProviderCandidate(providerName ?? readiness.provider);

  return {
    provider: "pg_contract",
    candidate,
    enabled: false,
    publicKeys: ["NEXT_PUBLIC_PG_PROVIDER", "NEXT_PUBLIC_PG_CLIENT_KEY"],
    serverSecrets: ["PG_SECRET_KEY", "PG_MERCHANT_ID", "PG_CHANNEL_KEY", "PG_WEBHOOK_SECRET"],
    blockedOperations: ["real_approval", "real_cancel", "real_refund", "real_settlement"],
    handoff: [
      "Keep PG_SECRET_KEY on Firebase Functions runtime or Secret Manager only.",
      "Do not expose server secrets to Next.js static export or Cloudflare Pages.",
      "Implement official SDK/API call only inside provider adapter after PG contract review.",
      "Keep server amount recalculation before confirmPayment.",
    ],
  };
}
