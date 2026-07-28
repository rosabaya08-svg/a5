import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { decryptCredential, encryptCredential } from "./credentialCrypto";
import { verifyPayupConnection } from "./payupClient";
import {
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
} from "./types";

type ProgramChannel = "a5s" | "a5ws" | "a5ls";
type ProgramRole = "supplier" | "product_owner" | "reseller" | "fulfillment_operator" | "settlement_recipient";

type ProgramDefinition = {
  channel: ProgramChannel;
  programName: string;
  operatorLegalName: string;
  pgMerchantOwnerLegalName: string;
  sourcePartnerLegalName?: string;
};

const definitions: Record<ProgramChannel, ProgramDefinition> = {
  a5s: {
    channel: "a5s",
    programName: "산지바로",
    operatorLegalName: "위드커머스",
    pgMerchantOwnerLegalName: "위드커머스",
  },
  a5ws: {
    channel: "a5ws",
    programName: "홀세일",
    operatorLegalName: "위드커머스",
    pgMerchantOwnerLegalName: "위드커머스",
  },
  a5ls: {
    channel: "a5ls",
    programName: "루쏘",
    operatorLegalName: "루쏘부티크",
    pgMerchantOwnerLegalName: "루쏘부티크",
    sourcePartnerLegalName: "노블레스 허브",
  },
};

const allowedRoles = new Set<ProgramRole>([
  "supplier",
  "product_owner",
  "reseller",
  "fulfillment_operator",
  "settlement_recipient",
]);
const masterAdminEmail = "rosabaya08@gmail.com";

export async function adminProgramPgReadHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  if (!(await requireSuperAdmin(request, response))) return;

  const body = readObjectBody<Record<string, unknown>>(request);
  const channel = parseChannel(body.channel);
  if (!channel) return invalidChannel(response);

  const db = getAdminDb();
  const [programSnapshot, credentialSnapshot, partnerSnapshot, listingSnapshot, intentSnapshot] = await Promise.all([
    db.collection("commerce_programs").doc(channel).get(),
    db.collection("program_pg_credentials").doc(channel).get(),
    db.collection("program_partners").where("program_id", "==", channel).limit(200).get(),
    db.collection("products").where("commerce_program_id", "==", channel).count().get(),
    db.collection("payment_intents").where("commerce_program_id", "==", channel).count().get(),
  ]);

  const programData = programSnapshot.data() ?? {};
  const credentialData = credentialSnapshot.data() ?? {};
  const definition = definitions[channel];
  const partners = partnerSnapshot.docs.map((document) => safePartnerRow(document.id, document.data()));

  sendJson(response, 200, {
    ok: true,
    channel,
    configurationStatus: programSnapshot.exists ? "configured" : "program_missing",
    program: {
      id: channel,
      channel,
      programName: healthyText(programData.program_name) || definition.programName,
      operatorBusinessId: text(programData.operator_business_id),
      operatorLegalName: healthyText(programData.operator_legal_name) || definition.operatorLegalName,
      pgMerchantOwnerBusinessId: text(programData.pg_merchant_owner_business_id),
      pgMerchantOwnerLegalName: healthyText(programData.pg_merchant_owner_legal_name) || definition.pgMerchantOwnerLegalName,
      sourcePartnerLegalName: healthyText(programData.source_partner_legal_name) || definition.sourcePartnerLegalName || "",
      checkoutMode: "parent_merchant",
      settlementMode: "internal_margin_ledger",
      status: text(programData.status) || "configuration_required",
    },
    credential: safeCredentialRow(channel, credentialData),
    partners,
    counts: {
      partners: partners.length,
      listings: listingSnapshot.data().count,
      paymentIntents: intentSnapshot.data().count,
    },
  });
}

export async function adminProgramPgSaveHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  const actor = await requireSuperAdmin(request, response);
  if (!actor) return;

  const body = readObjectBody<Record<string, unknown>>(request);
  const channel = parseChannel(body.channel);
  if (!channel) return invalidChannel(response);

  const definition = definitions[channel];
  const operatorBusinessId = documentId(body.operatorBusinessId);
  const pgMerchantOwnerBusinessId = documentId(body.pgMerchantOwnerBusinessId);
  const merchantId = text(body.merchantId);
  const environment = body.environment === "test" ? "test" : "production";
  const status = ["configuration_required", "active", "blocked"].includes(text(body.status)) ? text(body.status) : "configuration_required";
  const rawAuthKey = text(body.authKey);

  if (!operatorBusinessId || !pgMerchantOwnerBusinessId || !merchantId) {
    return sendError(response, 400, "PROGRAM_PG_REQUIRED", "operatorBusinessId, pgMerchantOwnerBusinessId and merchantId are required.");
  }

  const db = getAdminDb();
  const credentialRef = db.collection("program_pg_credentials").doc(channel);
  const existingSnapshot = await credentialRef.get();
  const existing = existingSnapshot.data() ?? {};
  let encryptedAuthKey: ReturnType<typeof encryptCredential>;
  try {
    encryptedAuthKey = encryptCredential(rawAuthKey);
  } catch (error) {
    return sendError(response, 409, "PROGRAM_PG_VAULT_REQUIRED", error instanceof Error ? error.message : "Credential vault is required.");
  }
  const encryptedSecretStored = Boolean(encryptedAuthKey || isEncryptedCredential(existing.encrypted_auth_key));
  if (!encryptedSecretStored) {
    return sendError(response, 409, "PROGRAM_PG_AUTH_KEY_REQUIRED", "An encrypted PayUp authentication key is required.");
  }

  const programDoc = {
    id: channel,
    channel,
    program_name: definition.programName,
    operator_business_id: operatorBusinessId,
    operator_legal_name: healthyText(body.operatorLegalName) || definition.operatorLegalName,
    pg_merchant_owner_business_id: pgMerchantOwnerBusinessId,
    pg_merchant_owner_legal_name: healthyText(body.pgMerchantOwnerLegalName) || definition.pgMerchantOwnerLegalName,
    source_partner_legal_name: definition.sourcePartnerLegalName || null,
    checkout_mode: "parent_merchant",
    settlement_mode: "internal_margin_ledger",
    status,
    updated_at: FieldValue.serverTimestamp(),
  };
  const credentialDoc = {
    program_id: channel,
    channel,
    provider: "payup",
    pg_merchant_owner_business_id: pgMerchantOwnerBusinessId,
    merchant_id: merchantId,
    merchant_id_masked: maskValue(merchantId, "MID pending"),
    environment,
    status: status === "active" ? "active" : "mid_issued",
    credential_ready: Boolean(merchantId && encryptedSecretStored),
    encrypted_secret_stored: encryptedSecretStored,
    raw_secret_stored: false,
    ...(encryptedAuthKey ? { encrypted_auth_key: encryptedAuthKey } : {}),
    updated_at: FieldValue.serverTimestamp(),
  };

  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection("commerce_programs").doc(channel), programDoc, { merge: true });
    transaction.set(credentialRef, credentialDoc, { merge: true });
    transaction.set(db.collection("payment_audit_logs").doc(), {
      actorType: "SUPER_ADMIN",
      actorUid: actor.uid,
      action: "admin_program_pg_save",
      targetType: "program_pg_credentials",
      targetId: channel,
      after: {
        ...programDoc,
        merchant_id: maskValue(merchantId, "MID pending"),
        encrypted_secret_stored: encryptedSecretStored,
      },
      created_at: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    channel,
    credential: safeCredentialRow(channel, { ...existing, ...credentialDoc }),
  });
}

export async function adminProgramPgConnectionTestHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  const actor = await requireSuperAdmin(request, response);
  if (!actor) return;

  const body = readObjectBody<Record<string, unknown>>(request);
  const channel = parseChannel(body.channel);
  if (!channel) return invalidChannel(response);
  const db = getAdminDb();
  const credentialRef = db.collection("program_pg_credentials").doc(channel);
  const snapshot = await credentialRef.get();
  const data = snapshot.data() ?? {};
  const merchantId = text(data.merchant_id);
  const environment = data.environment === "test" ? "test" : "production";
  let apiKey = "";
  try {
    apiKey = decryptCredential(data.encrypted_auth_key) ?? "";
  } catch {
    return sendError(response, 409, "PROGRAM_PG_DECRYPT_FAILED", "The encrypted PayUp authentication key could not be opened.");
  }
  if (!snapshot.exists || !merchantId || !apiKey) {
    return sendError(response, 409, "PROGRAM_PG_NOT_READY", "The program PayUp MID and encrypted authentication key are required.");
  }

  const result = await verifyPayupConnection({ merchantId, apiKey, environment });
  const testedAt = new Date().toISOString();
  const safeTest = {
    status: result.ok ? "passed" : "failed",
    provider_called: true,
    environment: result.environment,
    code: safeCode(result.code),
    tested_at: testedAt,
  };
  await db.runTransaction(async (transaction) => {
    transaction.set(credentialRef, { last_connection_test: safeTest, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(db.collection("payment_audit_logs").doc(), {
      actorType: "SUPER_ADMIN",
      actorUid: actor.uid,
      action: "admin_program_pg_connection_test",
      targetType: "program_pg_credentials",
      targetId: channel,
      after: safeTest,
      created_at: testedAt,
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, result.ok ? 200 : 409, { ok: result.ok, channel, connectionTest: safeTest });
}

export async function adminProgramPartnerSaveHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  const actor = await requireSuperAdmin(request, response);
  if (!actor) return;

  const body = readObjectBody<Record<string, unknown>>(request);
  const channel = parseChannel(body.channel);
  if (!channel) return invalidChannel(response);
  const partnerBusinessId = documentId(body.partnerBusinessId);
  const roles = Array.isArray(body.roles)
    ? [...new Set(body.roles.map(text).filter((role): role is ProgramRole => allowedRoles.has(role as ProgramRole)))]
    : [];
  if (!partnerBusinessId || roles.length === 0) {
    return sendError(response, 400, "PROGRAM_PARTNER_REQUIRED", "partnerBusinessId and at least one valid role are required.");
  }

  const id = `${channel}__${partnerBusinessId}`;
  const document = {
    id,
    program_id: channel,
    partner_business_id: partnerBusinessId,
    partner_legal_name: healthyText(body.partnerLegalName),
    roles,
    onboarding_status: ["pending", "verified", "blocked"].includes(text(body.onboardingStatus)) ? text(body.onboardingStatus) : "pending",
    contract_status: ["pending", "active", "expired", "blocked"].includes(text(body.contractStatus)) ? text(body.contractStatus) : "pending",
    updated_at: FieldValue.serverTimestamp(),
  };
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection("program_partners").doc(id), document, { merge: true });
    transaction.set(db.collection("payment_audit_logs").doc(), {
      actorType: "SUPER_ADMIN",
      actorUid: actor.uid,
      action: "admin_program_partner_save",
      targetType: "program_partners",
      targetId: id,
      after: document,
      created_at: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    });
  });
  sendJson(response, 200, { ok: true, partner: safePartnerRow(id, document) });
}

function safeCredentialRow(channel: ProgramChannel, data: Record<string, unknown>) {
  const encryptedSecretStored = isEncryptedCredential(data.encrypted_auth_key);
  const encrypted = encryptedSecretStored ? data.encrypted_auth_key as Record<string, unknown> : undefined;
  const fingerprintSource = encrypted && typeof encrypted.ciphertext === "string" ? encrypted.ciphertext : "";
  const lastTest = record(data.last_connection_test);
  return {
    programId: channel,
    provider: "payup",
    pgMerchantOwnerBusinessId: text(data.pg_merchant_owner_business_id),
    merchantId: text(data.merchant_id),
    merchantIdMasked: text(data.merchant_id_masked) || maskValue(text(data.merchant_id), "MID pending"),
    environment: data.environment === "test" ? "test" : "production",
    status: text(data.status) || "not_configured",
    credentialReady: Boolean(data.credential_ready),
    encryptedSecretStored,
    credentialFingerprint: fingerprintSource ? createHash("sha256").update(fingerprintSource).digest("hex").slice(0, 12) : "",
    lastConnectionTest: {
      status: text(lastTest.status) || "not_tested",
      providerCalled: lastTest.provider_called === true,
      environment: text(lastTest.environment),
      code: safeCode(lastTest.code),
      testedAt: text(lastTest.tested_at),
    },
  };
}

function safePartnerRow(id: string, data: Record<string, unknown>) {
  return {
    id,
    partnerBusinessId: text(data.partner_business_id),
    partnerLegalName: healthyText(data.partner_legal_name),
    roles: Array.isArray(data.roles) ? data.roles.map(text).filter(Boolean) : [],
    onboardingStatus: text(data.onboarding_status) || "pending",
    contractStatus: text(data.contract_status) || "pending",
  };
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<{ uid: string } | null> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    sendError(response, 401, "ADMIN_PROGRAM_PG_AUTH_REQUIRED", "Firebase ID token is required.");
    return null;
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    if (role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail) {
      return { uid: decoded.uid };
    }
  } catch {
    // Do not expose token diagnostics.
  }
  sendError(response, 403, "ADMIN_PROGRAM_PG_FORBIDDEN", "SUPER_ADMIN permission is required.");
  return null;
}

function parseChannel(value: unknown): ProgramChannel | null {
  const channel = text(value);
  return channel === "a5s" || channel === "a5ws" || channel === "a5ls" ? channel : null;
}

function invalidChannel(response: HttpResponseLike) {
  return sendError(response, 400, "PROGRAM_CHANNEL_INVALID", "channel must be a5s, a5ws or a5ls.");
}

function sendError(response: HttpResponseLike, status: number, code: string, message: string) {
  sendJson(response, status, { ok: false, error: { code, message, httpStatus: status } });
}

function isEncryptedCredential(value: unknown): boolean {
  const candidate = record(value);
  return candidate.version === "aes-256-gcm:v1" && typeof candidate.iv === "string" && typeof candidate.authTag === "string" && typeof candidate.ciphertext === "string";
}

function documentId(value: unknown): string {
  return text(value).replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

function healthyText(value: unknown): string {
  const candidate = text(value);
  return candidate && !candidate.includes("?") && !candidate.includes("\uFFFD") ? candidate : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeCode(value: unknown): string {
  const code = text(value);
  return /^[A-Za-z0-9_.-]{1,80}$/.test(code) ? code : "";
}

function maskValue(value: string, fallback: string): string {
  if (!value) return fallback;
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 4)}-${"*".repeat(Math.max(value.length - 8, 4))}-${value.slice(-4)}`;
}
