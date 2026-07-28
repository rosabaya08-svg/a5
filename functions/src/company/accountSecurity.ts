import { createHash, randomBytes, randomInt } from "crypto";
import nodemailer from "nodemailer";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { hashCompanyPassword, verifyCompanyPassword } from "./companyPassword";

type VerificationPurpose = "signup" | "password_change" | "withdrawal";
type AccountSecurityAction =
  | "start_email_verification"
  | "verify_email_code"
  | "change_password"
  | "request_withdrawal";

type CompanyAccountSecurityRequest = {
  action?: AccountSecurityAction;
  purpose?: VerificationPurpose;
  email?: string;
  businessNo?: string;
  companyId?: string;
  verificationId?: string;
  code?: string;
  verificationToken?: string;
  currentPassword?: string;
  newPassword?: string;
  reason?: string;
};

type CompanyAccountActor = {
  uid: string;
  email: string;
  companyId: string;
  role: string;
};

type VerificationEmailResult = {
  status: "sent" | "failed" | "not_configured";
  error?: string;
};

const codeTtlMs = 10 * 60 * 1000;
const tokenTtlMs = 30 * 60 * 1000;
const maxAttempts = 5;

export async function companyAccountSecurityHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<CompanyAccountSecurityRequest>(request);
  const action = body.action;

  if (action === "start_email_verification") {
    await startEmailVerification(request, response, body);
    return;
  }

  if (action === "verify_email_code") {
    await verifyEmailCode(request, response, body);
    return;
  }

  if (action === "change_password") {
    const actor = await requireCompanyActor(request, response);
    if (!actor) return;
    await changePassword(response, body, actor);
    return;
  }

  if (action === "request_withdrawal") {
    const actor = await requireCompanyActor(request, response);
    if (!actor) return;
    await requestWithdrawal(response, body, actor);
    return;
  }

  sendJson(response, 400, {
    ok: false,
    error: { code: "COMPANY_ACCOUNT_SECURITY_ACTION_INVALID", message: "A valid account security action is required.", httpStatus: 400 },
  });
}

export async function consumeCompanyEmailVerification(input: {
  verificationId?: string;
  verificationToken?: string;
  email?: string;
  purpose: VerificationPurpose;
  companyId?: string;
  businessNo?: string;
}) {
  const verificationId = text(input.verificationId);
  const token = text(input.verificationToken);
  const email = normalizeEmail(input.email);

  if (!verificationId || !token || !email) {
    return { ok: false as const, code: "EMAIL_VERIFICATION_REQUIRED", message: "Email verification is required." };
  }

  const db = getAdminDb();
  const ref = db.collection("company_email_verifications").doc(verificationId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return { ok: false as const, code: "EMAIL_VERIFICATION_NOT_FOUND", message: "Email verification was not found." };
  }

  const data = snapshot.data() ?? {};
  const expectedTokenHash = text(data.verification_token_hash);
  const verifiedAt = timestampMillis(data.verified_at);
  const consumedAt = timestampMillis(data.consumed_at);
  const tokenExpiresAt = timestampMillis(data.token_expires_at);
  const tokenHash = hashSecret(token, verificationId, email, input.purpose, "token");

  if (
    text(data.purpose) !== input.purpose ||
    normalizeEmail(data.email) !== email ||
    (input.companyId && text(data.company_id) && text(data.company_id) !== input.companyId) ||
    (input.businessNo && text(data.business_no_normalized) && text(data.business_no_normalized) !== normalizeBusinessNo(input.businessNo)) ||
    !verifiedAt ||
    consumedAt ||
    !tokenExpiresAt ||
    tokenExpiresAt <= Date.now() ||
    !expectedTokenHash ||
    expectedTokenHash !== tokenHash
  ) {
    return { ok: false as const, code: "EMAIL_VERIFICATION_INVALID", message: "Email verification is invalid or expired." };
  }

  await ref.set(
    {
      consumed_at: FieldValue.serverTimestamp(),
      status: "consumed",
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true as const };
}

async function startEmailVerification(
  request: HttpRequestLike,
  response: HttpResponseLike,
  body: CompanyAccountSecurityRequest,
) {
  const purpose = normalizePurpose(body.purpose);
  if (!purpose) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "EMAIL_VERIFICATION_PURPOSE_INVALID", message: "A valid verification purpose is required.", httpStatus: 400 },
    });
    return;
  }

  let email = normalizeEmail(body.email);
  let companyId = text(body.companyId);
  let businessNo = normalizeBusinessNo(body.businessNo);
  let actor: CompanyAccountActor | null = null;

  if (purpose !== "signup") {
    actor = await requireCompanyActor(request, response);
    if (!actor) return;

    companyId = actor.companyId;
    const company = await readCompanyById(companyId);
    email = normalizeEmail(company.manager_email ?? company.managerEmail ?? company.auth_email ?? actor.email);
    businessNo = normalizeBusinessNo(company.business_registration_number ?? company.businessRegistrationNumber ?? "");
  }

  if (!email || !email.includes("@")) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "EMAIL_VERIFICATION_EMAIL_INVALID", message: "A valid email is required.", httpStatus: 400 },
    });
    return;
  }

  const verificationId = `company-email-${Date.now()}-${randomBytes(8).toString("hex")}`;
  const code = String(randomInt(100000, 1000000));
  const now = Date.now();
  const expiresAt = new Date(now + codeTtlMs);
  const db = getAdminDb();
  const emailResult = await sendVerificationEmail({
    to: email,
    code,
    purpose,
    companyId,
    businessNo,
  });

  await safeWriteEmailDeliveryAudit({
    actor,
    purpose,
    companyId,
    email,
    status: emailResult.status,
    provider: verificationEmailProvider(),
    errorCode:
      emailResult.status === "not_configured"
        ? "EMAIL_DELIVERY_NOT_CONFIGURED"
        : emailResult.status === "failed"
          ? "EMAIL_DELIVERY_FAILED"
          : "",
  });

  if (emailResult.status !== "sent") {
    const httpStatus = emailResult.status === "not_configured" ? 503 : 502;
    const errorCode = emailResult.status === "not_configured" ? "EMAIL_DELIVERY_NOT_CONFIGURED" : "EMAIL_DELIVERY_FAILED";

    sendJson(response, httpStatus, {
      ok: false,
      emailStatus: emailResult.status,
      emailMasked: maskEmail(email),
      error: {
        code: errorCode,
        message:
          emailResult.status === "not_configured"
            ? "이메일 인증 발송 설정이 없습니다. 운영 이메일 발송 설정을 먼저 등록해야 합니다."
            : "이메일 인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        httpStatus,
      },
    });
    return;
  }

  await db.collection("company_email_verifications").doc(verificationId).set({
    id: verificationId,
    purpose,
    email,
    company_id: companyId || null,
    business_no_normalized: businessNo || null,
    code_hash: hashSecret(code, verificationId, email, purpose, "code"),
    attempts: 0,
    max_attempts: maxAttempts,
    status: "sent",
    email_status: emailResult.status,
    email_error: emailResult.error ?? "",
    expires_at: Timestamp.fromDate(expiresAt),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  sendJson(response, 200, {
    ok: true,
    verificationId,
    emailMasked: maskEmail(email),
    emailStatus: emailResult.status,
    expiresInSeconds: Math.floor(codeTtlMs / 1000),
  });
}

async function verifyEmailCode(request: HttpRequestLike, response: HttpResponseLike, body: CompanyAccountSecurityRequest) {
  const purpose = normalizePurpose(body.purpose);
  const verificationId = text(body.verificationId);
  const code = text(body.code);
  let email = normalizeEmail(body.email);
  let companyId = "";

  if (purpose && purpose !== "signup") {
    const actor = await requireCompanyActor(request, response);
    if (!actor) return;

    const company = await readCompanyById(actor.companyId);
    companyId = actor.companyId;
    email = normalizeEmail(company.manager_email ?? company.managerEmail ?? company.auth_email ?? actor.email);
  }

  if (!purpose || !verificationId || !code || !email) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "EMAIL_VERIFICATION_VERIFY_INVALID", message: "verificationId, email, purpose, and code are required.", httpStatus: 400 },
    });
    return;
  }

  const db = getAdminDb();
  const ref = db.collection("company_email_verifications").doc(verificationId);
  const verificationToken = randomBytes(24).toString("base64url");
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      return { ok: false as const, status: 404, code: "EMAIL_VERIFICATION_NOT_FOUND", message: "Verification was not found." };
    }

    const data = snapshot.data() ?? {};
    const attempts = numberValue(data.attempts);
    const expiresAt = timestampMillis(data.expires_at);
    const consumedAt = timestampMillis(data.consumed_at);
    const codeHash = hashSecret(code, verificationId, email, purpose, "code");

    if (
      text(data.purpose) !== purpose ||
      normalizeEmail(data.email) !== email ||
      (companyId && text(data.company_id) && text(data.company_id) !== companyId) ||
      consumedAt ||
      !expiresAt ||
      expiresAt <= Date.now() ||
      attempts >= maxAttempts
    ) {
      return { ok: false as const, status: 403, code: "EMAIL_VERIFICATION_EXPIRED", message: "Verification is expired or locked." };
    }

    if (text(data.code_hash) !== codeHash) {
      transaction.set(ref, { attempts: attempts + 1, updated_at: FieldValue.serverTimestamp() }, { merge: true });
      return { ok: false as const, status: 403, code: "EMAIL_VERIFICATION_CODE_INVALID", message: "Verification code does not match." };
    }

    transaction.set(
      ref,
      {
        verification_token_hash: hashSecret(verificationToken, verificationId, email, purpose, "token"),
        verified_at: FieldValue.serverTimestamp(),
        token_expires_at: Timestamp.fromDate(new Date(Date.now() + tokenTtlMs)),
        status: "verified",
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true as const };
  });

  if (!result.ok) {
    sendJson(response, result.status, { ok: false, error: { code: result.code, message: result.message, httpStatus: result.status } });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    verificationToken,
    expiresInSeconds: Math.floor(tokenTtlMs / 1000),
  });
}

async function changePassword(response: HttpResponseLike, body: CompanyAccountSecurityRequest, actor: CompanyAccountActor) {
  const currentPassword = text(body.currentPassword);
  const newPassword = text(body.newPassword);

  if (!isStrongPassword(newPassword)) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "COMPANY_PASSWORD_POLICY_FAILED", message: "Password must be at least 8 characters and include a special character.", httpStatus: 400 },
    });
    return;
  }

  const company = await readCompanyById(actor.companyId);
  if (!verifyCompanyPassword({
    password: currentPassword,
    passwordHash: text(company.company_login_password_hash),
    legacyPassword: text(company.company_login_password),
  })) {
    sendJson(response, 403, {
      ok: false,
      error: { code: "COMPANY_CURRENT_PASSWORD_INVALID", message: "Current password does not match.", httpStatus: 403 },
    });
    return;
  }

  const email = normalizeEmail(company.manager_email ?? company.managerEmail ?? company.auth_email ?? actor.email);
  const consumed = await consumeCompanyEmailVerification({
    verificationId: body.verificationId,
    verificationToken: body.verificationToken,
    email,
    purpose: "password_change",
    companyId: actor.companyId,
  });

  if (!consumed.ok) {
    sendJson(response, 403, { ok: false, error: { code: consumed.code, message: consumed.message, httpStatus: 403 } });
    return;
  }

  const passwordHash = hashCompanyPassword(newPassword);
  const db = getAdminDb();
  await db.collection("companies").doc(actor.companyId).set(
    {
      company_login_password_hash: passwordHash,
      company_login_password: FieldValue.delete(),
      password_updated_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (text(company.auth_uid)) {
    await getAdminAuth().updateUser(text(company.auth_uid), { password: newPassword }).catch(() => undefined);
  }

  await writeSecurityAudit(actor, "company_account.password_change", { company_id: actor.companyId });
  sendJson(response, 200, { ok: true, message: "Company password changed." });
}

async function requestWithdrawal(response: HttpResponseLike, body: CompanyAccountSecurityRequest, actor: CompanyAccountActor) {
  const currentPassword = text(body.currentPassword);
  const company = await readCompanyById(actor.companyId);

  if (!verifyCompanyPassword({
    password: currentPassword,
    passwordHash: text(company.company_login_password_hash),
    legacyPassword: text(company.company_login_password),
  })) {
    sendJson(response, 403, {
      ok: false,
      error: { code: "COMPANY_CURRENT_PASSWORD_INVALID", message: "Current password does not match.", httpStatus: 403 },
    });
    return;
  }

  const email = normalizeEmail(company.manager_email ?? company.managerEmail ?? company.auth_email ?? actor.email);
  const consumed = await consumeCompanyEmailVerification({
    verificationId: body.verificationId,
    verificationToken: body.verificationToken,
    email,
    purpose: "withdrawal",
    companyId: actor.companyId,
  });

  if (!consumed.ok) {
    sendJson(response, 403, { ok: false, error: { code: consumed.code, message: consumed.message, httpStatus: 403 } });
    return;
  }

  await getAdminDb().collection("companies").doc(actor.companyId).set(
    {
      account_status: "withdrawal_requested",
      status: "withdrawal_requested",
      product_registration_enabled: false,
      withdrawal_requested_at: FieldValue.serverTimestamp(),
      withdrawal_reason: text(body.reason),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeSecurityAudit(actor, "company_account.withdrawal_requested", {
    company_id: actor.companyId,
    reason: text(body.reason),
  });

  sendJson(response, 200, { ok: true, message: "Company withdrawal requested." });
}

async function requireCompanyActor(request: HttpRequestLike, response: HttpResponseLike): Promise<CompanyAccountActor | null> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    sendJson(response, 401, { ok: false, error: { code: "COMPANY_AUTH_REQUIRED", message: "Company Firebase ID token is required.", httpStatus: 401 } });
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const companyId = String(decoded.company_id ?? "");

    if (role === "COMPANY_ADMIN" && companyId) {
      return {
        uid: decoded.uid,
        email: String(decoded.email ?? ""),
        companyId,
        role,
      };
    }
  } catch {
    // Return denial below.
  }

  sendJson(response, 403, { ok: false, error: { code: "COMPANY_FORBIDDEN", message: "Company admin permission is required.", httpStatus: 403 } });
  return null;
}

async function readCompanyById(companyId: string) {
  const snapshot = await getAdminDb().collection("companies").doc(companyId).get();
  if (!snapshot.exists) {
    throw new Error(`Company not found: ${companyId}`);
  }
  return snapshot.data() ?? {};
}

async function writeSecurityAudit(actor: CompanyAccountActor, action: string, extra: Record<string, unknown>) {
  await getAdminDb().collection("audit_logs").doc().set({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    targetType: "companies",
    targetId: actor.companyId,
    ...extra,
    createdAt: new Date().toISOString(),
    created_at: FieldValue.serverTimestamp(),
    source: "company_account_security",
  });
}

type VerificationEmailProvider = "gmail_smtp" | "gmail_api" | "none";

function verificationEmailProvider(): VerificationEmailProvider {
  if (!env("GMAIL_SEND_AS")) return "none";
  if (env("GMAIL_APP_PASSWORD").replace(/\s/g, "")) return "gmail_smtp";
  if (env("GMAIL_CLIENT_ID") && env("GMAIL_CLIENT_SECRET") && env("GMAIL_REFRESH_TOKEN")) return "gmail_api";
  return "none";
}

async function safeWriteEmailDeliveryAudit(input: {
  actor: CompanyAccountActor | null;
  purpose: VerificationPurpose;
  companyId: string;
  email: string;
  status: VerificationEmailResult["status"];
  provider: VerificationEmailProvider;
  errorCode: string;
}) {
  try {
    await getAdminDb().collection("audit_logs").doc().set({
      actorUid: input.actor?.uid ?? null,
      actorRole: input.actor?.role ?? "SIGNUP_APPLICANT",
      action: "company_account.email_verification_delivery",
      targetType: "companies",
      targetId: input.companyId || null,
      purpose: input.purpose,
      emailMasked: maskEmail(input.email),
      deliveryStatus: input.status,
      emailProvider: input.provider,
      errorCode: input.errorCode || null,
      containsSecret: false,
      createdAt: new Date().toISOString(),
      created_at: FieldValue.serverTimestamp(),
      source: "company_account_security",
    });
  } catch (error) {
    console.error("company_account.email_verification_delivery audit write failed", {
      status: input.status,
      provider: input.provider,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

async function sendVerificationEmail(input: {
  to: string;
  code: string;
  purpose: VerificationPurpose;
  companyId: string;
  businessNo: string;
}): Promise<VerificationEmailResult> {
  const sendAs = env("GMAIL_SEND_AS");
  const appPassword = env("GMAIL_APP_PASSWORD").replace(/\s/g, "");
  const hasOauth = Boolean(env("GMAIL_CLIENT_ID") && env("GMAIL_CLIENT_SECRET") && env("GMAIL_REFRESH_TOKEN"));

  if (!sendAs || (!appPassword && !hasOauth)) {
    return {
      status: "not_configured",
      error: !sendAs ? "GMAIL_SEND_AS missing" : "GMAIL_APP_PASSWORD or Gmail OAuth credentials missing",
    };
  }

  try {
    if (appPassword) {
      const subject = "[위드커머스] 기업관리자 이메일 인증번호";
      const body = [
        `인증번호: ${input.code}`,
        "",
        "인증번호는 10분 동안 유효합니다.",
        "본인이 요청하지 않았다면 이 메일을 무시해 주세요.",
      ].join("\r\n");

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: sendAs, pass: appPassword },
      });
      await transporter.sendMail({
        from: `위드커머스 <${sendAs}>`,
        to: input.to,
        subject,
        text: body,
      });
      return { status: "sent" as const };
    }

    const token = await gmailAccessToken();
    const subject = `[A5] Company account verification code`;
    const body = [
      `Verification code: ${input.code}`,
      "",
      `Purpose: ${input.purpose}`,
      input.companyId ? `Company: ${input.companyId}` : "",
      input.businessNo ? `Business No: ${input.businessNo}` : "",
      "",
      "This code expires in 10 minutes.",
    ]
      .filter(Boolean)
      .join("\r\n");
    const raw = [
      `From: ${sendAs}`,
      `To: ${input.to}`,
      `Subject: ${mimeHeader(subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(body, "utf8").toString("base64"),
    ].join("\r\n");
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(sendAs)}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: base64Url(raw) }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { status: "failed" as const, error: `Gmail send failed: ${response.status}${detail ? ` ${detail.slice(0, 200)}` : ""}` };
    }

    return { status: "sent" as const };
  } catch (error) {
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Gmail send failed." };
  }
}

async function gmailAccessToken() {
  const clientId = env("GMAIL_CLIENT_ID");
  const clientSecret = env("GMAIL_CLIENT_SECRET");
  const refreshToken = env("GMAIL_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("gmail_config_missing");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Gmail token failed: ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  return payload.access_token ?? "";
}

function hashSecret(value: string, verificationId: string, email: string, purpose: string, scope: string) {
  const pepper = env("A5_EMAIL_VERIFICATION_SECRET") || env("A5_COMMERCE_LIVE_READ_TOKEN") || "a5-company-email-verification";
  return createHash("sha256").update([pepper, scope, purpose, email, verificationId, value].join("|")).digest("hex");
}

function isStrongPassword(value: string) {
  return value.length >= 8 && /[^A-Za-z0-9]/.test(value);
}

function normalizePurpose(value: unknown): VerificationPurpose | null {
  return value === "signup" || value === "password_change" || value === "withdrawal" ? value : null;
}

function timestampMillis(value: unknown) {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof (value as { toMillis?: () => number }).toMillis === "function") return (value as { toMillis: () => number }).toMillis();
  if (typeof (value as { toDate?: () => Date }).toDate === "function") return (value as { toDate: () => Date }).toDate().getTime();
  if (typeof value === "string") return new Date(value).getTime() || 0;
  return 0;
}

function normalizeEmail(value: unknown) {
  return text(value).toLowerCase();
}

function normalizeBusinessNo(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  return `${name.slice(0, 2)}***@${domain}`;
}

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function mimeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
