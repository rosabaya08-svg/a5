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
  "business_no",
  "businessNo",
  "biz_no",
  "bizNo",
  "company_registration_no",
  "registration_number",
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
  "name",
  "title",
];

const representativeFields = ["representative_name", "representativeName", "owner_name", "ownerName", "ceo_name", "ceoName"];
const managerFields = ["manager_name", "managerName", "contact_name", "contactName", "admin_name", "adminName"];
const phoneFields = ["manager_phone", "managerPhone", "phone", "tel", "contact_phone", "contactPhone"];
const emailFields = ["manager_email", "managerEmail", "email", "contact_email", "contactEmail"];
const addressFields = ["business_address", "businessAddress", "registered_address", "registeredAddress", "address"];
const roomCountFields = ["room_count", "roomCount", "rooms_count", "roomsCount"];
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

function fieldString(data: Record<string, unknown>, ...names: Array<string | undefined>) {
  for (const name of names) {
    if (!name) continue;
    const value = optionalString(data[name]);
    if (value) return value;
  }

  return "";
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
  ]);
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
  for (const collectionPath of sourceNurseryCollections()) {
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
