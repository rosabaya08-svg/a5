import { getAdminAppCheck } from "../firebaseAdmin";
import { AccessHttpError, text } from "./policy";

export type GuardedRequest = {
  get(name: string): string | undefined;
};

function boolEnv(name: string): boolean {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

function configuredOrigins(): string[] {
  return String(process.env.A5_ALLOWED_PUBLIC_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function assertAllowedOrigin(request: GuardedRequest, options: { allowMissing?: boolean } = {}) {
  const origin = text(request.get("origin"), 500);
  const production = process.env.PAYUP_ENVIRONMENT === "production";
  const enforce = production || boolEnv("PAYUP_ENFORCE_ORIGIN_ALLOWLIST");
  if (!enforce) return;
  if (!origin && options.allowMissing) return;
  if (!origin) throw new AccessHttpError(403, "REQUEST_ORIGIN_REQUIRED", "요청 Origin을 확인할 수 없습니다.");
  const allowed = configuredOrigins();
  if (!allowed.length) throw new AccessHttpError(503, "ORIGIN_ALLOWLIST_NOT_CONFIGURED", "A5_ALLOWED_PUBLIC_ORIGINS가 설정되지 않았습니다.");
  if (!allowed.includes(origin)) throw new AccessHttpError(403, "REQUEST_ORIGIN_BLOCKED", "허용되지 않은 사이트의 요청입니다.");
}

export async function requireFirebaseAppCheck(
  request: GuardedRequest,
  options: { allowMissingInTest?: boolean } = {},
) {
  const production = process.env.PAYUP_ENVIRONMENT === "production";
  const required = production || boolEnv("PAYUP_REQUIRE_APP_CHECK");
  if (!required) return null;
  const token = text(request.get("x-firebase-appcheck") ?? request.get("X-Firebase-AppCheck"), 5000);
  if (!token && options.allowMissingInTest && !production) return null;
  if (!token) throw new AccessHttpError(401, "APP_CHECK_REQUIRED", "Firebase App Check 토큰이 필요합니다.");
  try {
    return await getAdminAppCheck().verifyToken(token);
  } catch {
    throw new AccessHttpError(401, "APP_CHECK_INVALID", "Firebase App Check 토큰이 유효하지 않습니다.");
  }
}

export async function enforceBrowserRequestGuards(request: GuardedRequest) {
  assertAllowedOrigin(request);
  await requireFirebaseAppCheck(request);
}
