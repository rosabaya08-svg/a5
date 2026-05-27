import { sendJson, type HttpRequestLike, type HttpResponseLike } from "./types";
import { getProviderAdapterSlot } from "./providerAdapter";
import { getFirebasePaymentModuleContract } from "./moduleContract";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";

const publicKeys = [
  "NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL",
  "NEXT_PUBLIC_A5_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_PG_PROVIDER",
  "NEXT_PUBLIC_PG_ENVIRONMENT",
  "NEXT_PUBLIC_PG_CLIENT_KEY",
  "NEXT_PUBLIC_PG_GLOBAL_NAME",
  "NEXT_PUBLIC_PG_REQUEST_METHOD",
  "NEXT_PUBLIC_PG_SCRIPT_URL",
  "NEXT_PUBLIC_PG_REQUEST_FUNCTION",
  "NEXT_PUBLIC_PAYMENT_SUCCESS_URL",
  "NEXT_PUBLIC_PAYMENT_FAIL_URL",
  "NEXT_PUBLIC_PAYMENT_API_BASE_URL",
] as const;

const serverKeys = [
  "PG_PROVIDER",
  "PG_ENVIRONMENT",
  "PG_SECRET_KEY",
  "PG_MERCHANT_ID",
  "PG_CHANNEL_KEY",
  "PG_WEBHOOK_SECRET",
  "PAYMENT_WEBHOOK_URL",
  "PG_API_BASE_URL",
  "PG_CONFIRM_URL",
  "PG_CANCEL_URL",
  "PG_STATUS_URL",
  "INFINY_CONFIRM_URL",
  "INFINY_API_BASE_URL",
  "INFINY_CANCEL_URL",
  "INFINY_STATUS_URL",
  "PG_WEBHOOK_SIGNATURE_HEADER",
  "PG_WEBHOOK_SIGNATURE_ALGORITHM",
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
  const contract = getFirebasePaymentModuleContract(readiness);

  sendJson(response, 200, {
    ok: true,
    source: "firebase_functions",
    pgReadiness: readiness,
    publicKeyPresence: presence(publicKeys),
    serverKeyPresence: presence(serverKeys),
    realPgCanBeCalled: readiness.readyForAdapter,
    adapterSlot: getProviderAdapterSlot(readiness.provider),
    paymentModuleContract: contract,
    handoff: getPgAdapterHandoffPlan(),
    message: readiness.readyForAdapter
      ? "Firebase payment module server keys and PG endpoint config are present. Each real payment still requires one active company MID/module key."
      : "Real PG remains blocked until the missing Firebase Functions keys/endpoints and each company's active MID/module key are filled.",
  });
}
