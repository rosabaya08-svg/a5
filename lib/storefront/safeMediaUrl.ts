const legacyBrokenMediaHosts = new Set(["mommy-a5.pages.dev"]);

export function safeStorefrontMediaUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  if (raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("/") || raw.startsWith("#")) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (legacyBrokenMediaHosts.has(url.hostname.toLowerCase())) return "";
    return raw;
  } catch {
    return "";
  }
}

export function firstSafeStorefrontMediaUrl(...values: unknown[]) {
  for (const value of values) {
    const safe = safeStorefrontMediaUrl(value);
    if (safe) return safe;
  }

  return "";
}
