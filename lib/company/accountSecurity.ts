"use client";


import { ensureCompanyFirebaseAuthFromSession } from "@/lib/auth/companyFirebaseAuth";
import { readPortalSession } from "@/lib/auth/session";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";

export type CompanyEmailVerificationPurpose = "signup" | "password_change" | "withdrawal";

type CompanyAccountSecurityError = {
  message?: string;
  code?: string;
};

type CompanyAccountSecurityResponse<T> = T & {
  ok?: boolean;
  message?: string;
  error?: CompanyAccountSecurityError;
};

type StartEmailVerificationResponse = {
  verificationId: string;
  emailMasked: string;
  emailStatus: "sent" | "failed" | "not_configured";
  expiresInSeconds: number;
};

type VerifyEmailCodeResponse = {
  verificationToken: string;
  expiresInSeconds: number;
};

async function currentCompanyIdToken() {
  const session = readPortalSession("company");
  const user = await ensureCompanyFirebaseAuthFromSession();
  if (!session?.companyId || !user) return "";

  const token = await user.getIdTokenResult(true);
  if (token.claims.role !== "COMPANY_ADMIN" || token.claims.company_id !== session.companyId) {
    throw new Error("기업관리자 로그인 권한이 현재 업체와 일치하지 않습니다. 기업관리자로 다시 로그인해 주세요.");
  }

  return token.token;
}

async function postCompanyAccountSecurity<T>(payload: Record<string, unknown>, requireToken = false): Promise<CompanyAccountSecurityResponse<T>> {
  const endpoint = getPaymentFunctionUrl("companyAccountSecurity");

  if (!endpoint) {
    throw new Error("기업 계정 보안 함수 endpoint가 설정되지 않았습니다.");
  }

  const token = await currentCompanyIdToken();

  if (requireToken && !token) {
    throw new Error("기업관리자 Firebase 인증이 필요합니다. 다시 로그인해 주세요.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as CompanyAccountSecurityResponse<T> | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error?.message || data?.message || `기업 계정 보안 요청 실패: ${response.status}`);
  }

  return data;
}

export async function startCompanyEmailVerification(input: {
  purpose: CompanyEmailVerificationPurpose;
  email?: string;
  businessNo?: string;
}) {
  return postCompanyAccountSecurity<StartEmailVerificationResponse>(
    {
      action: "start_email_verification",
      purpose: input.purpose,
      email: input.email,
      businessNo: input.businessNo,
    },
    input.purpose !== "signup",
  );
}

export async function verifyCompanyEmailCode(input: {
  purpose: CompanyEmailVerificationPurpose;
  email?: string;
  verificationId: string;
  code: string;
}) {
  return postCompanyAccountSecurity<VerifyEmailCodeResponse>(
    {
      action: "verify_email_code",
      purpose: input.purpose,
      email: input.email,
      verificationId: input.verificationId,
      code: input.code,
    },
    input.purpose !== "signup",
  );
}

export async function changeCompanyPassword(input: {
  currentPassword: string;
  newPassword: string;
  verificationId: string;
  verificationToken: string;
}) {
  return postCompanyAccountSecurity<{ message: string }>(
    {
      action: "change_password",
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      verificationId: input.verificationId,
      verificationToken: input.verificationToken,
    },
    true,
  );
}

export async function requestCompanyWithdrawal(input: {
  currentPassword: string;
  verificationId: string;
  verificationToken: string;
  reason?: string;
}) {
  return postCompanyAccountSecurity<{ message: string }>(
    {
      action: "request_withdrawal",
      currentPassword: input.currentPassword,
      verificationId: input.verificationId,
      verificationToken: input.verificationToken,
      reason: input.reason,
    },
    true,
  );
}
