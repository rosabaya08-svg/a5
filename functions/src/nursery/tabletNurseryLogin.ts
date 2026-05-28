import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type TabletNurseryLoginRequest = {
  businessRegistrationNo?: string;
  password?: string;
};

type ResponseWithHeaders = HttpResponseLike & {
  set?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
  header?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
};

const defaultPassword = "1004";

const businessNoFields = [
  "business_registration_no_normalized",
  "businessRegistrationNoNormalized",
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
  "brn",
  "registration_no",
  "registrationNo",
  "registration_number",
  "registrationNumber",
  "company_registration_no",
  "companyRegistrationNo",
  "license_no",
  "licenseNo",
];

const nurseryNameFields = [
  "nursery_name",
  "nurseryName",
  "name",
  "title",
  "center_name",
  "centerName",
  "branch_name",
  "branchName",
  "business_name",
  "businessName",
  "company_name",
  "companyName",
  "facility_name",
  "facilityName",
];

const representativeFields = ["representative_name", "representativeName", "owner_name", "ownerName", "ceo_name", "ceoName"];
const managerFields = ["manager_name", "managerName", "contact_name", "contactName", "admin_name", "adminName"];
const phoneFields = ["manager_phone", "managerPhone", "phone", "tel", "contact_phone", "contactPhone", "mobile"];
const emailFields = ["manager_email", "managerEmail", "email", "contact_email", "contactEmail"];
const addressFields = ["business_address", "businessAddress", "registered_address", "registeredAddress", "road_address", "roadAddress", "address"];
const roomCountFields = ["room_count", "roomCount", "rooms_count", "roomsCount", "room_total", "roomTotal"];
const nurseryIdFields = ["nursery_id", "nurseryId", "id", "center_id", "centerId", "branch_id", "branchId"];
const externalNurseryIdFields = ["external_nursery_id", "externalNurseryId", "a4_external_nursery_id", "a4ExternalNurseryId"];

function setCorsHeaders(response: HttpResponseLike) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-A5-Client",
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

function optionalString(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "";
}

function dateString(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value && typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }

  return fallback;
}

function normalizeBusinessNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function normalizeKey(value: string) {
  return value.replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
}

function unique(items: Array<string | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];
}

function businessNoCandidates(value: string) {
  const normalized = normalizeBusinessNo(value);
  const formattedTenDigit =
    normalized.length === 10 ? `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5)}` : "";

  return unique([value, normalized, formattedTenDigit]);
}

function directDocIds(normalized: string) {
  return unique([normalized, `nursery-${normalized}`, `nursery-auto-${normalized}`, `a1-nursery-${normalized}`]);
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

function baseCollections() {
  return [
    "nursery_auto_signup_profiles",
    "nurseries",
    "a1_nurseries",
    "a1_nursery_profiles",
    "nursery_partners",
    "signage_partners",
    "partners",
    "branches",
    "profiles",
    "businesses",
  ];
}

function isPossibleNurseryCollection(collectionId: string) {
  const name = collectionId.toLowerCase();
  return ["nursery", "partner", "branch", "profile", "business"].some((keyword) => name.includes(keyword));
}

async function collectionCandidates() {
  const db = getAdminDb();

  try {
    const discovered = await db.listCollections();
    return unique([...baseCollections(), ...discovered.map((collectionRef) => collectionRef.id)]).filter(isPossibleNurseryCollection);
  } catch {
    return baseCollections();
  }
}

async function getByKnownDocId(collectionPath: string, normalized: string) {
  const db = getAdminDb();

  for (const docId of directDocIds(normalized)) {
    const snapshot = await db.collection(collectionPath).doc(docId).get();
    if (snapshot.exists) return snapshot as QueryDocumentSnapshot;
  }

  return null;
}

async function queryByBusinessNo(collectionPath: string, businessRegistrationNo: string) {
  const db = getAdminDb();
  const candidates = businessNoCandidates(businessRegistrationNo);

  for (const field of unique(businessNoFields)) {
    const snapshot = await db.collection(collectionPath).where(field, "in", candidates).limit(1).get();
    if (!snapshot.empty) return snapshot.docs[0];
  }

  return null;
}

async function scanByBusinessNo(collectionPath: string, businessRegistrationNo: string) {
  const db = getAdminDb();
  const normalized = normalizeBusinessNo(businessRegistrationNo);
  const snapshot = await db.collection(collectionPath).limit(500).get();

  return (
    snapshot.docs.find((doc) => {
      const data = doc.data();
      if (normalizeBusinessNo(doc.id) === normalized) return true;
      return businessNoFields.some((field) => normalizeBusinessNo(fieldString(data, field)) === normalized);
    }) ?? null
  );
}

async function findNurseryByBusinessNo(businessRegistrationNo: string) {
  const normalized = normalizeBusinessNo(businessRegistrationNo);

  for (const collectionPath of await collectionCandidates()) {
    const direct = await getByKnownDocId(collectionPath, normalized);
    if (direct) return { doc: direct, collectionPath };

    const queried = await queryByBusinessNo(collectionPath, businessRegistrationNo);
    if (queried) return { doc: queried, collectionPath };

    const scanned = await scanByBusinessNo(collectionPath, businessRegistrationNo);
    if (scanned) return { doc: scanned, collectionPath };
  }

  return null;
}

function statusFor(data: Record<string, unknown>) {
  const raw = fieldString(data, "account_status", "accountStatus", "status", "approval_status", "approvalStatus").toLowerCase();
  return ["suspended", "blocked", "paused", "rejected", "inactive"].includes(raw) ? "suspended" : "approved";
}

function sourceFor(collectionPath: string, data: Record<string, unknown>) {
  const source = fieldString(data, "signup_source", "signupSource", "source_project_id", "sourceProjectId", "source");
  return source.toLowerCase().includes("signage") || source.toLowerCase().includes("a1") || source.toLowerCase().includes("a2")
    ? "signage_partner"
    : collectionPath === "nursery_auto_signup_profiles"
      ? "signage_partner"
      : "manual_profile";
}

function mapProfile(doc: QueryDocumentSnapshot, collectionPath: string, requestedBusinessNo: string) {
  const data = doc.data();
  const normalized = normalizeBusinessNo(requestedBusinessNo);
  const businessRegistrationNo = fieldString(data, ...businessNoFields) || requestedBusinessNo;
  const nurseryId = fieldString(data, ...nurseryIdFields) || (collectionPath === "nurseries" ? doc.id : `nursery-${normalized}`);
  const now = new Date().toISOString();

  return {
    id: fieldString(data, "id") || doc.id,
    nurseryId,
    businessRegistrationNo,
    businessRegistrationNoNormalized: normalizeBusinessNo(businessRegistrationNo) || normalized,
    nurseryName: fieldString(data, ...nurseryNameFields) || "산후조리원",
    representativeName: fieldString(data, ...representativeFields),
    managerName: fieldString(data, ...managerFields),
    managerPhone: fieldString(data, ...phoneFields),
    managerEmail: fieldString(data, ...emailFields),
    businessAddress: fieldString(data, ...addressFields),
    roomCount: fieldString(data, ...roomCountFields),
    defaultPassword,
    externalNurseryId: fieldString(data, ...externalNurseryIdFields) || doc.id,
    source: sourceFor(collectionPath, data),
    status: statusFor(data),
    createdAt: dateString(data.created_at ?? data.createdAt, now),
    updatedAt: dateString(data.updated_at ?? data.updatedAt, now),
    sourceCollection: collectionPath,
  };
}

export async function tabletNurseryLoginHandler(request: HttpRequestLike, response: HttpResponseLike) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (!requirePost(request, response)) return;

  const body = readObjectBody<TabletNurseryLoginRequest>(request);
  const businessRegistrationNo = optionalString(body.businessRegistrationNo);

  if (!businessRegistrationNo || !normalizeBusinessNo(businessRegistrationNo)) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "TABLET_NURSERY_LOGIN_BUSINESS_NO_MISSING", message: "businessRegistrationNo is required.", httpStatus: 400 },
    });
    return;
  }

  if (body.password !== defaultPassword) {
    sendJson(response, 401, {
      ok: false,
      error: { code: "TABLET_NURSERY_LOGIN_PASSWORD_INVALID", message: "Default nursery password does not match.", httpStatus: 401 },
    });
    return;
  }

  const matched = await findNurseryByBusinessNo(businessRegistrationNo);

  if (!matched) {
    sendJson(response, 404, {
      ok: false,
      error: {
        code: "TABLET_NURSERY_LOGIN_NOT_FOUND",
        message: "No A1/A5 nursery matched the business registration number.",
        httpStatus: 404,
      },
    });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    profile: mapProfile(matched.doc, matched.collectionPath, businessRegistrationNo),
  });
}
