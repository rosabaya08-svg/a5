export function createOrderNumber(now = new Date(), suffix?: string): string {
  const ymd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const serial = suffix ?? String(now.getTime()).slice(-6);

  return `A5-${ymd}-${serial}`;
}

export function normalizeOrderNumber(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}
