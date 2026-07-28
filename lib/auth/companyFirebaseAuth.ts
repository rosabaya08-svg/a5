"use client";

import { browserSessionPersistence, onAuthStateChanged, setPersistence, signInWithCustomToken, type User } from "firebase/auth";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";
import { readPortalSession, type PortalSession } from "@/lib/auth/session";

type CompanyAuthTokenResponse = {
  ok?: boolean;
  customToken?: string;
  companyId?: string;
  displayName?: string;
  businessNo?: string;
  resultMsg?: string;
  error?: { message?: string };
};

export type CompanyFirebaseAuthResult = {
  companyId: string;
  displayName: string;
  businessNo: string;
};

export async function signInCompanyFirebaseAuth(input: {
  businessNo: string;
  password: string;
  companyId?: string;
}): Promise<CompanyFirebaseAuthResult> {
  const auth = getFirebaseAuthClient();
  const url = getPaymentFunctionUrl("companyBetaAuthToken");

  if (!auth || !url) {
    throw new Error("기업관리자 Firebase 인증 연결 설정이 없습니다.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyId: input.companyId,
      businessNo: input.businessNo,
      password: input.password,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as CompanyAuthTokenResponse;

  if (!response.ok || typeof body.customToken !== "string") {
    throw new Error(body.resultMsg || body.error?.message || "기업관리자 Firebase 인증 토큰 발급에 실패했습니다.");
  }

  await setPersistence(auth, browserSessionPersistence);
  await signInWithCustomToken(auth, body.customToken);

  return {
    companyId: typeof body.companyId === "string" ? body.companyId : input.companyId ?? "",
    displayName: typeof body.displayName === "string" ? body.displayName : "기업 관리자",
    businessNo: typeof body.businessNo === "string" ? body.businessNo : input.businessNo,
  };
}

function sessionMatchesCompanyUser(session: PortalSession, uid: string | undefined) {
  return Boolean(session.companyId && uid === `company:${session.companyId}`);
}

async function userHasCompanyClaims(user: User, session: PortalSession) {
  if (!sessionMatchesCompanyUser(session, user.uid)) return false;

  const token = await user.getIdTokenResult(true);
  return token.claims.role === "COMPANY_ADMIN" && token.claims.company_id === session.companyId;
}

export class CompanyFirebaseAuthMismatchError extends Error {
  readonly code = "COMPANY_FIREBASE_AUTH_MISMATCH";

  constructor() {
    super("기업관리자 로그인 정보와 Firebase 권한이 일치하지 않습니다. 다른 관리자 탭을 닫고 기업관리자로 다시 로그인해 주세요.");
  }
}

function waitForRestoredCompanyUser(timeoutMs = 1800): Promise<User | null> {
  const auth = getFirebaseAuthClient();
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser ?? null);
    }, timeoutMs);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      window.clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });
  });
}

export async function ensureCompanyFirebaseAuthFromSession(password = "") {
  if (typeof window === "undefined") return null;

  const session = readPortalSession("company");
  if (!session?.businessNo || !session.companyId) return null;

  const auth = getFirebaseAuthClient();
  if (auth?.currentUser && await userHasCompanyClaims(auth.currentUser, session)) {
    return auth.currentUser;
  }

  const restoredUser = await waitForRestoredCompanyUser();
  if (restoredUser && await userHasCompanyClaims(restoredUser, session)) {
    return restoredUser;
  }

  const fallbackPassword = password;
  if (!fallbackPassword) {
    throw new CompanyFirebaseAuthMismatchError();
  }

  await signInCompanyFirebaseAuth({
    businessNo: session.businessNo,
    companyId: session.companyId,
    password: fallbackPassword,
  });

  const signedInUser = getFirebaseAuthClient()?.currentUser ?? null;
  if (!signedInUser || !await userHasCompanyClaims(signedInUser, session)) {
    throw new CompanyFirebaseAuthMismatchError();
  }

  return signedInUser;
}
