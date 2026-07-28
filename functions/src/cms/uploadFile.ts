import { randomUUID } from "crypto";
import { getAdminAuth, getAdminStorage } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type CmsUploadScope = {
  companyId?: unknown;
  nurseryId?: unknown;
  roomId?: unknown;
  tabletId?: unknown;
  productId?: unknown;
};

type CmsUploadRequest = {
  collectionName?: unknown;
  recordId?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  base64?: unknown;
  scope?: CmsUploadScope;
  metadata?: Record<string, unknown>;
};

const maxCmsUploadBytes = 25 * 1024 * 1024;
const maxCompanyDocumentBytes = 15 * 1024 * 1024;
const masterAdminEmail = "rosabaya08@gmail.com";
const adminOnlyUploadCollections = new Set([
  "brands",
  "marketing_banners",
  "marketing_videos",
  "home_sections",
  "tablet_home_configs",
  "mobile_home_configs",
  "media_assets",
]);
const productDocumentTypes = new Set([
  "kc_certificate",
  "test_report",
  "brand_import_certificate",
  "product_detail_image",
  "product_video",
  "product_detail_asset",
]);

export async function cmsUploadFileHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<CmsUploadRequest>(request);
  const collectionName = text(body.collectionName);
  const recordId = text(body.recordId);
  const fileName = text(body.fileName) || "upload";
  const contentType = text(body.contentType) || "application/octet-stream";
  const scope = body.scope && typeof body.scope === "object" ? body.scope : {};
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
  const companyId = text(scope.companyId) || text(metadata.companyId) || defaultCompanyId(collectionName);

  if (!collectionName || !recordId || !isAllowedCollection(collectionName)) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "CMS_UPLOAD_INVALID_TARGET",
        message: "A valid CMS collectionName and recordId are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const auth = await authorizeUpload(request, collectionName, companyId);
  if (!auth.ok) {
    sendJson(response, auth.httpStatus, {
      ok: false,
      error: {
        code: auth.code,
        message: auth.message,
        httpStatus: auth.httpStatus,
      },
    });
    return;
  }

  if (!isAllowedContentType(contentType)) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "CMS_UPLOAD_UNSUPPORTED_TYPE",
        message: "Unsupported upload content type.",
        httpStatus: 400,
      },
    });
    return;
  }

  const base64 = normalizeBase64(body.base64);
  if (!base64) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "CMS_UPLOAD_EMPTY_FILE",
        message: "Upload file content is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const buffer = Buffer.from(base64, "base64");
  const maxBytes = collectionName === "company_documents" ? maxCompanyDocumentBytes : maxCmsUploadBytes;

  if (!buffer.length || buffer.length > maxBytes) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "CMS_UPLOAD_SIZE_LIMIT",
        message: "Upload file exceeds the allowed size.",
        httpStatus: 400,
      },
    });
    return;
  }

  const assetType = assetTypeFor(contentType, fileName);
  const storagePath = cmsStoragePath(collectionName, recordId, fileName, contentType, scope, metadata);
  const bucket = getAdminStorage().bucket();
  const token = randomUUID();
  const storageFile = bucket.file(storagePath);

  await storageFile.save(buffer, {
    contentType,
    metadata: {
      metadata: {
        ...stringMetadata(metadata),
        collectionName,
        recordId,
        assetType,
        source: "a5-cms-server-upload",
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  sendJson(response, 200, {
    ok: true,
    url: downloadUrl(bucket.name, storagePath, token),
    path: storagePath,
    assetType,
    bucket: bucket.name,
    size: buffer.length,
  });
}

async function authorizeUpload(request: HttpRequestLike, collectionName: string, companyId: string) {
  const header = request.get?.("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return {
      ok: false as const,
      httpStatus: 401,
      code: "CMS_UPLOAD_AUTH_REQUIRED",
      message: "Firebase ID token is required for server upload.",
    };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    const email = text(decoded.email).toLowerCase();
    const role = text(decoded.role);
    const tokenCompanyId = text(decoded.company_id);

    if (email === masterAdminEmail || role === "SUPER_ADMIN" || role === "seed_admin") {
      return { ok: true as const };
    }

    if (adminOnlyUploadCollections.has(collectionName)) {
      return {
        ok: false as const,
        httpStatus: 403,
        code: "CMS_UPLOAD_ADMIN_REQUIRED",
        message: "This storefront upload target requires a super admin account.",
      };
    }

    if (companyId && role === "COMPANY_ADMIN" && tokenCompanyId === companyId) {
      return { ok: true as const };
    }

    return {
      ok: false as const,
      httpStatus: 403,
      code: "CMS_UPLOAD_FORBIDDEN",
      message: "The signed-in account cannot upload to this target.",
    };
  } catch {
    return {
      ok: false as const,
      httpStatus: 401,
      code: "CMS_UPLOAD_INVALID_TOKEN",
      message: "Firebase ID token could not be verified.",
    };
  }
}

function isAllowedCollection(value: string) {
  return [
    "products",
    "product_options",
    "company_brand_pages",
    "company_brand_events",
    "company_brand_messages",
    "company_ad_assets",
    "marketing_banners",
    "marketing_videos",
    "brands",
    "product_detail_pages",
    "company_documents",
    "home_sections",
    "tablet_home_configs",
    "mobile_home_configs",
    "media_assets",
  ].includes(value);
}

function isAllowedContentType(value: string) {
  return (
    value.startsWith("image/") ||
    value.startsWith("video/") ||
    value === "application/pdf" ||
    value === "application/msword" ||
    value === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    value === "application/vnd.ms-excel" ||
    value === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function cmsStoragePath(
  collectionName: string,
  recordId: string,
  originalFileName: string,
  contentType: string,
  scope: CmsUploadScope,
  metadata: Record<string, unknown>,
) {
  const assetType = assetTypeFor(contentType, originalFileName);
  const fileName = `${Date.now()}-${safeFileName(originalFileName)}`;
  const companyId = text(scope.companyId) || text(metadata.companyId) || defaultCompanyId(collectionName);
  const productId = text(scope.productId) || recordId;

  if (collectionName === "company_documents") {
    const documentType = text(metadata.documentType) || "onboarding_document";
    const storedFileName = `${recordId}-${safeFileName(originalFileName)}`;

    if (documentType === "bankbook_copy") {
      return `companies/${companyId}/bank-documents/${documentType}/${storedFileName}`;
    }

    if (productDocumentTypes.has(documentType)) {
      return `companies/${companyId}/product-documents/${productId}/${documentType}/${storedFileName}`;
    }

    return `companies/${companyId}/onboarding/${documentType}/${storedFileName}`;
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

function defaultCompanyId(collectionName: string) {
  return collectionName === "company_documents" ? "" : "company-sanho-care";
}

function assetTypeFor(contentType: string, fileName: string) {
  const normalizedName = fileName.toLowerCase();
  if (contentType.startsWith("video/")) return "video";
  if (contentType === "image/gif" || normalizedName.endsWith(".gif")) return "gif";
  if (contentType.startsWith("image/")) return "image";
  return "document";
}

function safeFileName(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "upload";
}

function normalizeBase64(value: unknown) {
  const raw = text(value);
  const commaIndex = raw.indexOf(",");
  return commaIndex >= 0 ? raw.slice(commaIndex + 1) : raw;
}

function stringMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value).slice(0, 1024)]),
  );
}

function downloadUrl(bucketName: string, storagePath: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
