import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { buildCustomClaimsDraft, type A5AssignableAuthRole, type A5AuthClaims } from "./verifyClaims";

type AuthBootstrapRequest = {
  action?: string;
  uid?: string;
  email?: string;
  role?: A5AssignableAuthRole;
  company_id?: string;
  companyId?: string;
  nursery_id?: string;
  nurseryId?: string;
  room_id?: string;
  roomId?: string;
  tablet_id?: string;
  tabletId?: string;
};

type AdminActor = {
  uid: string;
  email: string;
  claims: A5AuthClaims;
};

const masterAdminEmail = "rosabaya08@gmail.com";

export async function authBootstrapHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method === "GET") {
    sendJson(response, 200, {
      ok: true,
      source: "firebase_functions",
      function: "authBootstrap",
      actions: ["status", "set_claims", "invite"],
      plainPasswordStored: false,
    });
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use POST for authBootstrap mutations.", httpStatus: 405 },
    });
    return;
  }

  const actor = await requireSuperAdmin(request, response);
  if (!actor) return;

  const body = readObjectBody<AuthBootstrapRequest>(request);
  const action = normalizeAction(body.action);

  try {
    if (action === "status") {
      sendJson(response, 200, {
        ok: true,
        source: "firebase_functions",
        actor: { uid: actor.uid, email: actor.email },
        plainPasswordStored: false,
      });
      return;
    }

    if (action === "set_claims") {
      const target = await resolveTargetUser(body);
      const claims = targetClaims(body);

      await getAdminAuth().setCustomUserClaims(target.uid, claims);
      await writeAuthAudit("auth.custom_claims.set", actor, target.uid, body.email, claims);

      sendJson(response, 200, {
        ok: true,
        action,
        uid: target.uid,
        email: target.email,
        claims,
        plainPasswordStored: false,
        auditAction: "auth.custom_claims.set",
      });
      return;
    }

    if (action === "invite") {
      const email = text(body.email).toLowerCase();
      if (!email || !email.includes("@")) {
        throw new AuthBootstrapError(400, "AUTH_BOOTSTRAP_EMAIL_REQUIRED", "A valid email is required.");
      }

      const claims = targetClaims(body);
      const user = await getOrCreateAuthUser(email);
      await getAdminAuth().setCustomUserClaims(user.uid, claims);

      let passwordResetLinkCreated = false;
      try {
        await getAdminAuth().generatePasswordResetLink(email);
        passwordResetLinkCreated = true;
      } catch {
        passwordResetLinkCreated = false;
      }

      await writeAuthAudit("auth.invite", actor, user.uid, email, claims, { passwordResetLinkCreated });

      sendJson(response, 200, {
        ok: true,
        action,
        uid: user.uid,
        email,
        claims,
        passwordResetLinkCreated,
        plainPasswordStored: false,
        auditAction: "auth.invite",
      });
      return;
    }

    throw new AuthBootstrapError(400, "AUTH_BOOTSTRAP_ACTION_INVALID", "Unsupported authBootstrap action.");
  } catch (error) {
    if (error instanceof AuthBootstrapError) {
      sendJson(response, error.httpStatus, {
        ok: false,
        error: { code: error.code, message: error.message, httpStatus: error.httpStatus },
      });
      return;
    }

    const message = error instanceof Error ? error.message : "authBootstrap failed.";
    sendJson(response, 500, {
      ok: false,
      error: { code: "AUTH_BOOTSTRAP_FAILED", message, httpStatus: 500 },
    });
  }
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<AdminActor | null> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: { code: "AUTH_BOOTSTRAP_AUTH_REQUIRED", message: "Firebase ID token is required.", httpStatus: 401 },
    });
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const allowed = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail;

    if (allowed) {
      return {
        uid: decoded.uid,
        email,
        claims: {
          role: role === "seed_admin" ? "seed_admin" : "SUPER_ADMIN",
          seed_admin: decoded.seed_admin === true || role === "seed_admin" ? true : undefined,
        },
      };
    }
  } catch {
    // Return a generic denial below.
  }

  sendJson(response, 403, {
    ok: false,
    error: { code: "AUTH_BOOTSTRAP_FORBIDDEN", message: "SUPER_ADMIN permission is required.", httpStatus: 403 },
  });
  return null;
}

function targetClaims(body: AuthBootstrapRequest) {
  const role = body.role;

  if (!role) {
    throw new AuthBootstrapError(400, "AUTH_BOOTSTRAP_ROLE_REQUIRED", "role is required.");
  }

  return buildCustomClaimsDraft(role, {
    company_id: text(body.company_id ?? body.companyId),
    nursery_id: text(body.nursery_id ?? body.nurseryId),
    room_id: text(body.room_id ?? body.roomId),
    tablet_id: text(body.tablet_id ?? body.tabletId),
  });
}

async function resolveTargetUser(body: AuthBootstrapRequest) {
  const uid = text(body.uid);
  const email = text(body.email).toLowerCase();

  if (uid) {
    const user = await getAdminAuth().getUser(uid);
    return { uid: user.uid, email: user.email ?? email };
  }

  if (email) {
    const user = await getOrCreateAuthUser(email);
    return { uid: user.uid, email };
  }

  throw new AuthBootstrapError(400, "AUTH_BOOTSTRAP_TARGET_REQUIRED", "uid or email is required.");
}

async function getOrCreateAuthUser(email: string) {
  const auth = getAdminAuth();
  const existing = await auth.getUserByEmail(email).catch(() => null);
  return existing ?? auth.createUser({ email, emailVerified: false, disabled: false });
}

async function writeAuthAudit(
  action: string,
  actor: AdminActor,
  targetUid: string,
  targetEmail: string | undefined,
  claims: A5AuthClaims,
  extra: Record<string, unknown> = {},
) {
  const id = `${action.replace(/[^a-z0-9]+/gi, "-")}-${targetUid}-${Date.now()}`;
  await getAdminDb().collection("audit_logs").doc(id).set({
    type: "auth_bootstrap",
    action,
    actor_uid: actor.uid,
    actor_email: actor.email,
    target_uid: targetUid,
    target_email: targetEmail ?? "",
    claims,
    plain_password_stored: false,
    ...extra,
    created_at: FieldValue.serverTimestamp(),
  });
}

function normalizeAction(value: unknown) {
  const action = text(value).toLowerCase().replace(/[-\s]+/g, "_");
  if (!action || action === "health" || action === "readiness") return "status";
  if (["setclaims", "set_custom_claims", "claims_set", "claims:set"].includes(action)) return "set_claims";
  if (["invite_user", "password_reset_link", "reset_link"].includes(action)) return "invite";
  return action;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

class AuthBootstrapError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
