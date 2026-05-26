import { sendJson, type HttpRequestLike, type HttpResponseLike } from "./types";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";

const publicKeys = [
  "NEXT_PUBLIC_PG_PROVIDER",
  "NEXT_PUBLIC_PG_ENVIRONMENT",
  "NEXT_PUBLIC_PG_CLIENT_KEY",
  "NEXT_PUBLIC_PG_SCRIPT_URL",
  "NEXT_PUBLIC_PAYMENT_SUCCESS_URL",
  "NEXT_PUBLIC_PAYMENT_FAIL_URL",
  "NEXT_PUBLIC_PAYMENT_API_BASE_URL",
] as const;

const serverKeys = [
  "PG_PROVIDER",
  "PG_ENVIRONMENT",
  "PG_SECRET_KEY",
  "PG_WEBHOOK_SECRET",
  "PAYMENT_WEBHOOK_URL",
  "INFINY_CONFIRM_URL",
  "INFINY_API_BASE_URL",
] as const;

function presence(keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, Boolean(process.env[key]?.trim())]));
}

export async function paymentsDiagnosticsHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use GET for payment diagnostics.",
        httpStatus: 405,
      },
    });
    return;
  }

  const readiness = getPgServerReadiness();

  sendJson(response, 200, {
    ok: true,
    source: "firebase_functions",
    pgReadiness: readiness,
    publicKeyPresence: presence(publicKeys),
    serverKeyPresence: presence(serverKeys),
    realPgCanBeCalled: readiness.readyForAdapter,
    handoff: getPgAdapterHandoffPlan(),
    message: readiness.readyForAdapter
      ? "Server PG keys and Infiny endpoint config are present. Company MID/moduleKey/status still decide each payment."
      : "Real PG remains blocked until missing server keys and Infiny endpoint config are filled.",
  });
}
