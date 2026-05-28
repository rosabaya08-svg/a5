import { FieldValue, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb, getAdminDbForProject } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type A4NurseryBulkSignupRequest = {
  password?: string;
  limit?: number;
  source?: string;
};

type SourceNurseryProfile = {
  nurseryId: string;
  businessRegistrationNo: string;
  businessRegistrationNoNormalized: string;
  nurseryName: string;
  representativeName: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  businessAddress: string;
  roomCount: string;
  externalNurseryId: string;
  sourceProjectId: string;
  sourceNurseryPath: string;
  matchedBusinessField: string;
  createdAt: string;
  updatedAt: string;
  status: "approved";
  source: "signage_partner";
};

type ResponseWithHeaders = HttpResponseLike & {
  set?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
  header?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
};

const sourceProjectId = process.env.A4_SOURCE_PROJECT_ID?.trim() || "signage-partner";
const defaultPassword = "1004";
const defaultLimit = 500;

const businessNoFields = [
  process.env.A4_NURSERY_BUSINESS_FIELD,
  "business_registration_no",
  "businessRegistrationNo",
  "business_registration_number",
  "businessRegistrationNumber",
  "business_number",
  "businessNumber",
  "business_no",
  "businessNo",
  "biz_no",
  "bizNo",
  "biz_num",
  "bizNum",
  "biznum",
  "biz_number",
  "bizNumber",
  "business_license_no",
  "businessLicenseNo",
  "business_license_number",
  "businessLicenseNumber",
  "license_no",
  "licenseNo",
  "license_number",
  "licenseNumber",
  "brn",
  "registration_no",
  "registrationNo",
  "company_registration_no",
  "companyRegistrationNo",
  "company_registration_number",
  "companyRegistrationNumber",
  "registration_number",
  "사업자등록번호",
  "사업자번호",
  "사업자등록증번호",
];

const nurseryNameFields = [
  "nursery_name",
  "nurseryName",
  "center_name",
  "centerName",
  "branch_name",
  "branchName",
  "company_name",
  "companyName",
  "business_name",
  "businessName",
  "store_name",
  "storeName",
  "hospital_name",
  "hospitalName",
  "partner_name",
  "partnerName",
  "facility_name",
  "facilityName",
  "기관명",
  "상호",
  "업체명",
  "조리원명",
  "name",
  "title",
];

const representativeFields = [
  "representative_name",
  "representativeName",
  "owner_name",
  "ownerName",
  "ceo_name",
  "ceoName",
  "대표자명",
  "대표자",
];
const managerFields = ["manager_name", "managerName", "contact_name", "contactName", "admin_name", "adminName", "담당자명", "담당자"];
const phoneFields = ["manager_phone", "managerPhone", "phone", "tel", "contact_phone", "contactPhone", "mobile", "담당자연락처", "연락처", "전화번호"];
const emailFields = ["manager_email", "managerEmail", "email", "contact_email", "contactEmail", "담당자이메일", "이메일"];
const addressFields = [
  "business_address",
  "businessAddress",
  "registered_address",
  "registeredAddress",
  "road_address",
  "roadAddress",
  "address",
  "주소",
  "사업장주소",
];
const roomCountFields = ["room_count", "roomCount", "rooms_count", "roomsCount", "room_total", "roomTotal", "객실수"];
const externalNurseryIdFields = [
  "external_nursery_id",
  "externalNurseryId",
  "nursery_id",
  "nurseryId",
  "center_id",
  "centerId",
  "branch_id",
  "branchId",
  "partner_id",
  "partnerId",
];

function optionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function normalizeKey(value: string) {
  return value.replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
}

function deepFieldString(value: unknown, names: Array<string | undefined>, path: string[] = [], depth = 0): string {
  if (depth > 5 || typeof value !== "object" || value === null) return "";

  const aliases = unique(names).map(normalizeKey);
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);

  for (const [key, child] of entries) {
    const normalizedKey = normalizeKey(key);
    const normalizedPath = normalizeKey([...path, key].join("."));

    if (aliases.includes(normalizedKey) || aliases.includes(normalizedPath)) {
      const text = optionalString(child);
      if (text) return text;
    }
  }

  for (const [key, child] of entries) {
    const text = deepFieldString(child, names, [...path, key], depth + 1);
    if (text) return text;
  }

  return "";
}

function fieldString(data: Record<string, unknown>, ...names: Array<string | undefined>) {
  for (const name of names) {
    if (!name) continue;
    const value = optionalString(data[name]);
    if (value) return value;
  }

  return deepFieldString(data, names);
}

function unique(items: Array<string | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];
}

function splitConfigList(value: string | undefined, fallback: string[]) {
  const configured = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return configured && configured.length > 0 ? configured : fallback;
}

function normalizeBusinessRegistrationNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function makeNurseryId(normalizedBusinessNo: string) {
  return `nursery-${normalizedBusinessNo}`;
}

function setCorsHeaders(response: HttpResponseLike) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-A5-Client, X-A5-Nursery-Bulk-Sync",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "3600",
  };
  const withHeaders = response as ResponseWithHeaders;

  if (typeof withHeaders.set === "function") {
    withHeaders.set(headers);
    return;
  }

  if (typeof withHeaders.header === "function") {
    withHeaders.header(headers);
  }
}

function sourceNurseryCollections() {
  return splitConfigList(process.env.A4_NURSERIES_COLLECTION_PATHS ?? process.env.A4_NURSERIES_COLLECTION_PATH, [
    "nurseries",
    "signage_partners",
    "partners",
    "companies",
    "users",
    "members",
    "clients",
    "branches",
    "profiles",
    "businesses",
  ]);
}

function isNurseryProfileCollection(collectionPath: string) {
  const name = collectionPath.toLowerCase();
  const blocked = [
    "customers",
    "orders",
    "rooms",
    "devices",
    "tasks",
    "notices",
    "ad_assets",
    "app_release_files",
    "app_release_history",
    "app_releases",
    "global_campaigns",
    "branch_link_codes",
  ];

  if (blocked.includes(name) || name.includes("audit") || name.includes("release")) return false;

  return [
    "nursery",
    "partner",
    "business",
    "company",
    "user",
    "member",
    "client",
    "branch",
    "profile",
  ].some((keyword) => name.includes(keyword));
}

async function discoverSourceNurseryCollections(sourceDb: Firestore) {
  const configured = sourceNurseryCollections();
  const maxCollections = Math.min(Math.max(Number(process.env.A4_SOURCE_COLLECTION_DISCOVERY_LIMIT ?? 60) || 60, 1), 120);

  try {
    const discovered = await sourceDb.listCollections();
    return unique([...configured, ...discovered.map((collection) => collection.id)])
      .filter(isNurseryProfileCollection)
      .slice(0, maxCollections);
  } catch {
    return configured.filter(isNurseryProfileCollection);
  }
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

function isPermissionDenied(error: unknown) {
  const code = errorCode(error);
  const message = errorMessage(error);
  return code === "7" || code === "PERMISSION_DENIED" || message.includes("PERMISSION_DENIED");
}

function mapSourceProfile(doc: QueryDocumentSnapshot, sourceNurseryPath: string): SourceNurseryProfile | null {
  const data = doc.data();
  const businessRegistrationNo = fieldString(data, ...businessNoFields);
  const normalized = normalizeBusinessRegistrationNo(businessRegistrationNo);

  if (!normalized) return null;

  const now = new Date().toISOString();

  return {
    nurseryId: makeNurseryId(normalized),
    businessRegistrationNo,
    businessRegistrationNoNormalized: normalized,
    nurseryName: fieldString(data, ...nurseryNameFields) || "산후조리원",
    representativeName: fieldString(data, ...representativeFields),
    managerName: fieldString(data, ...managerFields),
    managerPhone: fieldString(data, ...phoneFields),
    managerEmail: fieldString(data, ...emailFields),
    businessAddress: fieldString(data, ...addressFields),
    roomCount: fieldString(data, ...roomCountFields),
    externalNurseryId: fieldString(data, ...externalNurseryIdFields) || doc.id,
    sourceProjectId,
    sourceNurseryPath,
    matchedBusinessField:
      unique(businessNoFields).find((field) => normalizeBusinessRegistrationNo(fieldString(data, field)) === normalized) ?? "scan",
    createdAt: now,
    updatedAt: now,
    status: "approved",
    source: "signage_partner",
  };
}

async function readSourceProfiles(sourceDb: Firestore, limit: number) {
  const profiles: SourceNurseryProfile[] = [];
  const seen = new Set<string>();
  const skipped: Array<{ sourcePath: string; reason: string }> = [];
  const scannedCollections = await discoverSourceNurseryCollections(sourceDb);
  let scannedDocumentCount = 0;

  const pushSkipped = (item: { sourcePath: string; reason: string }) => {
    if (skipped.length < 100) skipped.push(item);
  };

  for (const collectionPath of scannedCollections) {
    const snapshot = await sourceDb.collection(collectionPath).limit(limit).get();
    scannedDocumentCount += snapshot.size;

    for (const doc of snapshot.docs) {
      const profile = mapSourceProfile(doc, doc.ref.path);

      if (!profile) {
        pushSkipped({ sourcePath: doc.ref.path, reason: "business_registration_no missing" });
        continue;
      }

      if (seen.has(profile.businessRegistrationNoNormalized)) {
        pushSkipped({ sourcePath: doc.ref.path, reason: "duplicate business registration number" });
        continue;
      }

      seen.add(profile.businessRegistrationNoNormalized);
      profiles.push(profile);

      if (profiles.length >= limit) return { profiles, skipped, scannedCollections, scannedDocumentCount };
    }
  }

  return { profiles, skipped, scannedCollections, scannedDocumentCount };
}

async function saveProfile(targetDb: Firestore, profile: SourceNurseryProfile) {
  const now = FieldValue.serverTimestamp();

  await targetDb.collection("nurseries").doc(profile.nurseryId).set(
    {
      nursery_id: profile.nurseryId,
      business_registration_no: profile.businessRegistrationNo,
      business_registration_no_normalized: profile.businessRegistrationNoNormalized,
      name: profile.nurseryName,
      representative_name: profile.representativeName,
      manager_name: profile.managerName,
      manager_phone: profile.managerPhone,
      manager_email: profile.managerEmail,
      business_address: profile.businessAddress,
      room_count: profile.roomCount,
      a4_external_nursery_id: profile.externalNurseryId,
      external_project_id: sourceProjectId,
      signup_source: "SIGNAGE_PARTNER_BULK_SYNC",
      status: "active",
      approval_status: "approved",
      account_status: "active",
      created_at: now,
      updated_at: now,
    },
    { merge: true },
  );

  await targetDb.collection("nursery_auto_signup_profiles").doc(`nursery-auto-${profile.businessRegistrationNoNormalized}`).set(
    {
      title: `${profile.nurseryName} 자동 가입`,
      status: "approved",
      approval_status: "approved",
      account_status: "active",
      source_app: "nursery",
      nursery_id: profile.nurseryId,
      business_registration_no: profile.businessRegistrationNo,
      business_registration_no_normalized: profile.businessRegistrationNoNormalized,
      nursery_name: profile.nurseryName,
      representative_name: profile.representativeName,
      manager_name: profile.managerName,
      manager_phone: profile.managerPhone,
      manager_email: profile.managerEmail,
      business_address: profile.businessAddress,
      room_count: profile.roomCount,
      default_password_policy: defaultPassword,
      external_nursery_id: profile.externalNurseryId,
      source_project_id: sourceProjectId,
      source_nursery_path: profile.sourceNurseryPath,
      matched_business_field: profile.matchedBusinessField,
      signup_source: "signage_partner",
      guest_write_enabled: true,
      source: "cms_beta",
      created_at: now,
      updated_at: now,
    },
    { merge: true },
  );
}

export async function a4NurseryBulkSignupHandler(request: HttpRequestLike, response: HttpResponseLike) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (!requirePost(request, response)) return;

  const body = readObjectBody<A4NurseryBulkSignupRequest>(request);

  if (body.password !== defaultPassword) {
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "A4_NURSERY_BULK_SIGNUP_PASSWORD_INVALID",
        message: "Default nursery password does not match.",
        httpStatus: 401,
      },
    });
    return;
  }

  try {
    const limit = Math.min(Math.max(Number(body.limit ?? defaultLimit) || defaultLimit, 1), 1000);
    const sourceDb = getAdminDbForProject("a4-nursery-bulk-signup-source", sourceProjectId);
    const targetDb = getAdminDb();
    const { profiles, skipped, scannedCollections, scannedDocumentCount } = await readSourceProfiles(sourceDb, limit);

    for (const profile of profiles) {
      await saveProfile(targetDb, profile);
    }

    sendJson(response, 200, {
      ok: true,
      source: body.source ?? "a2_signage_partner",
      sourceProjectId,
      importedCount: profiles.length,
      skippedCount: skipped.length,
      scannedCollections,
      scannedDocumentCount,
      profiles,
      skipped,
      message: "A2/signage-partner nursery profiles were bulk-synced into A5.",
    });
  } catch (error) {
    console.error("A4 nursery bulk signup failed", {
      sourceProjectId,
      code: errorCode(error),
      message: errorMessage(error),
    });

    if (isPermissionDenied(error)) {
      sendJson(response, 500, {
        ok: false,
        source: body.source ?? "a2_signage_partner",
        sourceProjectId,
        error: {
          code: "A4_NURSERY_BULK_SIGNUP_SOURCE_PERMISSION_DENIED",
          message:
            "A5 Functions 서비스 계정이 signage-partner Firestore를 읽을 권한이 없습니다. signage-partner 프로젝트에서 A5 Functions 서비스 계정에 Firestore 읽기 권한을 부여해야 합니다.",
          httpStatus: 500,
        },
      });
      return;
    }

    sendJson(response, 500, {
      ok: false,
      source: body.source ?? "a2_signage_partner",
      sourceProjectId,
      error: {
        code: "A4_NURSERY_BULK_SIGNUP_FAILED",
        message: "A2/signage-partner 산후조리원 가입자 연동 중 오류가 발생했습니다.",
        httpStatus: 500,
      },
    });
  }
}
