import { FieldValue, type DocumentReference, type Firestore, type Query, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb, getAdminDbForProject } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type A4RoomsSyncRequest = {
  nurseryId?: string;
  businessRegistrationNo?: string;
  externalNurseryId?: string;
  selectedExternalRoomIds?: string[];
};

type SourceNurseryMatch = {
  externalNurseryId: string;
  businessRegistrationNo: string;
  sourceNurseryPath: string;
  matchedBusinessField?: string;
};

type SourceRoom = {
  externalRoomId: string;
  targetRoomId: string;
  roomNumber: string;
  name: string;
  floor: string;
  pickupEnabled: boolean;
  allowDuplicateRoomNumber: boolean;
  sourceStatus?: string;
  sourceGrade?: string;
  currentCustomer?: string;
  activeTabletId?: string;
  externalTabletId?: string;
};

type SourceRoomRead = {
  sourcePath: string;
  sourceNurseryField?: string;
  sourceBusinessField?: string;
  docs: QueryDocumentSnapshot[];
};

type SkippedRoom = {
  externalRoomId: string;
  roomNumber?: string;
  reason: string;
  existingRoomId?: string;
};

type ResponseWithHeaders = HttpResponseLike & {
  set?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
  header?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
};

const sourceProjectId = process.env.A4_SOURCE_PROJECT_ID?.trim() || "signage-partner";

const businessNoFields = [
  process.env.A4_NURSERY_BUSINESS_FIELD,
  process.env.A4_ROOMS_BUSINESS_FIELD,
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

const nurseryIdFields = [
  process.env.A4_NURSERY_ID_FIELD,
  process.env.A4_ROOMS_NURSERY_FIELD,
  "external_nursery_id",
  "externalNurseryId",
  "owner_uid",
  "ownerUid",
  "uid",
  "user_id",
  "userId",
  "nursery_id",
  "nurseryId",
  "center_id",
  "centerId",
  "branch_id",
  "branchId",
  "partner_id",
  "partnerId",
  "hospital_id",
  "hospitalId",
  "center_uid",
  "centerUid",
  "branch_uid",
  "branchUid",
  "store_id",
  "storeId",
  "shop_id",
  "shopId",
  "customer_id",
  "customerId",
  "company_id",
  "companyId",
  "owner_id",
  "ownerId",
];

const externalRoomIdFields = ["external_room_id", "externalRoomId", "room_id", "roomId", "room_uid", "roomUid"];
const roomNumberFields = [
  "device_name",
  "deviceName",
  "device_label",
  "deviceLabel",
  "room_number",
  "roomNumber",
  "room_no",
  "roomNo",
  "room_num",
  "roomNum",
  "room",
  "room_label",
  "roomLabel",
  "unit",
  "unit_no",
  "unitNo",
  "bed_no",
  "bedNo",
  "객실번호",
  "객실명",
  "객실",
  "호실",
];
const roomNameFields = ["room_name", "roomName", "room_title", "roomTitle", "label", "title"];
const externalTabletIdFields = ["external_tablet_id", "externalTabletId", "tablet_id", "tabletId", "device_id", "deviceId", "device_uid", "deviceUid"];
const activeTabletIdFields = ["a5_tablet_id", "active_tablet_id", "activeTabletId"];

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

function fieldString(data: Record<string, unknown>, ...names: string[]) {
  for (const name of names) {
    const value = optionalString(data[name]);
    if (value) return value;
  }

  return deepFieldString(data, names);
}

function fieldBoolean(data: Record<string, unknown>, fallback: boolean) {
  const value = data.pickup_enabled ?? data.pickupEnabled ?? data.is_pickup_enabled ?? data.pickupAvailable;
  return typeof value === "boolean" ? value : fallback;
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

function normalizeRoomNumber(value: string) {
  return value.replace(/[^0-9A-Za-z]/g, "").toLowerCase();
}

function displayRoomNumber(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/\d/.test(text) && text.endsWith("호")) return text;

  return text.match(/\d+/g)?.join("") ?? "";
}

function looksLikeRoomDocumentId(value: string) {
  const normalized = normalizeRoomNumber(value);
  return normalized.length > 0 && normalized.length <= 8 && /\d/.test(normalized);
}

function isGenericDeviceLabel(value: string) {
  const normalized = value.replace(/[\s_-]+/g, "").toLowerCase();
  return [
    "새로운기기",
    "newdevice",
    "newtablet",
    "device",
    "tablet",
    "smartdevice",
    "smarttablet",
  ].includes(normalized);
}

function isDeviceCollection(doc: QueryDocumentSnapshot) {
  return doc.ref.parent.id.toLowerCase().includes("device");
}

function sourceStatusString(data: Record<string, unknown>) {
  return fieldString(data, "status", "device_status", "deviceStatus");
}

function sourceGradeString(data: Record<string, unknown>) {
  return fieldString(data, "grade", "grade_name", "gradeName", "room_grade", "roomGrade");
}

function safeDocumentId(value: string, fallback: string) {
  const normalized = value
    .trim()
    .replace(/[\\/#[\]?]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function getHeader(request: HttpRequestLike, name: string) {
  return request.get?.(name) ?? request.get?.(name.toLowerCase()) ?? "";
}

function setCorsHeaders(response: HttpResponseLike) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-A5-Client, X-A5-Beta-Room-Sync",
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

async function authorizeRoomSync(request: HttpRequestLike, nurseryId: string) {
  const authorization = getHeader(request, "authorization");
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  let tokenFailureReason = "";

  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      const role = String(decoded.role ?? "");
      const tokenNurseryId = String(decoded.nursery_id ?? decoded.nurseryId ?? "");
      const seedAdmin = decoded.seed_admin === true;

      if (role === "SUPER_ADMIN" || role === "seed_admin" || seedAdmin) {
        return { ok: true as const, actor: role || "seed_admin" };
      }

      if (role === "NURSERY_ADMIN" && tokenNurseryId === nurseryId) {
        return { ok: true as const, actor: role };
      }
    } catch {
      tokenFailureReason = "Firebase ID token verification failed.";
    }
  }

  const betaEnabled = process.env.A5_ALLOW_BETA_ROOM_SYNC === "true";
  const betaHeader = getHeader(request, "x-a5-beta-room-sync");

  if (betaEnabled && betaHeader === "enabled") {
    return { ok: true as const, actor: "beta_nursery_admin" };
  }

  return {
    ok: false as const,
    reason: tokenFailureReason || "Room sync requires SUPER_ADMIN/NURSERY_ADMIN Firebase claims or A5_ALLOW_BETA_ROOM_SYNC=true.",
  };
}

async function readA5NurseryProfile(targetDb: Firestore, nurseryId: string) {
  const snapshot = await targetDb.collection("nurseries").doc(nurseryId).get();
  const data = snapshot.exists ? snapshot.data() ?? {} : {};
  const businessRegistrationNo = fieldString(
    data,
    "business_registration_no",
    "businessRegistrationNo",
    "business_no",
    "businessNo",
  );
  const externalNurseryId = fieldString(
    data,
    "a4_external_nursery_id",
    "external_nursery_id",
    "externalNurseryId",
    "a4NurseryId",
  );

  return { businessRegistrationNo, externalNurseryId };
}

function sourceQuery(sourceDb: Firestore, collectionPath: string, collectionGroupName?: string): Query {
  return collectionGroupName ? sourceDb.collectionGroup(collectionGroupName) : sourceDb.collection(collectionPath);
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

function sourceRoomCollections() {
  return splitConfigList(process.env.A4_ROOMS_COLLECTION_PATHS ?? process.env.A4_ROOMS_COLLECTION_PATH, [
    "devices",
    "rooms",
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

function isRoomCollection(collectionPath: string) {
  const name = collectionPath.toLowerCase();
  return (
    name.includes("device") ||
    name.includes("room") ||
    name.includes("객실") ||
    false
  );
}

async function discoverSourceRoomCollections(sourceDb: Firestore) {
  const configured = sourceRoomCollections();
  const maxCollections = Math.min(Math.max(Number(process.env.A4_SOURCE_COLLECTION_DISCOVERY_LIMIT ?? 60) || 60, 1), 120);

  try {
    const discovered = await sourceDb.listCollections();
    return unique([...configured, ...discovered.map((collection) => collection.id)])
      .filter(isRoomCollection)
      .slice(0, maxCollections);
  } catch {
    return configured.filter(isRoomCollection);
  }
}

function mapSourceNursery(doc: QueryDocumentSnapshot, matchedBusinessField: string, businessRegistrationNo: string) {
  const data = doc.data();
  const idFields = unique(nurseryIdFields);
  const externalNurseryId = fieldString(data, ...idFields) || doc.id;
  const sourceBusinessNo =
    fieldString(data, ...unique(businessNoFields)) || businessNoCandidates(businessRegistrationNo)[0] || businessRegistrationNo;

  return {
    externalNurseryId,
    businessRegistrationNo: sourceBusinessNo,
    sourceNurseryPath: doc.ref.path,
    matchedBusinessField,
  } satisfies SourceNurseryMatch;
}

async function findSourceNurseryByBusinessNo(
  sourceDb: Firestore,
  businessRegistrationNo: string,
): Promise<SourceNurseryMatch | null> {
  const fields = unique(businessNoFields);
  const candidates = businessNoCandidates(businessRegistrationNo);
  const collectionGroupName = process.env.A4_NURSERIES_COLLECTION_GROUP?.trim();
  const collectionPaths = collectionGroupName ? [""] : await discoverSourceNurseryCollections(sourceDb);

  for (const collectionPath of collectionPaths) {
    for (const field of fields) {
      for (const candidate of candidates) {
        const snapshot = await sourceQuery(sourceDb, collectionPath, collectionGroupName).where(field, "==", candidate).limit(1).get();

        if (!snapshot.empty) {
          return mapSourceNursery(snapshot.docs[0], field, businessRegistrationNo);
        }
      }
    }
  }

  const scanLimit = Number(process.env.A4_NURSERIES_SCAN_LIMIT ?? 300);
  for (const collectionPath of collectionPaths) {
    const snapshot = await sourceQuery(sourceDb, collectionPath, collectionGroupName).limit(scanLimit).get();
    const matchedDoc = snapshot.docs.find((doc) => {
      const data = doc.data();
      return fields.some((field) => normalizeBusinessRegistrationNo(fieldString(data, field)) === normalizeBusinessRegistrationNo(businessRegistrationNo));
    });

    if (matchedDoc) {
      const matchedField = fields.find(
        (field) => normalizeBusinessRegistrationNo(fieldString(matchedDoc.data(), field)) === normalizeBusinessRegistrationNo(businessRegistrationNo),
      );
      return mapSourceNursery(matchedDoc, matchedField ?? "scan", businessRegistrationNo);
    }
  }

  return null;
}

function mapSourceRoom(doc: QueryDocumentSnapshot): SourceRoom | null {
  const data = doc.data();
  const isDevice = isDeviceCollection(doc);
  const externalRoomId = fieldString(data, ...externalRoomIdFields) || doc.id;
  const explicitRoomNumber = fieldString(data, ...roomNumberFields);
  const explicitRoomName = fieldString(data, ...roomNameFields);
  const roomNumber = displayRoomNumber(explicitRoomNumber || explicitRoomName || (looksLikeRoomDocumentId(doc.id) ? doc.id : ""));

  if (!externalRoomId || !roomNumber) {
    return null;
  }

  if (!isDevice && !explicitRoomNumber && isGenericDeviceLabel(roomNumber)) {
    return null;
  }

  const fallbackTargetId = isDevice
    ? `room-${safeDocumentId(externalRoomId, doc.id)}`
    : `room-${normalizeRoomNumber(roomNumber) || safeDocumentId(externalRoomId, doc.id)}`;
  const targetRoomId = safeDocumentId(fieldString(data, "a5_room_id", "target_room_id", "targetRoomId"), fallbackTargetId);
  const name = displayRoomNumber(explicitRoomName) || roomNumber;
  const externalTabletId = fieldString(data, ...externalTabletIdFields) || (isDevice ? doc.id : "");
  const activeTabletId = fieldString(data, ...activeTabletIdFields);

  return {
    externalRoomId,
    targetRoomId,
    roomNumber,
    name,
    floor: "",
    pickupEnabled: fieldBoolean(data, true),
    allowDuplicateRoomNumber: isDevice,
    sourceStatus: sourceStatusString(data) || undefined,
    sourceGrade: sourceGradeString(data) || undefined,
    currentCustomer: fieldString(data, "customer", "customer_name", "customerName") || undefined,
    activeTabletId: activeTabletId || undefined,
    externalTabletId: externalTabletId || undefined,
  };
}

function fallbackTabletIdForRoom(room: SourceRoom) {
  const roomSuffix = room.targetRoomId.replace(/^room-/, "");
  if (room.externalTabletId) {
    return safeDocumentId(`a4-device-${room.externalTabletId}`, `a4-device-${roomSuffix}`);
  }
  return safeDocumentId(room.externalTabletId || `tablet-${roomSuffix}-a`, `tablet-${normalizeRoomNumber(room.roomNumber) || roomSuffix}-a`);
}

function hasUsableRoomDocs(docs: QueryDocumentSnapshot[]) {
  return docs.some((doc) => Boolean(mapSourceRoom(doc)));
}

async function queryRoomsByField(
  sourceDb: Firestore,
  collectionPath: string,
  collectionGroupName: string | undefined,
  field: string,
  candidates: string[],
): Promise<QueryDocumentSnapshot[]> {
  for (const candidate of candidates) {
    const snapshot = await sourceQuery(sourceDb, collectionPath, collectionGroupName).where(field, "==", candidate).get();

    if (!snapshot.empty) {
      return snapshot.docs;
    }
  }

  return [];
}

async function scanRoomsByBusinessNo(
  sourceDb: Firestore,
  collectionPath: string,
  collectionGroupName: string | undefined,
  businessRegistrationNo: string,
) {
  const fields = unique(businessNoFields);
  const scanLimit = Number(process.env.A4_ROOMS_SCAN_LIMIT ?? 500);
  const snapshot = await sourceQuery(sourceDb, collectionPath, collectionGroupName).limit(scanLimit).get();
  const normalized = normalizeBusinessRegistrationNo(businessRegistrationNo);

  return snapshot.docs.filter((doc) => {
    const data = doc.data();
    return fields.some((field) => normalizeBusinessRegistrationNo(fieldString(data, field)) === normalized);
  });
}

async function readSourceRooms(
  sourceDb: Firestore,
  options: { externalNurseryId?: string; businessRegistrationNo: string },
): Promise<SourceRoomRead> {
  const collectionGroupName = process.env.A4_ROOMS_COLLECTION_GROUP?.trim();
  const collectionPaths = collectionGroupName ? [""] : await discoverSourceRoomCollections(sourceDb);
  const nurseryFields = unique(nurseryIdFields);
  const businessFields = unique(businessNoFields);

  for (const collectionPath of collectionPaths) {
    if (options.externalNurseryId) {
      const resolvedPath = collectionPath.replace(/\{externalNurseryId\}/g, options.externalNurseryId);

      if (resolvedPath !== collectionPath) {
        const snapshot = await sourceDb.collection(resolvedPath).get();

        if (!snapshot.empty && hasUsableRoomDocs(snapshot.docs)) {
          return { sourcePath: resolvedPath, docs: snapshot.docs };
        }
      }

      for (const field of nurseryFields) {
        const docs = await queryRoomsByField(sourceDb, collectionPath, collectionGroupName, field, [options.externalNurseryId]);

        if (docs.length > 0 && hasUsableRoomDocs(docs)) {
          return {
            sourcePath: collectionGroupName ? `collectionGroup:${collectionGroupName}` : collectionPath,
            sourceNurseryField: field,
            docs,
          };
        }
      }
    }

    for (const field of businessFields) {
      const docs = await queryRoomsByField(sourceDb, collectionPath, collectionGroupName, field, businessNoCandidates(options.businessRegistrationNo));

      if (docs.length > 0 && hasUsableRoomDocs(docs)) {
        return {
          sourcePath: collectionGroupName ? `collectionGroup:${collectionGroupName}` : collectionPath,
          sourceBusinessField: field,
          docs,
        };
      }
    }

    const scannedDocs = await scanRoomsByBusinessNo(sourceDb, collectionPath, collectionGroupName, options.businessRegistrationNo);
    if (scannedDocs.length > 0 && hasUsableRoomDocs(scannedDocs)) {
      return {
        sourcePath: collectionGroupName ? `collectionGroup:${collectionGroupName}` : collectionPath,
        sourceBusinessField: "scan",
        docs: scannedDocs,
      };
    }
  }

  return { sourcePath: collectionGroupName ? `collectionGroup:${collectionGroupName}` : sourceRoomCollections()[0], docs: [] };
}

function inferExternalNurseryIdFromRooms(docs: QueryDocumentSnapshot[]) {
  const fields = unique(nurseryIdFields);

  for (const doc of docs) {
    const value = fieldString(doc.data(), ...fields);
    if (value) return value;
  }

  return "";
}

async function readExistingA5Rooms(targetDb: Firestore, nurseryId: string) {
  const snapshot = await targetDb.collection("rooms").where("nursery_id", "==", nurseryId).get();
  const byId = new Set<string>();
  const byNumber = new Map<string, string>();
  const byExternalRoomId = new Map<string, string>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    byId.add(doc.id);

    const numberKey = normalizeRoomNumber(fieldString(data, "room_number", "roomNumber", "name") || doc.id);
    if (numberKey) byNumber.set(numberKey, doc.id);

    const externalRoomId = fieldString(data, "external_room_id", "externalRoomId");
    if (externalRoomId) byExternalRoomId.set(externalRoomId, doc.id);
  });

  return { byId, byNumber, byExternalRoomId };
}

async function commitDeleteRefs(targetDb: Firestore, refs: DocumentReference[]) {
  const uniqueRefs = [...new Map(refs.map((ref) => [ref.path, ref])).values()];

  for (let index = 0; index < uniqueRefs.length; index += 450) {
    const batch = targetDb.batch();
    uniqueRefs.slice(index, index + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function resetImportedRoomsForSource(
  targetDb: Firestore,
  nurseryId: string,
  businessRegistrationNo: string,
  selectedExternalRoomIds?: Set<string>,
) {
  const normalizedBusinessNo = normalizeBusinessRegistrationNo(businessRegistrationNo);
  const roomSnapshot = await targetDb.collection("rooms").where("nursery_id", "==", nurseryId).get();
  const refs: DocumentReference[] = [];
  const tabletIds = new Set<string>();
  let roomDeleteCount = 0;

  roomSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const importSource = fieldString(data, "import_source", "importSource");
    const roomBusinessNo = fieldString(data, "business_registration_no", "businessRegistrationNo");
    const externalRoomId = fieldString(data, "external_room_id", "externalRoomId");
    const sameBusiness = !roomBusinessNo || normalizeBusinessRegistrationNo(roomBusinessNo) === normalizedBusinessNo;
    const selectedMatch = !selectedExternalRoomIds?.size || selectedExternalRoomIds.has(externalRoomId);

    if (importSource === "SIGNAGE_PARTNER_BUSINESS_NO" && sameBusiness && selectedMatch) {
      const activeTabletId = fieldString(data, "active_tablet_id", "activeTabletId");
      refs.push(doc.ref);
      roomDeleteCount += 1;

      if (activeTabletId) {
        tabletIds.add(activeTabletId);
      }
    }
  });

  const tabletSnapshot = await targetDb.collection("tablets").where("nursery_id", "==", nurseryId).get();
  let tabletDeleteCount = 0;

  tabletSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const importSource = fieldString(data, "import_source", "importSource");
    const tabletBusinessNo = fieldString(data, "business_registration_no", "businessRegistrationNo");
    const externalRoomId = fieldString(data, "external_room_id", "externalRoomId");
    const sameBusiness = !tabletBusinessNo || normalizeBusinessRegistrationNo(tabletBusinessNo) === normalizedBusinessNo;
    const selectedMatch = !selectedExternalRoomIds?.size || selectedExternalRoomIds.has(externalRoomId);

    if (tabletIds.has(doc.id) || (importSource === "SIGNAGE_PARTNER_BUSINESS_NO" && sameBusiness && selectedMatch)) {
      refs.push(doc.ref);
      tabletDeleteCount += 1;
    }
  });

  await commitDeleteRefs(targetDb, refs);

  return { roomDeleteCount, tabletDeleteCount };
}

export async function a4RoomsSyncHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (!requirePost(request, response)) return;

  const body = readObjectBody<A4RoomsSyncRequest>(request);
  const nurseryId = optionalString(body.nurseryId);

  if (!nurseryId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "A4_ROOM_SYNC_INPUT_INVALID",
        message: "nurseryId is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const authorization = await authorizeRoomSync(request, nurseryId);
  if (!authorization.ok) {
    sendJson(response, 403, {
      ok: false,
      error: {
        code: "A4_ROOM_SYNC_PERMISSION_DENIED",
        message: authorization.reason,
        httpStatus: 403,
      },
    });
    return;
  }

  const targetDb = getAdminDb();
  const a5NurseryProfile = await readA5NurseryProfile(targetDb, nurseryId);
  const businessRegistrationNo = optionalString(body.businessRegistrationNo) ?? a5NurseryProfile.businessRegistrationNo;

  if (!normalizeBusinessRegistrationNo(businessRegistrationNo ?? "")) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "A4_ROOM_SYNC_BUSINESS_NO_MISSING",
        message: "businessRegistrationNo is required or must exist on the A5 nursery document.",
        httpStatus: 400,
      },
    });
    return;
  }

  const sourceDb = getAdminDbForProject("a4-readonly-source", sourceProjectId);
  let sourceNursery: SourceNurseryMatch | null = null;
  let sourceRead: SourceRoomRead;

  try {
    sourceNursery = await findSourceNurseryByBusinessNo(sourceDb, businessRegistrationNo);
    sourceRead = await readSourceRooms(sourceDb, {
      externalNurseryId: sourceNursery?.externalNurseryId ?? optionalString(body.externalNurseryId) ?? a5NurseryProfile.externalNurseryId,
      businessRegistrationNo,
    });
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      error: {
        code: "A4_ROOM_SYNC_SOURCE_READ_FAILED",
        message: error instanceof Error ? error.message : "Unknown signage-partner source read error.",
        httpStatus: 503,
      },
    });
    return;
  }

  if (!sourceNursery && sourceRead.docs.length === 0) {
    sendJson(response, 404, {
      ok: false,
      error: {
        code: "A4_ROOM_SYNC_BUSINESS_NO_NOT_FOUND",
        message: "No signage-partner nursery or room matched the A5 nursery business registration number.",
        httpStatus: 404,
      },
    });
    return;
  }

  const selectedIds = new Set((body.selectedExternalRoomIds ?? []).map((id) => String(id).trim()).filter(Boolean));
  const sourceRooms = sourceRead.docs
    .map((doc) => mapSourceRoom(doc))
    .filter((room): room is SourceRoom => Boolean(room))
    .filter((room) => selectedIds.size === 0 || selectedIds.has(room.externalRoomId));
  const missingSelected = [...selectedIds].filter((id) => !sourceRooms.some((room) => room.externalRoomId === id));
  const resetImported = await resetImportedRoomsForSource(
    targetDb,
    nurseryId,
    businessRegistrationNo,
    selectedIds.size > 0 ? selectedIds : undefined,
  );
  const cleanedMalformedCount = 0;
  const existing = await readExistingA5Rooms(targetDb, nurseryId);
  const imported: SourceRoom[] = [];
  const skipped: SkippedRoom[] = missingSelected.map((externalRoomId) => ({
    externalRoomId,
    reason: "Selected signage-partner room was not found in the source project.",
  }));
  const batch = targetDb.batch();
  const now = FieldValue.serverTimestamp();
  const externalNurseryId =
    sourceNursery?.externalNurseryId ||
    inferExternalNurseryIdFromRooms(sourceRead.docs) ||
    optionalString(body.externalNurseryId) ||
    a5NurseryProfile.externalNurseryId ||
    `business-${normalizeBusinessRegistrationNo(businessRegistrationNo)}`;

  for (const room of sourceRooms) {
    const numberKey = normalizeRoomNumber(room.roomNumber);
    const externalMatch = existing.byExternalRoomId.get(room.externalRoomId);
    const numberMatch = room.allowDuplicateRoomNumber ? undefined : existing.byNumber.get(numberKey);
    const idMatch = existing.byId.has(room.targetRoomId);

    if (externalMatch) {
      skipped.push({
        externalRoomId: room.externalRoomId,
        roomNumber: room.roomNumber,
        reason: "Already imported into A5 by external_room_id.",
        existingRoomId: externalMatch,
      });
      continue;
    }

    if (numberMatch) {
      skipped.push({
        externalRoomId: room.externalRoomId,
        roomNumber: room.roomNumber,
        reason: "A5 already has a room with the same room number.",
        existingRoomId: numberMatch,
      });
      continue;
    }

    if (idMatch) {
      skipped.push({
        externalRoomId: room.externalRoomId,
        roomNumber: room.roomNumber,
        reason: "A5 already has a room document with the target id.",
        existingRoomId: room.targetRoomId,
      });
      continue;
    }

    const activeTabletId = room.activeTabletId || fallbackTabletIdForRoom(room);
    const roomWithTablet: SourceRoom = { ...room, activeTabletId };
    const docRef = targetDb.collection("rooms").doc(room.targetRoomId);
    batch.set(docRef, {
      room_id: room.targetRoomId,
      nursery_id: nurseryId,
      name: room.name,
      room_number: room.roomNumber,
      floor: room.floor,
      pickup_enabled: room.pickupEnabled,
      active_tablet_id: activeTabletId,
      external_project_id: sourceProjectId,
      external_nursery_id: externalNurseryId,
      external_room_id: room.externalRoomId,
      external_tablet_id: room.externalTabletId ?? null,
      external_device_status: room.sourceStatus ?? null,
      external_room_grade: room.sourceGrade ?? null,
      external_current_customer: room.currentCustomer ?? null,
      business_registration_no: businessRegistrationNo,
      import_source: "SIGNAGE_PARTNER_BUSINESS_NO",
      local_editable: true,
      status: "active",
      created_at: now,
      imported_at: now,
      updated_at: now,
    });

    batch.set(
      targetDb.collection("tablets").doc(activeTabletId),
      {
        tablet_id: activeTabletId,
        nursery_id: nurseryId,
        room_id: room.targetRoomId,
        label: `${room.name} 태블릿`,
        status: "active",
        last_seen_at: now,
        external_project_id: sourceProjectId,
        external_nursery_id: externalNurseryId,
        external_room_id: room.externalRoomId,
        external_tablet_id: room.externalTabletId ?? null,
        external_device_status: room.sourceStatus ?? null,
        business_registration_no: businessRegistrationNo,
        import_source: "SIGNAGE_PARTNER_BUSINESS_NO",
        created_at: now,
        imported_at: now,
        updated_at: now,
      },
      { merge: true },
    );

    imported.push(roomWithTablet);
    existing.byId.add(room.targetRoomId);
    existing.byNumber.set(numberKey, room.targetRoomId);
    existing.byExternalRoomId.set(room.externalRoomId, room.targetRoomId);
  }

  if (imported.length > 0) {
    await batch.commit();
  }

  sendJson(response, 200, {
    ok: true,
    mode: "firestore",
    sourceProjectId,
    sourcePath: sourceRead.sourcePath,
    sourceNurseryPath: sourceNursery?.sourceNurseryPath,
    sourceNurseryField: sourceRead.sourceNurseryField,
    sourceBusinessField: sourceRead.sourceBusinessField ?? sourceNursery?.matchedBusinessField,
    sourceReadCount: sourceRead.docs.length,
    importedCount: imported.length,
    importedTabletCount: imported.filter((room) => room.activeTabletId).length,
    cleanedMalformedCount,
    resetImportedRoomCount: resetImported.roomDeleteCount,
    resetImportedTabletCount: resetImported.tabletDeleteCount,
    skippedCount: skipped.length,
    nurseryId,
    externalNurseryId,
    businessRegistrationNo,
    imported,
    skipped,
    actor: authorization.actor,
    message: "signage-partner rooms were matched by business registration number and imported into A5 rooms.",
  });
}
