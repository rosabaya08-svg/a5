import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { publishStorefrontRuntimeSnapshot } from "./storefrontSnapshot";

type PublishSnapshotRequest = {
  reason?: string;
};

const masterAdminEmail = "rosabaya08@gmail.com";

export async function adminStorefrontSnapshotPublishHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to publish storefront snapshots.", httpStatus: 405 },
    });
    return;
  }

  const actor = await requireSnapshotPublisher(request);

  if (!actor.ok) {
    sendJson(response, actor.status, {
      ok: false,
      error: { code: actor.code, message: actor.message, httpStatus: actor.status },
    });
    return;
  }

  const body = readObjectBody<PublishSnapshotRequest>(request);
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "storefront_snapshot_publish";

  try {
    const snapshot = await publishStorefrontRuntimeSnapshot(getAdminDb(), `${reason}:${actor.role}`);

    sendJson(response, 200, {
      ok: true,
      snapshotId: snapshot.id,
      version: snapshot.version,
      generatedAt: snapshot.generatedAt,
      productCount: snapshot.products.length,
      source: "firebase_functions",
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "STOREFRONT_SNAPSHOT_PUBLISH_FAILED",
        message: error instanceof Error ? error.message : "Storefront runtime snapshot publish failed.",
        httpStatus: 500,
      },
    });
  }
}

async function requireSnapshotPublisher(request: HttpRequestLike) {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      code: "SNAPSHOT_AUTH_REQUIRED",
      message: "Firebase ID token is required.",
    };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const isSuperAdmin = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail;
    const isCompanyAdmin = role === "COMPANY_ADMIN" && Boolean(decoded.company_id);

    if (isSuperAdmin || isCompanyAdmin) {
      return {
        ok: true as const,
        role: isSuperAdmin ? role || "SUPER_ADMIN" : "COMPANY_ADMIN",
      };
    }
  } catch {
    // Return generic denial below.
  }

  return {
    ok: false as const,
    status: 403,
    code: "SNAPSHOT_AUTH_FORBIDDEN",
    message: "The supplied token cannot publish storefront snapshots.",
  };
}
