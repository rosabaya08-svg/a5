import { FieldValue, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb, getAdminDbForProject } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type A4NurseryAutoSignupRequest = {
  businessRegistrationNo?: string;
  password?: string;
};

type ResponseWithHeaders = HttpResponseLike & {
  set?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
  header?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
};

const sourceProjectId = process.env.A4_SOURCE_PROJECT_ID?.trim() || "signage-partner";
const defaultPassword = "1004";

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
  "jibun_address",
  "jibunAddress",
  "parcel_address",
  "parcelAddress",
  "address",
  "address1",
  "address_1",
  "address_line1",
  "addressLine1",
  "full_address",
  "fullAddress",
  "location_address",
  "locationAddress",
  "location.address",
  "business.address",
  "company_address",
  "companyAddress",
  "store_address",
  "storeAddress",
  "facility_address",
  "facilityAddress",
  "center_address",
  "centerAddress",
  "branch_address",
  "branchAddress",
  "biz_address",
  "bizAddress",
  "business_place_address",
  "businessPlaceAddress",
  "주소",
  "사업장주소",
  "사업자주소",
  "사업장소재지",
  "소재지",
  "도로명주소",
  "지번주소",
  "대표주소",
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

function businessNoCandidates(value: string) {
  const normalized = normalizeBusinessRegistrationNo(value);
  const formattedTenDigit =
    normalized.length === 10 ? `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5)}` : "";

  return unique([value, normalized, formattedTenDigit]);
}

function makeNurseryId(normalizedBusinessNo: string) {
  return `nursery-${normalizedBusinessNo}`;
}

function setCorsHeaders(response: HttpResponseLike) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-A5-Client, X-A5-Nursery-Auto-Signup",
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

  return ["nursery", "partner", "business", "company", "user", "member", "client", "branch", "profile"].some((keyword) =>
    name.includes(keyword),
  );
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

async function queryFirstByBusinessNo(sourceDb: Firestore, collectionPath: string, businessRegistrationNo: string) {
  const fields = unique(businessNoFields);
  const candidates = businessNoCandidates(businessRegistrationNo);

  for (const field of fields) {
    const snapshot = await sourceDb.collection(collectionPath).where(field, "in", candidates).limit(1).get();
    if (!snapshot.empty) {
      return { doc: snapshot.docs[0], matchedBusinessField: field };
    }
  }

  return null;
}

async function scanFirstByBusinessNo(sourceDb: Firestore, collectionPath: string, businessRegistrationNo: string) {
  const fields = unique(businessNoFields);
  const normalized = normalizeBusinessRegistrationNo(businessRegistrationNo);
  const snapshot = await sourceDb.collection(collectionPath).limit(250).get();
  const matched = snapshot.docs.find((doc) => {
    const data = doc.data();
    return fields.some((field) => normalizeBusinessRegistrationNo(fieldString(data, field)) === normalized);
  });
  const matchedBusinessField = matched
    ? fields.find((field) => normalizeBusinessRegistrationNo(fieldString(matched.data(), field)) === normalized)
    : undefined;

  return matched ? { doc: matched, matchedBusinessField: matchedBusinessField ?? "scan" } : null;
}

async function findSourceNurseryByBusinessNo(sourceDb: Firestore, businessRegistrationNo: string) {
  for (const collectionPath of await discoverSourceNurseryCollections(sourceDb)) {
    const queried = await queryFirstByBusinessNo(sourceDb, collectionPath, businessRegistrationNo);
    if (queried) return { ...queried, sourceNurseryPath: queried.doc.ref.path };

    const scanned = await scanFirstByBusinessNo(sourceDb, collectionPath, businessRegistrationNo);
    if (scanned) return { ...scanned, sourceNurseryPath: scanned.doc.ref.path };
  }

  return null;
}

function mapSourceProfile(doc: QueryDocumentSnapshot, matchedBusinessField: string, sourceNurseryPath: string, requestBusinessNo: string) {
  const data = doc.data();
  const normalized = normalizeBusinessRegistrationNo(requestBusinessNo);
  const businessRegistrationNo = fieldString(data, ...businessNoFields) || requestBusinessNo;
  const nurseryId = makeNurseryId(normalized);
  const now = new Date().toISOString();

  return {
    nurseryId,
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
    matchedBusinessField,
    createdAt: now,
    updatedAt: now,
  };
}

export async function a4NurseryAutoSignupHandler(request: HttpRequestLike, response: HttpResponseLike) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (!requirePost(request, response)) return;

  const body = readObjectBody<A4NurseryAutoSignupRequest>(request);
  const businessRegistrationNo = optionalString(body.businessRegistrationNo);

  if (!businessRegistrationNo || !normalizeBusinessRegistrationNo(businessRegistrationNo)) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "A4_NURSERY_AUTO_SIGNUP_BUSINESS_NO_MISSING",
        message: "businessRegistrationNo is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  if (body.password !== defaultPassword) {
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "A4_NURSERY_AUTO_SIGNUP_PASSWORD_INVALID",
        message: "Default nursery password does not match.",
        httpStatus: 401,
      },
    });
    return;
  }

  const sourceDb = getAdminDbForProject("a4-nursery-auto-signup-source", sourceProjectId);
  const sourceNursery = await findSourceNurseryByBusinessNo(sourceDb, businessRegistrationNo);

  if (!sourceNursery) {
    sendJson(response, 404, {
      ok: false,
      error: {
        code: "A4_NURSERY_AUTO_SIGNUP_NOT_FOUND",
        message: "No signage-partner nursery matched the business registration number.",
        httpStatus: 404,
      },
    });
    return;
  }

  const profile = mapSourceProfile(
    sourceNursery.doc,
    sourceNursery.matchedBusinessField,
    sourceNursery.sourceNurseryPath,
    businessRegistrationNo,
  );
  const targetDb = getAdminDb();
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
      signup_source: "SIGNAGE_PARTNER_BUSINESS_NO",
      status: "active",
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

  sendJson(response, 200, {
    ok: true,
    profile,
    message: "signage-partner nursery was matched by business registration number and signed up in A5.",
  });
}
