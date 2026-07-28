export const PAYUP_PROVIDER_ID = "payup";

export function normalizeProviderName(value?: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
}

export function envFlagEnabled(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

export function isPayupProviderName(value?: unknown): boolean {
  const provider = normalizeProviderName(value);
  return provider === "payup" || provider === "payuppg";
}

export function isLegacyInnopayProviderName(value?: unknown): boolean {
  const provider = normalizeProviderName(value);
  return provider === "infiny" || provider === "infini" || provider.includes("innopay");
}

export function isLegacyInnopayEnabled(): boolean {
  return envFlagEnabled("A5_ENABLE_LEGACY_INNOPAY");
}

export function shouldBlockLegacyInnopayProvider(value?: unknown): boolean {
  return isLegacyInnopayProviderName(value) && !isLegacyInnopayEnabled();
}

export function legacyInnopayBlockedMessage(): string {
  return "Legacy InnoPay/Infiny payment is disabled for A5. Use PG_PROVIDER=payup or explicitly enable A5_ENABLE_LEGACY_INNOPAY for controlled legacy diagnostics.";
}
