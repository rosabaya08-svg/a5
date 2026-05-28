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
  ]);
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

  for (const collectionPath of sourceNurseryCollections()) {
    const snapshot = await sourceDb.collection(collectionPath).limit(limit).get();

    for (const doc of snapshot.docs) {
      const profile = mapSourceProfile(doc, doc.ref.path);

      if (!profile) {
        skipped.push({ sourcePath: doc.ref.path, reason: "business_registration_no missing" });
        continue;
      }

      if (seen.has(profile.businessRegistrationNoNormalized)) {
        skipped.push({ sourcePath: doc.ref.path, reason: "duplicate business registration number" });
        continue;
      }

      seen.add(profile.businessRegistrationNoNormalized);
      profiles.push(profile);

      if (profiles.length >= limit) return { profiles, skipped };
    }
  }

  return { profiles, skipped };
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

  const limit = Math.min(Math.max(Number(body.limit ?? defaultLimit) || defaultLimit, 1), 1000);
  const sourceDb = getAdminDbForProject("a4-nursery-bulk-signup-source", sourceProjectId);
  const targetDb = getAdminDb();
  const { profiles, skipped } = await readSourceProfiles(sourceDb, limit);

  for (const profile of profiles) {
    await saveProfile(targetDb, profile);
  }

  sendJson(response, 200, {
    ok: true,
    source: body.source ?? "a2_signage_partner",
    sourceProjectId,
    importedCount: profiles.length,
    skippedCount: skipped.length,
    profiles,
    skipped,
    message: "A2/signage-partner nursery profiles were bulk-synced into A5.",
  });
}
