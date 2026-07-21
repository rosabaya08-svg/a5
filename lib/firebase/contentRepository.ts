import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ensureCompanyFirebaseAuthFromSession } from "@/lib/auth/companyFirebaseAuth";
import { readPortalSession } from "@/lib/auth/session";
import { ensureAnonymousFirebaseUser, getFirebaseAuthClient, getFirebaseDb, getFirebaseStorageClient } from "@/lib/firebase/client";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";

export type CmsCollectionName =
  | "products"
  | "product_options"
  | "company_brand_pages"
  | "company_brand_events"
  | "company_brand_messages"
  | "company_ad_assets"
  | "marketing_banners"
  | "marketing_videos"
  | "brands"
  | "product_detail_pages"
  | "company_product_edit_requests"
  | "company_api_integration_requests"
  | "nursery_auto_signup_profiles"
  | "home_sections"
  | "tablet_home_configs"
  | "mobile_home_configs"
  | "media_assets";

export type CmsUploadCollectionName = CmsCollectionName | "company_documents";

export type CmsRecord = {
  id: string;
  title?: string;
  placement?: string;
  target?: string;
  approval_status?: string;
  status?: string;
  asset_url?: string;
  asset_path?: string;
  asset_type?: string;
  updated_at?: unknown;
  [key: string]: unknown;
};

export type CompanyProductUpsertPayload = {
  product: CmsRecord;
  detailPage: CmsRecord;
  options: CmsRecord[];
  suspendedOptions?: CmsRecord[];
  supplyProfile?: CmsRecord;
  operation: "publish" | "update" | "bulk";
};
export type CompanyProductLifecycleAction = "suspend" | "archive" | "restore";

export type CmsUploadScope = {
  companyId?: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  productId?: string;
};

export function createCmsId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeFileName(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "upload";
}

function assetTypeFor(file: File) {
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("image/")) return "image";
  return "document";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sanitizeFirestoreValue(value: unknown): unknown {
  if (value === undefined) return undefined;

  if (Array.isArray(value)) {
    return value.map((item) => {
      const sanitized = sanitizeFirestoreValue(item);
      return sanitized === undefined ? null : sanitized;
    });
  }

  if (!isPlainRecord(value)) return value;

  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, item]) => {
    const sanitized = sanitizeFirestoreValue(item);
    if (sanitized !== undefined) acc[key] = sanitized;
    return acc;
  }, {});
}

function sanitizeFirestoreRecord(record: Record<string, unknown>) {
  return sanitizeFirestoreValue(record) as Record<string, unknown>;
}

const productDocumentTypes = new Set([
  "kc_certificate",
  "test_report",
  "brand_import_certificate",
  "product_detail_image",
  "product_video",
  "product_detail_asset",
]);
const superAdminEmail = "rosabaya08@gmail.com";
const publicStorefrontCmsCollections = new Set<CmsUploadCollectionName>([
  "brands",
  "marketing_banners",
  "marketing_videos",
  "home_sections",
  "tablet_home_configs",
  "mobile_home_configs",
  "media_assets",
]);
const companyOwnedCmsCollections = new Set<CmsUploadCollectionName>([
  "products",
  "product_options",
  "company_brand_pages",
  "company_brand_events",
  "company_brand_messages",
  "company_ad_assets",
  "product_detail_pages",
  "company_product_edit_requests",
  "company_api_integration_requests",
  "company_documents",
]);

function normalizeEmail(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function hasAdminPortalSession() {
  const session = readPortalSession("admin");
  return session?.role === "SUPER_ADMIN" || session?.role === "admin";
}

function hasCompanyPortalSession() {
  const session = readPortalSession("company");
  return session?.role === "company" && Boolean(session.businessNo && session.companyId);
}

async function prepareScopedCmsWriteSession(collectionName: CmsUploadCollectionName) {
  if (companyOwnedCmsCollections.has(collectionName) && hasCompanyPortalSession()) {
    const companyUser = await ensureCompanyFirebaseAuthFromSession();
    if (!companyUser) {
      throw new Error("COMPANY_FIREBASE_AUTH_REQUIRED");
    }
    return companyUser;
  }

  return prepareCmsSession();
}

async function prepareAdminCmsWriteSession(collectionName: CmsUploadCollectionName, options: { privileged?: boolean } = {}) {
  if (!publicStorefrontCmsCollections.has(collectionName)) {
    return prepareScopedCmsWriteSession(collectionName);
  }

  const auth = getFirebaseAuthClient();
  const user = auth?.currentUser;

  if (hasAdminPortalSession() && user && !user.isAnonymous && normalizeEmail(user.email) === superAdminEmail) {
    return user;
  }

  if (!options.privileged && hasAdminPortalSession()) {
    return prepareCmsSession();
  }

  throw new Error("최고관리자 Google 계정으로 다시 로그인해야 광고 파일을 업로드할 수 있습니다.");
}

function cmsStoragePath(collectionName: CmsUploadCollectionName, recordId: string, file: File, scope?: CmsUploadScope) {
  const assetType = assetTypeFor(file);
  const fileName = `${Date.now()}-${safeFileName(file.name)}`;
  const companyId = scope?.companyId ?? "company-sanho-care";
  const productId = scope?.productId || recordId;

  if (collectionName === "company_documents") {
    return `companies/${companyId}/onboarding/company-document/${recordId}-${safeFileName(file.name)}`;
  }

  if (collectionName === "product_detail_pages") {
    const folder = assetType === "video" ? "videos" : assetType === "gif" ? "gifs" : assetType === "document" ? "documents" : "images";
    return `companies/${companyId}/products/${productId}/${folder}/${fileName}`;
  }

  if (collectionName === "marketing_banners" || collectionName === "marketing_videos") {
    return `companies/${companyId}/ad-materials/${collectionName}/${recordId}/${fileName}`;
  }

  if (collectionName === "company_brand_pages") {
    return `companies/${companyId}/brand-pages/${recordId}/${fileName}`;
  }

  if (collectionName === "company_brand_events") {
    return `companies/${companyId}/brand-events/${recordId}/${fileName}`;
  }

  if (collectionName === "company_brand_messages") {
    return `companies/${companyId}/brand-messages/${recordId}/${fileName}`;
  }

  if (collectionName === "company_ad_assets") {
    return `companies/${companyId}/ad-assets/${recordId}/${fileName}`;
  }

  if (collectionName === "brands") {
    return `public/storefront/brands/${recordId}/${fileName}`;
  }

  if (collectionName === "home_sections" || collectionName === "tablet_home_configs" || collectionName === "mobile_home_configs") {
    return `public/storefront/${collectionName}/${recordId}/${fileName}`;
  }

  return `public/storefront/media_assets/${recordId}/${fileName}`;
}

function companyDocumentStoragePath(recordId: string, file: File, scope?: CmsUploadScope, metadata?: Record<string, string>) {
  const companyId = scope?.companyId ?? metadata?.companyId ?? "";
  const productId = scope?.productId || "product-draft";
  const documentType = metadata?.documentType ?? "onboarding_document";
  const fileName = `${recordId}-${safeFileName(file.name)}`;

  if (documentType === "bankbook_copy") {
    return `companies/${companyId}/bank-documents/${documentType}/${fileName}`;
  }

  if (productDocumentTypes.has(documentType)) {
    return `companies/${companyId}/product-documents/${productId}/${documentType}/${fileName}`;
  }

  return `companies/${companyId}/onboarding/${documentType}/${fileName}`;
}

async function prepareCmsSession() {
  try {
    const companyUser = await ensureCompanyFirebaseAuthFromSession();
    if (companyUser) return companyUser;
  } catch {
    // Company-scoped auth is best effort for admin CMS screens.
  }

  try {
    return await ensureAnonymousFirebaseUser();
  } catch {
    return null;
  }
}

export function subscribeCmsRecords(
  collectionName: CmsCollectionName,
  onChange: (records: CmsRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  if (typeof window === "undefined") {
    onChange([]);
    return () => undefined;
  }

  let unsubscribe: Unsubscribe = () => undefined;

  void prepareCmsSession()
    .then(() => {
      const db = getFirebaseDb();

      if (!db) {
        onError("Firebase web config is missing. Add NEXT_PUBLIC_FIREBASE_* values to enable live sync.");
        return;
      }

      unsubscribe = onSnapshot(
        collection(db, collectionName),
        (snapshot) => {
          onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        },
        (error) => onError(error.message),
      );
    })
    .catch((error) => onError(error instanceof Error ? error.message : "Firebase anonymous auth failed."));

  return () => unsubscribe();
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      const commaIndex = value.indexOf(",");
      resolve(commaIndex >= 0 ? value.slice(commaIndex + 1) : value);
    };
    reader.readAsDataURL(file);
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function userUploadErrorMessage(collectionName: CmsUploadCollectionName, serverUploadError: unknown, storageUploadError?: unknown) {
  const serverMessage = errorMessage(serverUploadError);
  const storageMessage = storageUploadError ? errorMessage(storageUploadError) : "";
  const joined = [serverMessage, storageMessage].filter(Boolean).join(" / ");

  if (joined.includes("COMPANY_FIREBASE_AUTH_SESSION_NOT_RESTORED") || joined.includes("COMPANY_FIREBASE_AUTH_REQUIRED")) {
    return "기업 로그인 권한이 아직 복원되지 않았습니다. 다시 로그인한 뒤 파일을 업로드해 주세요.";
  }

  if (joined.includes("CMS_UPLOAD_ADMIN_REQUIRED")) {
    return "최고관리자 Google 계정으로 다시 로그인해야 배너/광고 파일을 업로드할 수 있습니다.";
  }

  if (joined.includes("CMS_UPLOAD_INVALID_TOKEN") || joined.includes("Firebase ID token")) {
    return "Firebase 인증 토큰을 확인하지 못했습니다. 로그인 상태를 새로고침한 뒤 다시 업로드해 주세요.";
  }

  if (joined.includes("storage/unauthenticated") || joined.includes("User is not authenticated")) {
    return "Firebase Storage 업로드 권한이 없습니다. 로그인 세션을 다시 확인해 주세요.";
  }

  if (joined.includes("storage/unauthorized") || joined.includes("insufficient permissions") || joined.includes("permission")) {
    return "Firebase Storage 또는 Firestore 규칙에서 업로드가 차단되었습니다. 계정 권한과 저장 경로를 확인해야 합니다.";
  }

  if (collectionName === "company_documents") {
    return `기업 서류 업로드에 실패했습니다. ${joined}`;
  }

  return `파일 업로드에 실패했습니다. ${joined}`;
}

async function uploadCmsFileViaServer(
  collectionName: CmsUploadCollectionName,
  recordId: string,
  file: File,
  scope?: CmsUploadScope,
  metadata?: Record<string, string>,
): Promise<{ url: string; path: string; assetType: string }> {
  const url = getPaymentFunctionUrl("cmsUploadFile");
  const auth = getFirebaseAuthClient();
  const token = await auth?.currentUser?.getIdToken(true);

  if (!url || !token) {
    throw new Error("CMS server upload endpoint or Firebase ID token is missing.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      collectionName,
      recordId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      base64: await fileToBase64(file),
      scope,
      metadata,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    url?: string;
    path?: string;
    assetType?: string;
    error?: { message?: string };
  };

  if (!response.ok || !body.ok || !body.url || !body.path || !body.assetType) {
    throw new Error(body.error?.message || `CMS server upload failed with HTTP ${response.status}.`);
  }

  return {
    url: body.url,
    path: body.path,
    assetType: body.assetType,
  };
}

export async function saveCmsRecord(collectionName: CmsCollectionName, record: CmsRecord) {
  await prepareAdminCmsWriteSession(collectionName);

  const db = getFirebaseDb();

  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const { id, ...data } = record;
  const sanitizedData = sanitizeFirestoreRecord(data);

  await setDoc(
    doc(db, collectionName, id),
    {
      ...sanitizedData,
      demo_read_enabled: true,
      guest_write_enabled: true,
      source: "cms_beta",
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );

  return id;
}

export async function saveCompanyProduct(payload: CompanyProductUpsertPayload) {
  const session = readPortalSession("company");
  if (!session?.companyId || !session.businessNo) throw new Error("COMPANY_SESSION_REQUIRED");

  const productCompanyId = String(payload.product.company_id ?? payload.product.companyId ?? "").trim();
  if (productCompanyId !== session.companyId) throw new Error("COMPANY_PRODUCT_SCOPE_MISMATCH");

  await ensureCompanyFirebaseAuthFromSession();
  const endpoint = getPaymentFunctionUrl("companyProductUpsert");
  const token = await getFirebaseAuthClient()?.currentUser?.getIdToken(true);
  if (!endpoint || !token) throw new Error("COMPANY_PRODUCT_UPSERT_AUTH_REQUIRED");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as { ok?: boolean; productId?: string; snapshotPublished?: boolean; error?: { message?: string } };
  if (!response.ok || !body.ok || !body.productId) {
    throw new Error(body.error?.message || "COMPANY_PRODUCT_UPSERT_FAILED_" + response.status);
  }
  return body;
}
export async function manageCompanyProduct(productId: string, action: CompanyProductLifecycleAction, reason?: string) {
  const session = readPortalSession("company");
  if (!session?.companyId || !session.businessNo) throw new Error("COMPANY_SESSION_REQUIRED");

  await ensureCompanyFirebaseAuthFromSession();
  const endpoint = getPaymentFunctionUrl("companyProductLifecycle");
  const token = await getFirebaseAuthClient()?.currentUser?.getIdToken(true);
  if (!endpoint || !token) throw new Error("COMPANY_PRODUCT_LIFECYCLE_AUTH_REQUIRED");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ productId, action, reason }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    productId?: string;
    status?: string;
    error?: { message?: string };
  };
  if (!response.ok || !body.ok || !body.productId) {
    throw new Error(body.error?.message || "COMPANY_PRODUCT_LIFECYCLE_FAILED_" + response.status);
  }
  return body;
}

export async function moderateProduct(productId: string, action: "suspend" | "restore", reason?: string) {
  const endpoint = getPaymentFunctionUrl("adminProductModeration");
  const auth = getFirebaseAuthClient();
  const token = await auth?.currentUser?.getIdToken(true);

  if (!endpoint || !token) {
    throw new Error("Admin product moderation endpoint or Firebase ID token is missing.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
      action,
      reason,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: { message?: string };
  };

  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message || `Product moderation failed with HTTP ${response.status}.`);
  }

  return body;
}

export async function publishStorefrontSnapshot(reason: string) {
  const endpoint = getPaymentFunctionUrl("publishStorefrontSnapshot");
  const auth = getFirebaseAuthClient();
  const token = await auth?.currentUser?.getIdToken(true);

  if (!endpoint || !token) {
    throw new Error("Storefront snapshot endpoint or Firebase ID token is missing.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: { message?: string };
  };

  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message || `Storefront snapshot publish failed with HTTP ${response.status}.`);
  }

  return body;
}

export async function uploadCmsFile(
  collectionName: CmsUploadCollectionName,
  recordId: string,
  file: File,
  scope?: CmsUploadScope,
  metadata?: Record<string, string>,
): Promise<{ url: string; path: string; assetType: string }> {
  await prepareAdminCmsWriteSession(collectionName, { privileged: true });

  let serverUploadError: unknown = null;
  try {
    return await uploadCmsFileViaServer(collectionName, recordId, file, scope, metadata);
  } catch (error) {
    serverUploadError = error;
  }

  if (companyOwnedCmsCollections.has(collectionName)) {
    try {
      await prepareScopedCmsWriteSession(collectionName);
      return await uploadCmsFileViaServer(collectionName, recordId, file, scope, metadata);
    } catch (error) {
      serverUploadError = error;
    }
  }

  if (publicStorefrontCmsCollections.has(collectionName) && serverUploadError) {
    throw new Error(userUploadErrorMessage(collectionName, serverUploadError));
  }

  const storage = getFirebaseStorageClient();

  if (!storage) {
    throw new Error("Firebase Storage is not configured.");
  }

  const assetType = assetTypeFor(file);
  const path =
    collectionName === "company_documents"
      ? companyDocumentStoragePath(recordId, file, scope, metadata)
      : cmsStoragePath(collectionName, recordId, file, scope);
  const uploadRef = ref(storage, path);

  try {
    await uploadBytes(uploadRef, file, {
      contentType: file.type || "application/octet-stream",
      customMetadata: {
        collectionName,
        recordId,
        assetType,
        source: "a5-cms-beta",
        ...metadata,
      },
    });
  } catch (error) {
    if (serverUploadError) {
      throw new Error(userUploadErrorMessage(collectionName, serverUploadError, error));
    }

    throw new Error(userUploadErrorMessage(collectionName, error));
  }

  const url = await getDownloadURL(uploadRef);

  return { url, path, assetType };
}
