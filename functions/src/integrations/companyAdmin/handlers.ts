import { getAdminAuth } from "../../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../../payments/types";
import { deliverIntegrationEventToWebhook } from "../core/webhookDelivery";

type CompanyIntegrationRetryRequest = {
  companyId?: string;
  eventId?: string;
  errorMessage?: string;
};

export async function companyIntegrationEventRetryHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<CompanyIntegrationRetryRequest>(request);
  const companyId = text(body.companyId);
  const eventId = text(body.eventId);

  if (!companyId || !eventId) {
    sendJson(response, 400, {
      ok: false,
      resultCode: 400,
      resultMsg: "companyId and eventId are required.",
    });
    return;
  }

  const actor = await requireCompanyAdmin(request, companyId);
  if (!actor.ok) {
    sendJson(response, actor.status, {
      ok: false,
      resultCode: actor.status,
      resultMsg: actor.message,
    });
    return;
  }

  const result = await deliverIntegrationEventToWebhook(eventId);

  sendJson(response, result.ok ? 200 : 409, {
    ok: result.ok,
    companyId,
    eventId,
    status: result.status,
    result,
  });
}

async function requireCompanyAdmin(
  request: HttpRequestLike,
  companyId: string,
): Promise<{ ok: true; uid: string } | { ok: false; status: number; message: string }> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { ok: false, status: 401, message: "Firebase authorization token is required." };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const tokenCompanyId = String(decoded.company_id ?? "");
    const isAllowed = role === "SUPER_ADMIN" || role === "seed_admin" || (role === "COMPANY_ADMIN" && tokenCompanyId === companyId);

    if (!isAllowed) {
      return { ok: false, status: 403, message: "This account is not allowed to retry integration events for this company." };
    }

    return { ok: true, uid: decoded.uid };
  } catch {
    return { ok: false, status: 401, message: "Firebase authorization token is invalid." };
  }
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
