import { FieldValue, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb, getAdminDbForProject } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type TabletNurseryLoginRequest = {
  businessRegistrationNo?: string;
  password?: string;
};

type TabletRoomOption = {
  roomId: string;
  roomNumber: string;
  roomName: string;
  floor: string;
  pickupEnabled: boolean;
  activeTabletId: string;
};

type ResponseWithHeaders = HttpResponseLike & {
  set?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
  header?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
};

const defaultPassword = "1004";
const sourceProjectId = process.env.A4_SOURCE_PROJECT_ID?.trim() || "signage-partner";

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
  "store_name",
  "storeName",
  "partner_name",
  "partnerName",
  "business_title",
  "businessTitle",
  "조리원명",
  "산후조리원명",
  "시설명",
  "상호",
  "상호명",
  "업체명",
];

const representativeFields = ["representative_name", "representativeName", "owner_name", "ownerName", "ceo_name", "ceoName"];
const managerFields = ["manager_name", "managerName", "contact_name", "contactName", "admin_name", "adminName"];
const phoneFields = ["manager_phone", "managerPhone", "phone", "tel", "contact_phone", "contactPhone", "mobile"];
const emailFields = ["manager_email", "managerEmail", "email", "contact_email", "contactEmail"];
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

async function collectionCandidates(db: Firestore) {
  try {
    const discovered = await db.listCollections();
    return unique([...baseCollections(), ...discovered.map((collectionRef) => collectionRef.id)]).filter(isPossibleNurseryCollection);
  } catch {
    return baseCollections();
  }
}

async function getByKnownDocId(db: Firestore, collectionPath: string, normalized: string) {
  for (const docId of directDocIds(normalized)) {
    const snapshot = await db.collection(collectionPath).doc(docId).get();
    if (snapshot.exists) return snapshot as QueryDocumentSnapshot;
  }

  return null;
}

async function queryByBusinessNo(db: Firestore, collectionPath: string, businessRegistrationNo: string) {
  const candidates = businessNoCandidates(businessRegistrationNo);

  for (const field of unique(businessNoFields)) {
    const snapshot = await db.collection(collectionPath).where(field, "in", candidates).limit(1).get();
    if (!snapshot.empty) return snapshot.docs[0];
  }

  return null;
}

async function scanByBusinessNo(db: Firestore, collectionPath: string, businessRegistrationNo: string) {
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

type NurseryMatch = {
  doc: QueryDocumentSnapshot;
  collectionPath: string;
  source: "a5" | "signage_partner";
};

async function collectNurseryMatches(db: Firestore, businessRegistrationNo: string, source: NurseryMatch["source"]) {
  const normalized = normalizeBusinessNo(businessRegistrationNo);
  const matches: NurseryMatch[] = [];
  const seen = new Set<string>();

  function pushMatch(doc: QueryDocumentSnapshot, collectionPath: string) {
    const key = `${source}:${doc.ref.path}`;
    if (seen.has(key)) return;
    seen.add(key);
    matches.push({ doc, collectionPath, source });
  }

  for (const collectionPath of await collectionCandidates(db)) {
    const direct = await getByKnownDocId(db, collectionPath, normalized);
    if (direct) pushMatch(direct, collectionPath);

    const queried = await queryByBusinessNo(db, collectionPath, businessRegistrationNo);
    if (queried) pushMatch(queried, collectionPath);

    const scanned = await scanByBusinessNo(db, collectionPath, businessRegistrationNo);
    if (scanned) pushMatch(scanned, collectionPath);
  }

  return matches;
}

async function collectSourceNurseryMatches(businessRegistrationNo: string) {
  try {
    const sourceDb = getAdminDbForProject("tablet-nursery-login-source", sourceProjectId);
    return await collectNurseryMatches(sourceDb, businessRegistrationNo, "signage_partner");
  } catch (error) {
    console.warn("tabletNurseryLogin source nursery lookup skipped", {
      sourceProjectId,
      error: error instanceof Error ? error.message : String(error ?? ""),
    });
    return [];
  }
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

type MappedNurseryProfile = ReturnType<typeof mapProfile>;

type ResolvedNurseryCandidate = {
  match: NurseryMatch;
  profile: MappedNurseryProfile;
  rooms: TabletRoomOption[];
};

function isGenericNurseryName(value: string) {
  const normalized = normalizeKey(value);
  return !normalized || ["산후조리원", "조리원", "a5nursery", "nursery"].includes(normalized);
}

function profileCompletenessScore(profile: MappedNurseryProfile, rooms: TabletRoomOption[] = []) {
  const collection = profile.sourceCollection.toLowerCase();
  const collectionScore =
    collection === "nurseries"
      ? 30
      : collection === "nursery_auto_signup_profiles"
        ? 25
        : collection.includes("mapping")
          ? 15
          : 5;

  return (
    rooms.length * 1000 +
    (profile.businessAddress ? 200 : 0) +
    (!isGenericNurseryName(profile.nurseryName) ? 120 : 0) +
    (profile.managerPhone ? 30 : 0) +
    (profile.managerEmail ? 20 : 0) +
    collectionScore
  );
}

function firstFilled(profiles: MappedNurseryProfile[], field: keyof MappedNurseryProfile) {
  return profiles.map((profile) => String(profile[field] ?? "").trim()).find(Boolean) ?? "";
}

function firstSpecificNurseryName(profiles: MappedNurseryProfile[]) {
  return profiles.map((profile) => profile.nurseryName).find((name) => !isGenericNurseryName(name)) ?? "";
}

function mergeProfileForTabletScope(base: MappedNurseryProfile, profiles: MappedNurseryProfile[]) {
  const enriched = [...profiles].sort((left, right) => profileCompletenessScore(right) - profileCompletenessScore(left));
  const specificName = firstSpecificNurseryName(enriched);

  return {
    ...base,
    nurseryName: isGenericNurseryName(base.nurseryName) ? specificName || base.nurseryName : base.nurseryName,
    businessAddress: base.businessAddress || firstFilled(enriched, "businessAddress"),
    representativeName: base.representativeName || firstFilled(enriched, "representativeName"),
    managerName: base.managerName || firstFilled(enriched, "managerName"),
    managerPhone: base.managerPhone || firstFilled(enriched, "managerPhone"),
    managerEmail: base.managerEmail || firstFilled(enriched, "managerEmail"),
    roomCount: base.roomCount || firstFilled(enriched, "roomCount"),
    externalNurseryId: base.externalNurseryId || firstFilled(enriched, "externalNurseryId"),
    source: enriched.some((profile) => profile.source === "signage_partner") ? "signage_partner" : base.source,
  };
}

function definedEntries(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== ""));
}

async function saveResolvedNurseryProfile(profile: MappedNurseryProfile) {
  const normalized = profile.businessRegistrationNoNormalized || normalizeBusinessNo(profile.businessRegistrationNo);
  if (!profile.nurseryId || !normalized) return;

  const db = getAdminDb();
  const now = FieldValue.serverTimestamp();
  const shared = definedEntries({
    business_registration_no: profile.businessRegistrationNo,
    business_registration_no_normalized: normalized,
    nursery_name: profile.nurseryName,
    representative_name: profile.representativeName,
    manager_name: profile.managerName,
    manager_phone: profile.managerPhone,
    manager_email: profile.managerEmail,
    business_address: profile.businessAddress,
    registered_address: profile.businessAddress,
    address: profile.businessAddress,
    room_count: profile.roomCount,
    external_nursery_id: profile.externalNurseryId,
    source_collection: profile.sourceCollection,
    source_project_id: profile.source === "signage_partner" ? sourceProjectId : "a5-closed-mall",
    resolved_by: "tabletNurseryLogin",
    updated_at: now,
  });

  await db.collection("nurseries").doc(profile.nurseryId).set(
    definedEntries({
      nursery_id: profile.nurseryId,
      name: profile.nurseryName,
      status: profile.status === "suspended" ? "suspended" : "active",
      approval_status: profile.status === "suspended" ? "suspended" : "approved",
      account_status: profile.status === "suspended" ? "suspended" : "active",
      ...shared,
    }),
    { merge: true },
  );

  await db.collection("nursery_auto_signup_profiles").doc(`nursery-auto-${normalized}`).set(
    definedEntries({
      title: `${profile.nurseryName || "산후조리원"} 자동 가입`,
      status: profile.status === "suspended" ? "suspended" : "approved",
      approval_status: profile.status === "suspended" ? "suspended" : "approved",
      account_status: profile.status === "suspended" ? "suspended" : "active",
      source_app: "nursery",
      nursery_id: profile.nurseryId,
      default_password_policy: defaultPassword,
      signup_source: profile.source,
      guest_write_enabled: true,
      ...shared,
    }),
    { merge: true },
  );
}

function roomSortKey(value: string) {
  const normalized = value.replace(/\s+/g, "");
  const numeric = normalized.match(/\d+/)?.[0] ?? "";
  return {
    numeric: numeric ? Number(numeric) : Number.MAX_SAFE_INTEGER,
    text: normalized,
  };
}

function compareRooms(a: TabletRoomOption, b: TabletRoomOption) {
  const left = roomSortKey(a.roomNumber || a.roomName || a.roomId);
  const right = roomSortKey(b.roomNumber || b.roomName || b.roomId);

  if (left.numeric !== right.numeric) return left.numeric - right.numeric;
  return left.text.localeCompare(right.text, "ko");
}

async function readTabletMapByNursery(nurseryId: string) {
  const db = getAdminDb();
  const snapshot = await db.collection("tablets").where("nursery_id", "==", nurseryId).get();
  const byRoomId = new Map<string, string>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const roomId = fieldString(data, "room_id", "roomId");
    const status = fieldString(data, "status").toLowerCase();
    const tabletId = fieldString(data, "tablet_id", "tabletId") || doc.id;

    if (roomId && status !== "inactive" && status !== "maintenance" && !byRoomId.has(roomId)) {
      byRoomId.set(roomId, tabletId);
    }
  });

  return byRoomId;
}

async function readRoomsByNursery(nurseryId: string): Promise<TabletRoomOption[]> {
  const db = getAdminDb();
  const [roomSnapshot, tabletByRoomId] = await Promise.all([
    db.collection("rooms").where("nursery_id", "==", nurseryId).get(),
    readTabletMapByNursery(nurseryId),
  ]);

  return roomSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      const roomId = fieldString(data, "room_id", "roomId") || doc.id;
      const roomNumber = fieldString(data, "room_number", "roomNumber", "name") || roomId;
      const activeTabletId =
        fieldString(data, "active_tablet_id", "activeTabletId") ||
        tabletByRoomId.get(roomId) ||
        "";

      return {
        roomId,
        roomNumber,
        roomName: fieldString(data, "name", "room_name", "roomName") || roomNumber,
        floor: fieldString(data, "floor"),
        pickupEnabled: fieldString(data, "pickup_enabled", "pickupEnabled") !== "false",
        activeTabletId,
      };
    })
    .sort(compareRooms);
}

async function resolveNurseryForTabletLogin(businessRegistrationNo: string) {
  const targetDb = getAdminDb();
  const [a5Matches, sourceMatches] = await Promise.all([
    collectNurseryMatches(targetDb, businessRegistrationNo, "a5"),
    collectSourceNurseryMatches(businessRegistrationNo),
  ]);
  const matches = [...a5Matches, ...sourceMatches];

  if (matches.length === 0) return null;

  const candidates: ResolvedNurseryCandidate[] = await Promise.all(
    matches.map(async (match) => {
      const profile = mapProfile(match.doc, match.source === "signage_partner" ? `${sourceProjectId}:${match.collectionPath}` : match.collectionPath, businessRegistrationNo);
      if (match.source === "signage_partner") {
        profile.source = "signage_partner";
      }

      const rooms = match.source === "a5" ? await readRoomsByNursery(profile.nurseryId) : [];
      return { match, profile, rooms };
    }),
  );

  const base =
    candidates
      .filter((candidate) => candidate.match.source === "a5")
      .sort((left, right) => profileCompletenessScore(right.profile, right.rooms) - profileCompletenessScore(left.profile, left.rooms))[0] ??
    candidates.sort((left, right) => profileCompletenessScore(right.profile, right.rooms) - profileCompletenessScore(left.profile, left.rooms))[0];

  const profile = mergeProfileForTabletScope(base.profile, candidates.map((candidate) => candidate.profile));

  try {
    await saveResolvedNurseryProfile(profile);
  } catch (error) {
    console.warn("tabletNurseryLogin resolved profile upsert skipped", {
      nurseryId: profile.nurseryId,
      businessRegistrationNo: profile.businessRegistrationNo,
      error: error instanceof Error ? error.message : String(error ?? ""),
    });
  }

  return {
    profile,
    rooms: base.rooms,
    diagnostics: {
      a5MatchCount: a5Matches.length,
      sourceMatchCount: sourceMatches.length,
      addressResolved: Boolean(profile.businessAddress),
      scopeCollection: base.profile.sourceCollection,
    },
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

  const resolved = await resolveNurseryForTabletLogin(businessRegistrationNo);

  if (!resolved) {
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
    profile: resolved.profile,
    rooms: resolved.rooms,
    diagnostics: resolved.diagnostics,
  });
}
