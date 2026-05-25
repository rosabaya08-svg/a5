export type PgServerReadiness = {
  provider: string;
  environment: "test" | "production";
  readyForAdapter: boolean;
  missingKeys: string[];
  secretKeysExpected: string[];
  message: string;
};

const requiredServerKeys = ["PG_PROVIDER", "PG_SECRET_KEY", "PG_MERCHANT_ID", "PG_CHANNEL_KEY", "PG_WEBHOOK_SECRET"] as const;

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getPgServerReadiness(): PgServerReadiness {
  const provider = readEnv("PG_PROVIDER") || "mock";
  const missingKeys = requiredServerKeys.filter((key) => !readEnv(key));
  const readyForAdapter = provider !== "mock" && missingKeys.length === 0;

  return {
    provider,
    environment: readEnv("PG_ENVIRONMENT") === "production" ? "production" : "test",
    readyForAdapter,
    missingKeys,
    secretKeysExpected: ["PG_SECRET_KEY", "PG_WEBHOOK_SECRET"],
    message: readyForAdapter
      ? "PG server keys are present. Real provider adapter can be wired after approval."
      : "PG server keys are missing or provider is mock. Real approval remains blocked.",
  };
}

export function getPgAdapterHandoffPlan(): string[] {
  return [
    "Create a provider adapter from the PG official SDK/API documentation.",
    "Call provider.ready or payment prepare only after server amount recalculation.",
    "Call provider.confirm with PG_SECRET_KEY only inside Firebase Functions or another server runtime.",
    "Verify webhook signatures with PG_WEBHOOK_SECRET before any Firestore status transition.",
    "Keep cancel/refund behind manual approval and settlement hold rules.",
  ];
}
