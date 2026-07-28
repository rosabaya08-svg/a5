"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { betaAccessAccounts, type BetaAccessAccount } from "@/data/accessCredentials";
import { signInCompanyFirebaseAuth, type CompanyFirebaseAuthResult } from "@/lib/auth/companyFirebaseAuth";
import { normalizeBusinessNo, portalHomePaths, writePortalSession } from "@/lib/auth/session";
import { startCompanyEmailVerification, verifyCompanyEmailCode } from "@/lib/company/accountSecurity";
import { getFirebasePublicConfig } from "@/lib/firebase/client";
import { saveCmsRecord } from "@/lib/firebase/contentRepository";
import { lookupLinkedNurseryProfileByBusinessNo } from "@/lib/firebase/nurseryAutoSignupClient";
import {
  readLocalCompanySignupRequests as readStoredCompanySignupRequests,
  saveLocalCompanySignupRequest,
  submitCompanySignupRequest,
  type CompanySignupSubmitDocumentFile,
  type CompanySignupRequestPayload,
} from "@/lib/firebase/signupRequestRepository";
import {
  buildNurseryAutoSignupCmsRecord,
  NURSERY_DEFAULT_PASSWORD,
  NURSERY_LOGIN_BUSINESS_DRAFT_KEY,
  saveNurseryAutoSignupProfile,
  type NurseryAutoSignupProfile,
} from "@/lib/nursery/nurseryAutoSignup";
import type { CompanyDocumentType } from "@/types/company";

type BetaAdminLoginProps = {
  role: BetaAccessAccount["role"];
};

type SignupState = {
  companyName: string;
  businessNo: string;
  representativeName: string;
  representativeBirthDate: string;
  representativeNationality: "" | "domestic" | "foreign";
  representativeGender: "" | "male" | "female";
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  password: string;
  passwordConfirm: string;
  commerceLicenseNo: string;
  csPhone: string;
  returnAddress: string;
  agreed: boolean;
};

const initialSignup: SignupState = {
  companyName: "",
  businessNo: "",
  representativeName: "",
  representativeBirthDate: "",
  representativeNationality: "",
  representativeGender: "",
  managerName: "",
  managerPhone: "",
  managerEmail: "",
  password: "",
  passwordConfirm: "",
  commerceLicenseNo: "",
  csPhone: "",
  returnAddress: "",
  agreed: false,
};

type CompanySignupDocumentSlot = {
  id: "businessLicense" | "representativeId" | "bankbookCopy" | "commerceLicense" | "csPolicy";
  type: CompanyDocumentType;
  label: string;
  required: boolean;
  helper: string;
  accept: string;
};

const companySignupDocumentSlots = [
  {
    id: "businessLicense",
    type: "business_license",
    label: "사업자등록증",
    required: true,
    helper: "상호, 대표자, 사업자등록번호가 확인되는 PDF 또는 이미지",
    accept: "image/*,.pdf",
  },
  {
    id: "representativeId",
    type: "representative_id",
    label: "대표자 신분증",
    required: true,
    helper: "대표자 본인 확인용 신분증 사본. 주민등록번호 뒷자리는 가리고 첨부",
    accept: "image/*,.pdf",
  },
  {
    id: "bankbookCopy",
    type: "bankbook_copy",
    label: "정산 통장 사본",
    required: true,
    helper: "Payup 계약 확인용 예금주/은행/계좌 식별 자료",
    accept: "image/*,.pdf",
  },
  {
    id: "commerceLicense",
    type: "commerce_license",
    label: "통신판매업 신고증",
    required: true,
    helper: "상품 상세 판매자 정보와 대조할 신고번호 증빙",
    accept: "image/*,.pdf",
  },
  {
    id: "csPolicy",
    type: "cs_policy",
    label: "CS 연락처/반품지/AS 정책",
    required: true,
    helper: "고객 응대 연락처, 반품지 주소, 교환/환불/AS 기준 문서",
    accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx",
  },
] satisfies CompanySignupDocumentSlot[];

type CompanySignupDocumentSlotId = (typeof companySignupDocumentSlots)[number]["id"];
type CompanySignupFiles = Partial<Record<CompanySignupDocumentSlotId, File>>;

type SignupEmailVerificationState = {
  verificationId: string;
  verificationToken: string;
  code: string;
  email: string;
  emailMasked: string;
  method: "none" | "code" | "firebase_auth";
  firebaseAuthIdToken: string;
  firebaseAuthRefreshToken: string;
  status: "idle" | "sent" | "verified";
  message: string;
};

const initialSignupEmailVerification: SignupEmailVerificationState = {
  verificationId: "",
  verificationToken: "",
  code: "",
  email: "",
  emailMasked: "",
  method: "none",
  firebaseAuthIdToken: "",
  firebaseAuthRefreshToken: "",
  status: "idle",
  message: "",
};

function findAccount(role: BetaAccessAccount["role"], loginValue: string) {
  const normalized = normalizeBusinessNo(loginValue);
  const raw = loginValue.trim().toLowerCase();

  return betaAccessAccounts.find((account) => {
    if (account.role !== role) return false;

    const matchesBusinessNo = normalized.length > 0 && normalizeBusinessNo(account.businessNo) === normalized;
    if (role === "company") return matchesBusinessNo;

    const matchesLoginId = account.loginId
      ? (normalized.length > 0 && normalizeBusinessNo(account.loginId) === normalized) ||
        (raw.length > 0 && account.loginId.toLowerCase() === raw)
      : false;
    const matchesAccountId = raw.length > 0 && account.id.toLowerCase() === raw;

    return matchesBusinessNo || matchesLoginId || matchesAccountId;
  });
}

export function readLocalCompanySignupRequests() {
  return readStoredCompanySignupRequests();
}

function companySignupIdFromBusinessNo(businessNo: string) {
  const normalized = normalizeBusinessNo(businessNo);
  return normalized ? `company-${normalized}` : `company-signup-${Date.now()}`;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
  if (size >= 1024) return `${Math.round(size / 1024)}KB`;
  return `${size}B`;
}

const signupPasswordPolicyMessage = "비밀번호는 특수문자를 포함해 8자 이상 입력해 주세요.";

function isValidSignupPassword(value: string) {
  return value.length >= 8 && /[^A-Za-z0-9]/.test(value);
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.split(",").pop() ?? "" : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function readNurseryLoginBusinessDraft(role: BetaAccessAccount["role"]) {
  if (role !== "nursery" || typeof window === "undefined") return "";

  return window.sessionStorage.getItem(NURSERY_LOGIN_BUSINESS_DRAFT_KEY) ?? "";
}

function withClientTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isFirebaseAuthEmailVerificationId(value: string) {
  return value.startsWith("firebase-auth-email:");
}

type FirebaseAuthRestSession = {
  uid: string;
  email: string;
  idToken: string;
  refreshToken: string;
  verified: boolean;
};

type FirebaseAuthRestUser = {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
};

type FirebaseAuthTokenResponse = {
  idToken?: string;
  refreshToken?: string;
  localId?: string;
  email?: string;
};

type FirebaseAuthRefreshResponse = {
  id_token?: string;
  refresh_token?: string;
  user_id?: string;
};

type FirebaseAuthLookupResponse = {
  users?: FirebaseAuthRestUser[];
};

function getFirebaseAuthApiKey() {
  const apiKey = getFirebasePublicConfig().apiKey;

  if (!apiKey) {
    throw new Error("Firebase Auth API key is missing.");
  }

  return apiKey;
}

function firebaseAuthRestErrorCode(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

async function firebaseAuthPost<T>(endpoint: string, body: Record<string, unknown>) {
  const apiKey = getFirebaseAuthApiKey();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `FIREBASE_AUTH_REST_${response.status}`);
  }

  return payload as T;
}

async function firebaseAuthLookup(idToken: string) {
  const payload = await firebaseAuthPost<FirebaseAuthLookupResponse>("accounts:lookup", { idToken });
  return payload.users?.[0] ?? null;
}

async function firebaseAuthCreateOrSignIn(email: string, password: string) {
  try {
    return await firebaseAuthPost<FirebaseAuthTokenResponse>("accounts:signUp", {
      email,
      password,
      returnSecureToken: true,
    });
  } catch (error) {
    if (!firebaseAuthRestErrorCode(error).includes("EMAIL_EXISTS")) {
      throw error;
    }

    return firebaseAuthPost<FirebaseAuthTokenResponse>("accounts:signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
  }
}

async function firebaseAuthSendVerificationEmail(idToken: string) {
  await firebaseAuthPost("accounts:sendOobCode", {
    requestType: "VERIFY_EMAIL",
    idToken,
  });
}

async function firebaseAuthRefreshSession(refreshToken: string) {
  const apiKey = getFirebaseAuthApiKey();
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as FirebaseAuthRefreshResponse & {
    error?: { message?: string };
  };

  if (!response.ok || !payload.id_token) {
    throw new Error(payload.error?.message || `FIREBASE_AUTH_REFRESH_${response.status}`);
  }

  return {
    idToken: payload.id_token,
    refreshToken: payload.refresh_token || refreshToken,
    uid: payload.user_id || "",
  };
}

type SignupEmailAuthUser = {
  uid: string;
  email: string;
  emailVerified: boolean;
  refreshToken: string;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  reload: () => Promise<void>;
};

type SignupEmailAuthContext = {
  currentUser: SignupEmailAuthUser | null;
};

const signupEmailAuthContext: SignupEmailAuthContext = {
  currentUser: null,
};

function getSignupEmailAuth() {
  return signupEmailAuthContext;
}

function makeFirebaseAuthSdkLikeError(code: string, fallbackMessage: string) {
  const error = new Error(fallbackMessage) as Error & { code?: string };
  error.code = code;
  return error;
}

async function createFirebaseAuthRestSession(email: string, password: string) {
  try {
    const credential = await firebaseAuthPost<FirebaseAuthTokenResponse>("accounts:signUp", {
      email,
      password,
      returnSecureToken: true,
    });

    if (!credential.idToken || !credential.refreshToken || !credential.localId) {
      throw new Error("Firebase Auth token was not returned.");
    }

    return credential;
  } catch (error) {
    if (firebaseAuthRestErrorCode(error).includes("EMAIL_EXISTS")) {
      throw makeFirebaseAuthSdkLikeError("auth/email-already-in-use", "EMAIL_EXISTS");
    }

    throw error;
  }
}

async function signInFirebaseAuthRestSession(email: string, password: string) {
  const credential = await firebaseAuthPost<FirebaseAuthTokenResponse>("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });

  if (!credential.idToken || !credential.refreshToken || !credential.localId) {
    throw new Error("Firebase Auth sign-in token was not returned.");
  }

  return credential;
}

function createSignupEmailAuthUser(session: FirebaseAuthTokenResponse, verified: boolean): SignupEmailAuthUser {
  if (!session.localId || !session.email || !session.idToken || !session.refreshToken) {
    throw new Error("Firebase Auth session is incomplete.");
  }

  let currentIdToken = session.idToken;
  let currentRefreshToken = session.refreshToken;
  let currentEmailVerified = verified;

  const user: SignupEmailAuthUser = {
    uid: session.localId,
    email: session.email,
    emailVerified: currentEmailVerified,
    refreshToken: currentRefreshToken,
    async getIdToken(forceRefresh = false) {
      if (forceRefresh) {
        const refreshed = await firebaseAuthRefreshSession(currentRefreshToken);
        currentIdToken = refreshed.idToken;
        currentRefreshToken = refreshed.refreshToken;
        user.refreshToken = currentRefreshToken;
      }

      return currentIdToken;
    },
    async reload() {
      const refreshed = await firebaseAuthRefreshSession(currentRefreshToken);
      currentIdToken = refreshed.idToken;
      currentRefreshToken = refreshed.refreshToken;
      user.refreshToken = currentRefreshToken;

      const account = await firebaseAuthLookup(currentIdToken);
      currentEmailVerified = account?.emailVerified === true;
      user.emailVerified = currentEmailVerified;
    },
  };

  return user;
}

async function buildSignupEmailAuthCredential(session: FirebaseAuthTokenResponse) {
  const account = session.idToken ? await firebaseAuthLookup(session.idToken) : null;
  const user = createSignupEmailAuthUser(session, account?.emailVerified === true);
  signupEmailAuthContext.currentUser = user;
  return { user };
}

async function createUserWithEmailAndPassword(_auth: SignupEmailAuthContext, email: string, password: string) {
  return buildSignupEmailAuthCredential(await createFirebaseAuthRestSession(email, password));
}

async function signInWithEmailAndPassword(_auth: SignupEmailAuthContext, email: string, password: string) {
  return buildSignupEmailAuthCredential(await signInFirebaseAuthRestSession(email, password));
}

async function sendEmailVerification(user: SignupEmailAuthUser) {
  await firebaseAuthSendVerificationEmail(await user.getIdToken());
}

function hasCompletedNurseryFirstLogin(profile: NurseryAutoSignupProfile) {
  return Boolean(profile.termsAcceptedAt && profile.privacyAcceptedAt && profile.marketingConsentAt);
}

export function BetaAdminLogin({ role }: BetaAdminLoginProps) {
  const params = useSearchParams();
  const account = useMemo(() => betaAccessAccounts.find((item) => item.role === role), [role]);
  const [businessNo, setBusinessNo] = useState(() =>
    role === "company" ? "" : readNurseryLoginBusinessDraft(role),
  );
  const [password, setPassword] = useState(role === "company" ? "" : account?.defaultPassword ?? NURSERY_DEFAULT_PASSWORD);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signup, setSignup] = useState<SignupState>(initialSignup);
  const [signupFiles, setSignupFiles] = useState<CompanySignupFiles>({});
  const [signupEmailVerification, setSignupEmailVerification] = useState<SignupEmailVerificationState>(initialSignupEmailVerification);
  const [companyStep, setCompanyStep] = useState<"login" | "agreements">("login");
  const [pendingCompanyAccount, setPendingCompanyAccount] = useState<BetaAccessAccount | null>(null);
  const [nurseryStep, setNurseryStep] = useState<"login" | "agreements">("login");
  const [pendingNurseryProfile, setPendingNurseryProfile] = useState<NurseryAutoSignupProfile | null>(null);
  const [agreement, setAgreement] = useState({ service: false, privacy: false, marketing: false });
  const [saving, setSaving] = useState(false);

  const nextPath = params?.get("next") || portalHomePaths[role];
  const isCompany = role === "company";
  const signupPasswordValid = isValidSignupPassword(signup.password);
  const signupPasswordConfirmTouched = signup.passwordConfirm.length > 0;
  const signupPasswordMatches = signup.password.length > 0 && signup.password === signup.passwordConfirm;
  const signupEmail = signup.managerEmail.trim().toLowerCase();
  const signupEmailVerified =
    signupEmailVerification.status === "verified" &&
    Boolean(signupEmailVerification.verificationToken) &&
    signupEmailVerification.email === signupEmail;
  const signupEmailVerificationUsesFirebaseAuth = signupEmailVerification.method === "firebase_auth";
  const signupEmailVerifyDisabled =
    saving ||
    !signupEmailVerification.verificationId ||
    (!signupEmailVerificationUsesFirebaseAuth && signupEmailVerification.code.length !== 6);
  const effectiveMode = isCompany ? mode : "login";
  const title = isCompany ? "기업 관리자 로그인" : "산후조리원 어드민 로그인";
  const loginIdLabel = "사업자등록번호";
  const loginIdPlaceholder = isCompany ? "사업자등록번호 입력" : "1004-1004-1004";

  useEffect(() => {
    if (role !== "nursery" || typeof window === "undefined") return;

    if (businessNo.trim()) {
      window.sessionStorage.setItem(NURSERY_LOGIN_BUSINESS_DRAFT_KEY, businessNo);
    } else {
      window.sessionStorage.removeItem(NURSERY_LOGIN_BUSINESS_DRAFT_KEY);
    }
  }, [businessNo, role]);

  async function completeCompanyLogin(login: CompanyFirebaseAuthResult, consentedAt: string) {

    writePortalSession(role, {
      role,
      accountId: login.companyId,
      businessNo: login.businessNo,
      displayName: login.displayName,
      companyId: login.companyId,
      signedInAt: new Date().toISOString(),
      firstLoginCompletedAt: consentedAt,
      termsAcceptedAt: consentedAt,
      privacyAcceptedAt: consentedAt,
      marketingConsentAt: consentedAt,
    });

    window.location.assign(nextPath);
  }

  function completeNurseryLogin(profile: NurseryAutoSignupProfile, consentedAt: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(NURSERY_LOGIN_BUSINESS_DRAFT_KEY);
    }

    writePortalSession("nursery", {
      role: "nursery",
      accountId: profile.businessRegistrationNo,
      businessNo: profile.businessRegistrationNo,
      displayName: profile.nurseryName,
      nurseryId: profile.nurseryId,
      signedInAt: new Date().toISOString(),
      firstLoginCompletedAt: consentedAt,
      termsAcceptedAt: profile.termsAcceptedAt ?? consentedAt,
      privacyAcceptedAt: profile.privacyAcceptedAt ?? consentedAt,
      marketingConsentAt: profile.marketingConsentAt ?? consentedAt,
    });

    window.location.assign(nextPath);
  }

  async function resolveNurseryProfile() {
    return lookupLinkedNurseryProfileByBusinessNo(businessNo, password);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (role === "nursery") {
      if (password !== NURSERY_DEFAULT_PASSWORD) {
        setMessage("비밀번호가 일치하지 않습니다. 산후조리원 기본 비밀번호는 1004입니다.");
        return;
      }

      setSaving(true);
      const lookup = await resolveNurseryProfile();
      setSaving(false);

      if (!lookup.profile) {
        const detail = lookup.error?.code ? ` (${lookup.error.code})` : "";
        setMessage(`등록된 사업자번호를 찾지 못했습니다. 최고관리자 조리원 관리에 등록된 사업자번호와 다시 대조해 주세요.${detail}`);
        return;
      }

      const profile = lookup.profile;

      if (profile.status === "suspended") {
        setMessage("정지된 조리원 계정입니다. 최고관리자에게 문의해 주세요.");
        return;
      }

      if (hasCompletedNurseryFirstLogin(profile)) {
        const completedAt =
          profile.firstLoginCompletedAt ?? profile.termsAcceptedAt ?? profile.privacyAcceptedAt ?? profile.marketingConsentAt ?? new Date().toISOString();
        completeNurseryLogin(profile, completedAt);
        return;
      }

      setPendingNurseryProfile(profile);
      setNurseryStep("agreements");
      return;
    }

    if (role === "company") {
      const normalizedBusinessNo = normalizeBusinessNo(businessNo);

      if (!normalizedBusinessNo) {
        setMessage("사업자등록번호를 입력해 주세요.");
        return;
      }

      setSaving(true);
      try {
        const login = await signInCompanyFirebaseAuth({ businessNo, password });
        await completeCompanyLogin(login, new Date().toISOString());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "기업관리자 Firebase 인증 연결에 실패했습니다.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const matched = findAccount(role, businessNo);

    if (!matched || password !== matched.defaultPassword) {
      setMessage(role === "company" ? "사업자등록번호 또는 비밀번호가 일치하지 않습니다." : "아이디 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (role === "company") {
      setSaving(true);
      try {
        const login = await signInCompanyFirebaseAuth({ businessNo: matched.businessNo, password, companyId: matched.id });
        await completeCompanyLogin(login, new Date().toISOString());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "기업관리자 Firebase 인증 연결에 실패했습니다.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setPendingCompanyAccount(matched);
    setCompanyStep("agreements");
  }

  async function handleCompanySignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (
      !signup.companyName ||
      !signup.businessNo ||
      !signup.representativeName ||
      !signup.representativeBirthDate ||
      !signup.representativeNationality ||
      !signup.representativeGender ||
      !signup.managerName ||
      !signup.managerPhone ||
      !signup.managerEmail
    ) {
      setMessage("필수 정보를 입력해 주세요.");
      return;
    }

    if (!/^\d{8}$/.test(signup.representativeBirthDate)) {
      setMessage("대표 생년월일은 19900812 형식의 숫자 8자리로 입력해 주세요.");
      return;
    }

    if (!signupPasswordValid) {
      setMessage(signupPasswordPolicyMessage);
      return;
    }

    if (signup.password !== signup.passwordConfirm) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!signup.agreed) {
      setMessage("개인정보 및 운영 약관 동의가 필요합니다.");
      return;
    }

    if (!signupEmailVerified) {
      setMessage("담당자 이메일 인증을 완료한 뒤 회원가입 요청을 제출해 주세요.");
      return;
    }

    const missingDocuments = companySignupDocumentSlots
      .filter((slot) => slot.required && !signupFiles[slot.id])
      .map((slot) => slot.label);

    if (missingDocuments.length > 0) {
      setMessage(`필수 서류를 선택해 주세요: ${missingDocuments.join(", ")}`);
      return;
    }

    const now = new Date().toISOString();
    const id = `company-request-${normalizeBusinessNo(signup.businessNo)}-${Date.now()}`;
    const signupCompanyId = companySignupIdFromBusinessNo(signup.businessNo);
    const documentFiles: CompanySignupSubmitDocumentFile[] = [];
    let uploadErrorMessage = "";

    setSaving(true);

    try {
      for (const slot of companySignupDocumentSlots) {
        const file = signupFiles[slot.id];
        if (!file) continue;

        documentFiles.push({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          base64: await fileToBase64(file),
          documentType: slot.type,
          documentLabel: slot.label,
        });
      }
    } catch (error) {
      uploadErrorMessage = error instanceof Error ? error.message : "서류 업로드 중 오류가 발생했습니다.";
    }

    if (documentFiles.length === 0) {
      setSaving(false);
      setMessage("제출서류를 읽지 못했습니다. 파일을 다시 선택해 주세요.");
      return;
    }

    const selectedDocumentNames = companySignupDocumentSlots
      .map((slot) => signupFiles[slot.id]?.name)
      .filter((name): name is string => Boolean(name));

    const request: CompanySignupRequestPayload = {
      id,
      companyName: signup.companyName,
      businessRegistrationNumber: signup.businessNo,
      representativeName: signup.representativeName,
      representativeBirthDate: signup.representativeBirthDate,
      representativeNationality: signup.representativeNationality,
      representativeGender: signup.representativeGender,
      managerName: signup.managerName,
      managerPhone: signup.managerPhone,
      managerEmail: signup.managerEmail,
      commerceLicenseNo: signup.commerceLicenseNo,
      csPhone: signup.csPhone,
      returnAddress: signup.returnAddress,
      documentNames: selectedDocumentNames,
      documentUploads: [],
      documentUploadIds: [],
      documentStoragePaths: [],
      gmailDeliveryStatus: "queued",
      documentUploadStatus: "uploaded",
      documentUploadError: "",
      status: "pending_review",
      createdAt: now,
      updatedAt: now,
    };
    const firebaseAuthIdToken =
      signupEmailVerification.method === "firebase_auth" ? signupEmailVerification.firebaseAuthIdToken : "";

    try {
      await submitCompanySignupRequest(request, {
        companyId: signupCompanyId,
        loginPassword: signup.password,
        documentFiles,
        firebaseAuthIdToken: firebaseAuthIdToken || undefined,
        emailVerification:
          signupEmailVerification.method === "code"
            ? {
                verificationId: signupEmailVerification.verificationId,
                verificationToken: signupEmailVerification.verificationToken,
                email: signupEmailVerification.email,
              }
            : undefined,
      });
      saveLocalCompanySignupRequest(request);
    } catch (error) {
      saveLocalCompanySignupRequest(request);
      setSaving(false);
      setMessage(
        `회원가입 요청을 Firestore에 저장하지 못했습니다. 최고관리자 큐에 반영되지 않았으니 다시 시도해 주세요. ${
          error instanceof Error ? error.message : ""
        }`.trim(),
      );
      setMessage(
        `회원가입 요청을 서버에 저장하지 못했습니다. 최고관리자 큐에 반영되지 않았으니 다시 시도해 주세요. ${
          error instanceof Error ? error.message : ""
        }`.trim(),
      );
      return;
    }

    setSaving(false);
    setSignup(initialSignup);
    setSignupFiles({});
    setSignupEmailVerification(initialSignupEmailVerification);
    setMode("login");
    setMessage(
      uploadErrorMessage
        ? "회원가입 요청은 접수되었습니다. 서류 업로드는 실패 상태로 최고관리자 검토 큐에 표시됩니다."
        : "회원가입이 완료되었습니다. 로그인은 바로 가능하며, 상품등록은 최고관리자 승인 후 이용할 수 있습니다.",
    );
  }

  async function startFirebaseAuthSignupEmailVerification(email: string) {
    const auth = getSignupEmailAuth();

    if (!auth) {
      throw new Error("Firebase Auth 설정을 찾을 수 없어 이메일 인증을 시작할 수 없습니다.");
    }

    if (!signupPasswordValid || signup.password !== signup.passwordConfirm) {
      throw new Error("Firebase 이메일 인증을 보내려면 비밀번호와 비밀번호 확인을 먼저 정확히 입력해야 합니다.");
    }

    let credential;

    try {
      credential = await createUserWithEmailAndPassword(auth, email, signup.password);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";

      if (code !== "auth/email-already-in-use") {
        throw error;
      }

      credential = await signInWithEmailAndPassword(auth, email, signup.password);
    }

    if (!credential.user.emailVerified) {
      await sendEmailVerification(credential.user);
    }

    const idToken = credential.user.emailVerified ? await credential.user.getIdToken(true) : "";
    return {
      uid: credential.user.uid,
      verified: credential.user.emailVerified,
      idToken,
    };
  }

  async function verifyFirebaseAuthSignupEmail() {
    const auth = getSignupEmailAuth();
    const email = signupEmailVerification.email || signup.managerEmail.trim().toLowerCase();

    if (!auth) {
      throw new Error("Firebase Auth 설정을 찾을 수 없어 이메일 인증을 확인할 수 없습니다.");
    }

    let user = auth.currentUser;

    if (!user || user.email?.toLowerCase() !== email) {
      const credential = await signInWithEmailAndPassword(auth, email, signup.password);
      user = credential.user;
    }

    await user.reload();

    if (!user.emailVerified) {
      throw new Error("메일함에서 Firebase 인증 링크를 먼저 누른 뒤 다시 인증 확인을 눌러 주세요.");
    }

    return user.getIdToken(true);
  }

  function shouldUseFirebaseAuthEmailFallback(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    return message.includes("EMAIL_DELIVERY_NOT_CONFIGURED") || message.includes("발송 설정") || message.includes("Gmail");
  }

  function maskSignupEmail(email: string) {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    return `${name.slice(0, 2)}***@${domain}`;
  }

  async function handleSendSignupEmailCode() {
    setMessage("");
    const email = signup.managerEmail.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setMessage("담당자 이메일을 먼저 입력해 주세요.");
      return;
    }

    if (!normalizeBusinessNo(signup.businessNo)) {
      setMessage("사업자등록번호를 먼저 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const result = await startCompanyEmailVerification({
        purpose: "signup",
        email,
        businessNo: signup.businessNo,
      });
      const deliveryMessage =
        result.emailStatus === "sent"
          ? `${result.emailMasked} 주소로 인증번호를 발송했습니다.`
          : "인증번호가 생성되었지만 이메일 발송 설정을 확인해야 합니다.";

      setSignupEmailVerification({
        verificationId: result.verificationId,
        verificationToken: "",
        code: "",
        email,
        emailMasked: result.emailMasked,
        method: "code",
        firebaseAuthIdToken: "",
        firebaseAuthRefreshToken: "",
        status: "sent",
        message: deliveryMessage,
      });
      setMessage(deliveryMessage);
    } catch (error) {
      if (!shouldUseFirebaseAuthEmailFallback(error)) {
        setSignupEmailVerification(initialSignupEmailVerification);
        setMessage(error instanceof Error ? error.message : "이메일 인증번호 발송에 실패했습니다.");
        return;
      }

      try {
        const result = await startFirebaseAuthSignupEmailVerification(email);
        const deliveryMessage = result.verified
          ? "이미 Firebase 이메일 인증이 완료되어 있습니다."
          : "Firebase 인증 메일을 발송했습니다. 메일함에서 인증 링크를 누른 뒤 인증 확인을 눌러 주세요.";

        setSignupEmailVerification({
          verificationId: `firebase-auth-email:${result.uid}`,
          verificationToken: result.verified ? `firebase-auth:${result.uid}` : "",
          code: "",
          email,
          emailMasked: maskSignupEmail(email),
          method: "firebase_auth",
          firebaseAuthIdToken: result.idToken,
          firebaseAuthRefreshToken: "",
          status: result.verified ? "verified" : "sent",
          message: deliveryMessage,
        });
        setMessage(deliveryMessage);
      } catch (fallbackError) {
        setSignupEmailVerification(initialSignupEmailVerification);
        setMessage(fallbackError instanceof Error ? fallbackError.message : "Firebase 이메일 인증 발송에 실패했습니다.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifySignupEmailCode() {
    setMessage("");

    if (!signupEmailVerification.verificationId) {
      setMessage("이메일 인증을 먼저 시작해 주세요.");
      return;
    }

    if (signupEmailVerification.method !== "firebase_auth" && !signupEmailVerification.code.trim()) {
      setMessage("이메일 인증번호를 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      if (signupEmailVerification.method === "firebase_auth" || isFirebaseAuthEmailVerificationId(signupEmailVerification.verificationId)) {
        const idToken = await verifyFirebaseAuthSignupEmail();

        setSignupEmailVerification((current) => ({
          ...current,
          firebaseAuthIdToken: idToken,
          verificationToken: `firebase-auth:${current.verificationId}`,
          status: "verified",
          message: "Firebase 이메일 인증이 완료되었습니다.",
        }));
        setMessage("Firebase 이메일 인증이 완료되었습니다.");
        return;
      }

      const result = await verifyCompanyEmailCode({
        purpose: "signup",
        email: signupEmailVerification.email,
        verificationId: signupEmailVerification.verificationId,
        code: signupEmailVerification.code.trim(),
      });

      setSignupEmailVerification((current) => ({
        ...current,
        verificationToken: result.verificationToken,
        status: "verified",
        message: "담당자 이메일 인증이 완료되었습니다.",
      }));
      setMessage("담당자 이메일 인증이 완료되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이메일 인증번호 확인에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAgreementNext() {
    if (!agreement.service || !agreement.privacy || !agreement.marketing) {
      setMessage("운영 약관, 개인정보 처리방침, 마케팅 정보 수신 동의를 모두 체크해야 이용할 수 있습니다.");
      return;
    }

    if (!pendingNurseryProfile) {
      if (role === "company" && pendingCompanyAccount) {
        const consentedAt = new Date().toISOString();
        setMessage("");
        setSaving(true);
        try {
          const login = await signInCompanyFirebaseAuth({ businessNo: pendingCompanyAccount.businessNo, password, companyId: pendingCompanyAccount.id });
          await completeCompanyLogin(login, consentedAt);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "기업관리자 Firebase 인증 연결에 실패했습니다.");
        } finally {
          setSaving(false);
        }
        return;
      }

      setMessage("계정을 다시 확인해 주세요.");
      return;
    }

    const consentedAt = new Date().toISOString();
    const consentedProfile: NurseryAutoSignupProfile = {
      ...pendingNurseryProfile,
      termsAcceptedAt: consentedAt,
      privacyAcceptedAt: consentedAt,
      marketingConsentAt: consentedAt,
      firstLoginCompletedAt: consentedAt,
      updatedAt: consentedAt,
    };

    setSaving(true);
    saveNurseryAutoSignupProfile(consentedProfile);

    try {
      await withClientTimeout(
        saveCmsRecord("nursery_auto_signup_profiles", buildNurseryAutoSignupCmsRecord(consentedProfile)),
        2500,
      );
    } catch {
      // The local session still carries the consent record for the nursery admin page.
    }

    setSaving(false);
    setMessage("");
    completeNurseryLogin(consentedProfile, consentedAt);
  }

  const companySignupFields: Array<[keyof SignupState, string, string]> = [
    ["companyName", "상호", "예: A5 테스트 기업"],
    ["businessNo", "사업자등록번호", "123-45-67890"],
    ["representativeName", "대표자명", "홍길동"],
    ["representativeBirthDate", "대표 생년월일", "19900812"],
    ["managerName", "담당자명", "담당자"],
    ["managerPhone", "담당자 휴대폰", "010-0000-0000"],
    ["managerEmail", "담당자 이메일", "manager@example.com"],
    ["password", "비밀번호", ""],
    ["passwordConfirm", "비밀번호 확인", ""],
    ["commerceLicenseNo", "통신판매업 신고번호", ""],
    ["csPhone", "CS 연락처", ""],
    ["returnAddress", "반품지 주소", ""],
  ];

  if ((role === "nursery" && nurseryStep === "agreements") || (role === "company" && companyStep === "agreements")) {
    const consentRoleLabel = role === "company" ? "기업 관리자" : "산후조리원 관리자";

    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <h1 className="text-3xl font-normal">최초 이용 동의</h1>
          <div className="mt-6 grid gap-3">
            {[
              ["service", "운영 약관 동의"],
              ["privacy", "개인정보 처리방침 동의"],
              ["marketing", "마케팅 정보 수신 동의"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-md border border-slate-200 p-4 text-sm font-normal">
                <input
                  type="checkbox"
                  checked={agreement[key as keyof typeof agreement]}
                  onChange={(event) => setAgreement((current) => ({ ...current, [key]: event.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
          {message ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-normal text-red-700">{message}</p> : null}
          <button disabled={saving} type="button" onClick={handleAgreementNext} className="mt-6 h-12 w-full rounded-md bg-slate-950 text-sm font-normal text-white disabled:opacity-60">
            {saving ? "동의 기록 저장 중" : `${consentRoleLabel} 화면으로 이동`}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={isCompany ? "min-h-screen bg-[#f6f7f5] text-[#202623]" : "min-h-screen bg-slate-950 px-4 py-10 text-white"}>
      <section
        className={
          isCompany
            ? "grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(520px,0.92fr)]"
            : `mx-auto grid gap-6 ${effectiveMode === "login" ? "max-w-md" : "max-w-3xl"}`
        }
      >
        {isCompany ? (
          <aside className="relative min-h-[240px] overflow-hidden bg-[#27312d] lg:min-h-screen">
            <div
              className="absolute inset-0 bg-cover bg-[position:78%_center]"
              style={{ backgroundImage: "url('/images/company-login-postpartum.png')" }}
            />
            <div className="absolute inset-0 bg-black/25" />
            <div className="relative flex min-h-[240px] flex-col justify-between p-6 text-white lg:min-h-screen lg:p-12">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-white/60 bg-white/90 text-sm font-normal text-[#26312c]">
                  W
                </span>
                <div>
                  <p className="text-sm font-normal">WITH.COMMERCE</p>
                  <p className="mt-1 text-xs font-normal text-white/80">산후조리원 파트너 운영센터</p>
                </div>
              </div>
              <div className="max-w-xl pb-1 lg:pb-8">
                <p className="text-sm font-normal text-white/85">입점 기업 전용</p>
                <p className="mt-2 max-w-lg text-2xl font-normal leading-tight sm:text-3xl lg:text-4xl">
                  산후조리원 고객을 위한 상품 운영을 한곳에서 관리합니다
                </p>
              </div>
            </div>
          </aside>
        ) : null}

        <div
          className={
            isCompany
              ? `flex min-h-[calc(100vh-240px)] justify-center px-5 py-10 sm:px-10 lg:min-h-screen lg:px-14 ${
                  effectiveMode === "login" ? "items-center" : "items-start"
                }`
              : "contents"
          }
        >
          <div className="sr-only">
            <h1>{title}</h1>
          </div>

          <section
            className={
              isCompany
                ? `w-full bg-transparent text-[#202623] ${effectiveMode === "login" ? "max-w-md" : "max-w-2xl"}`
                : "rounded-md bg-white p-6 text-slate-950 shadow-2xl"
            }
          >
            {isCompany ? (
              <header className="mb-7">
                <p className="text-xs font-normal text-[#b05e72]">WITH.COMMERCE PARTNER</p>
                <h2 className="mt-3 text-3xl font-normal text-[#1f2723] sm:text-4xl">
                  {effectiveMode === "login" ? "기업관리자 로그인" : "입점 파트너 신청"}
                </h2>
                <p className="mt-3 text-sm font-normal leading-6 text-[#66716b]">
                  {effectiveMode === "login"
                    ? "등록된 사업자번호와 비밀번호로 운영센터에 로그인하세요."
                    : "기업 정보와 담당자 정보를 입력해 입점 신청을 진행하세요."}
                </p>
              </header>
            ) : null}
          {isCompany ? (
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-md bg-[#e9eeeb] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`h-10 rounded-md text-sm font-normal ${mode === "login" ? "bg-white text-[#26312c] shadow-sm" : "text-[#6b756f]"}`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              className={`h-10 rounded-md text-sm font-normal ${mode === "signup" ? "bg-white text-[#26312c] shadow-sm" : "text-[#6b756f]"}`}
            >
              회원가입 요청
            </button>
          </div>
          ) : null}

          {effectiveMode === "login" ? (
            <form onSubmit={handleLogin}>
              <h2 className="sr-only">계정 로그인</h2>
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-normal">
                  {loginIdLabel}
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="done"
                    name={isCompany ? "businessRegistrationNumber" : "nurseryBusinessRegistrationNumber"}
                    value={businessNo}
                    onChange={(event) => setBusinessNo(event.target.value)}
                    className={`h-12 rounded-md bg-white px-3 text-base font-normal outline-none transition-colors ${isCompany ? "border border-[#cfd8d3] focus:border-[#7b9487] focus:ring-2 focus:ring-[#dce8e1]" : "border border-slate-200 focus:border-slate-950"}`}
                    placeholder={loginIdPlaceholder}
                  />
                  {isCompany ? <span className="text-xs font-normal text-[#748079]">아이디는 사업자등록번호입니다.</span> : null}
                </label>
                <label className="grid gap-2 text-sm font-normal">
                  비밀번호
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`h-12 rounded-md bg-white px-3 text-base font-normal outline-none transition-colors ${isCompany ? "border border-[#cfd8d3] focus:border-[#7b9487] focus:ring-2 focus:ring-[#dce8e1]" : "border border-slate-200 focus:border-slate-950"}`}
                    placeholder={isCompany ? "가입 시 등록한 비밀번호" : "1004"}
                  />
                </label>
              </div>
              {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-normal text-blue-800">{message}</p> : null}
              <button disabled={saving} type="submit" className="mt-6 h-12 w-full rounded-md bg-[#26312c] text-sm font-normal text-white transition-colors hover:bg-[#394941] disabled:opacity-60">
                {saving ? "확인 중" : "로그인"}
              </button>
            </form>
          ) : isCompany ? (
            <form onSubmit={handleCompanySignup}>
              <h2 className="text-2xl font-normal">기업 회원가입 요청</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {companySignupFields.map(([key, label, placeholder]) => (
                  <label key={key} className="grid gap-2 text-sm font-normal">
                    {label}
                    <input
                      type={key.includes("password") ? "password" : "text"}
                      inputMode={key === "representativeBirthDate" ? "numeric" : undefined}
                      maxLength={key === "representativeBirthDate" ? 8 : undefined}
                      value={String(signup[key] ?? "")}
                      onChange={(event) => {
                        const value =
                          key === "representativeBirthDate"
                            ? event.target.value.replace(/\D/g, "").slice(0, 8)
                            : event.target.value;
                        setSignup((current) => ({ ...current, [key]: value }));
                        if (key === "managerEmail") {
                          const nextEmail = value.trim().toLowerCase();
                          setSignupEmailVerification((current) =>
                            current.email && current.email !== nextEmail ? initialSignupEmailVerification : current,
                          );
                        }
                      }}
                      className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-slate-950"
                      placeholder={placeholder}
                    />
                    {key === "password" ? (
                      <span className={`text-xs font-normal ${signup.password.length > 0 && !signupPasswordValid ? "text-red-600" : "text-slate-500"}`}>
                        {signupPasswordPolicyMessage}
                      </span>
                    ) : null}
                    {key === "passwordConfirm" && signupPasswordConfirmTouched ? (
                      <span className={`text-xs font-normal ${signupPasswordMatches ? "text-emerald-700" : "text-red-600"}`}>
                        {signupPasswordMatches ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
                      </span>
                    ) : null}
                  </label>
                ))}
                <label className="grid gap-2 text-sm font-normal">
                  내국인/외국인
                  <select
                    value={signup.representativeNationality}
                    onChange={(event) =>
                      setSignup((current) => ({
                        ...current,
                        representativeNationality: event.target.value as SignupState["representativeNationality"],
                      }))
                    }
                    className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-slate-950"
                  >
                    <option value="">선택</option>
                    <option value="domestic">내국인</option>
                    <option value="foreign">외국인</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-normal">
                  성별
                  <select
                    value={signup.representativeGender}
                    onChange={(event) =>
                      setSignup((current) => ({
                        ...current,
                        representativeGender: event.target.value as SignupState["representativeGender"],
                      }))
                    }
                    className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-slate-950"
                  >
                    <option value="">선택</option>
                    <option value="male">남자</option>
                    <option value="female">여자</option>
                  </select>
                </label>
              </div>
              <div className="mt-5 rounded-md border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-normal text-slate-950">담당자 이메일 인증</h3>
                    <p className="mt-1 text-xs font-normal leading-5 text-blue-900">
                      가입 요청 전 담당자 이메일로 받은 6자리 인증번호를 확인해야 합니다.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-normal ring-1 ${
                      signupEmailVerified
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-white text-blue-800 ring-blue-200"
                    }`}
                  >
                    {signupEmailVerified ? "인증 완료" : "인증 필요"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <button
                    type="button"
                    disabled={saving || !signup.managerEmail.trim()}
                    onClick={handleSendSignupEmailCode}
                    className="h-11 rounded-md bg-slate-950 px-4 text-sm font-normal text-white disabled:opacity-50"
                  >
                    인증번호 발송
                  </button>
                  <span className="self-center text-xs font-normal text-slate-500">
                    {signupEmailVerification.emailMasked || signup.managerEmail || "담당자 이메일 입력 후 발송"}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={signupEmailVerification.code}
                    onChange={(event) =>
                      setSignupEmailVerification((current) => ({
                        ...current,
                        code: event.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    className="h-11 rounded-md border border-blue-200 px-3 text-sm font-normal outline-none focus:border-slate-950"
                    placeholder="인증번호 6자리"
                  />
                  <button
                    type="button"
                    disabled={signupEmailVerifyDisabled}
                    onClick={handleVerifySignupEmailCode}
                    className="h-11 rounded-md border border-blue-300 bg-white px-4 text-sm font-normal text-blue-800 disabled:opacity-50"
                  >
                    인증 확인
                  </button>
                </div>
                {signupEmailVerification.message ? (
                  <p className="mt-3 text-xs font-normal leading-5 text-blue-900">{signupEmailVerification.message}</p>
                ) : null}
              </div>
              <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-normal text-slate-950">입점 필수 서류</h3>
                    <p className="mt-1 text-xs font-normal leading-5 text-emerald-900">
                      파일을 선택한 뒤 회원가입 요청을 누르면 Firebase Storage 저장 후 Gmail 발송 큐에 등록됩니다.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-normal text-emerald-800 ring-1 ring-emerald-200">
                    Gmail: withcadmin@gmail.com
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {companySignupDocumentSlots.map((slot) => {
                    const file = signupFiles[slot.id];

                    return (
                      <label key={slot.id} className="grid gap-2 rounded-md bg-white p-3 text-sm font-normal ring-1 ring-emerald-100">
                        <span>
                          {slot.label}
                          {slot.required ? <span className="ml-1 text-red-600">*</span> : null}
                        </span>
                        <span className="text-xs font-normal leading-5 text-slate-500">{slot.helper}</span>
                        <input
                          type="file"
                          accept={slot.accept}
                          className="text-xs font-normal text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-xs file:font-normal file:text-white"
                          onChange={(event) => {
                            const selectedFile = event.target.files?.[0];
                            setSignupFiles((current) => ({ ...current, [slot.id]: selectedFile }));
                          }}
                        />
                        {file ? <span className="text-xs font-normal text-emerald-800">{`${file.name} · ${formatFileSize(file.size)}`}</span> : null}
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="mt-4 flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-normal">
                <input
                  type="checkbox"
                  checked={signup.agreed}
                  onChange={(event) => setSignup((current) => ({ ...current, agreed: event.target.checked }))}
                />
                개인정보 및 운영 약관에 동의합니다.
              </label>
              {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-normal text-blue-800">{message}</p> : null}
              <button disabled={saving} type="submit" className="mt-6 h-12 w-full rounded-md bg-[#26312c] text-sm font-normal text-white transition-colors hover:bg-[#394941] disabled:opacity-60">
                {saving ? "서류 접수 중" : "회원가입 요청"}
              </button>
            </form>
          ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
