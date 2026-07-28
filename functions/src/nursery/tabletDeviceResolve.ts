import { type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb, getAdminDbForProject } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type TabletDeviceResolveRequest = {
  deviceId?: string;
};

type ResponseWithHeaders = HttpResponseLike & {
  set?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
  header?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
};

const sourceProjectId = process.env.A4_SOURCE_PROJECT_ID?.trim() || "signage-partner";
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
];

const tabletExternalIdFields = [
  "external_tablet_id",
  "externalTabletId",
  "device_id",
  "deviceId",
  "device_uid",
  "deviceUid",
  "tablet_id",
  "tabletId",
];

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

function normalizeBusinessNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function fieldString(data: Record<string, unknown> | undefined, ...names: string[]) {
  if (!data) return "";

  for (const name of names) {
    const value = optionalString(data[name]);
    if (value) return value;
  }

  return "";
}

function cleanDeviceId(value: unknown) {
  const text = optionalString(value);
  return /^[A-Za-z0-9_-]{4,128}$/.test(text) ? text : "";
}

function deviceTabletDocId(deviceId: string) {
  return `a4-device-${deviceId}`;
}

async function readSourceUserBusinessNo(sourceDb: Firestore, ownerUid: string) {
  if (!ownerUid) return "";

  const userSnapshot = await sourceDb.collection("users").doc(ownerUid).get();
  if (!userSnapshot.exists) return "";

  return fieldString(userSnapshot.data(), ...businessNoFields);
}

async function findTargetTablet(targetDb: Firestore, deviceId: string) {
  const directIds = [deviceTabletDocId(deviceId), deviceId];

  for (const docId of directIds) {
    const direct = await targetDb.collection("tablets").doc(docId).get();
    if (direct.exists) return direct as QueryDocumentSnapshot;
  }

  for (const field of tabletExternalIdFields) {
    const snapshot = await targetDb.collection("tablets").where(field, "==", deviceId).limit(1).get();
    if (!snapshot.empty) return snapshot.docs[0];
  }

  const mappedTabletId = deviceTabletDocId(deviceId);
  const mappedSnapshot = await targetDb.collection("tablets").where("tablet_id", "==", mappedTabletId).limit(1).get();
  return mappedSnapshot.empty ? null : mappedSnapshot.docs[0];
}

async function findTargetRoom(targetDb: Firestore, tabletDoc: QueryDocumentSnapshot) {
  const tablet = tabletDoc.data();
  const tabletId = fieldString(tablet, "tablet_id", "tabletId") || tabletDoc.id;
  const roomId = fieldString(tablet, "room_id", "roomId");

  if (roomId) {
    const roomSnapshot = await targetDb.collection("rooms").doc(roomId).get();
    if (roomSnapshot.exists) return roomSnapshot as QueryDocumentSnapshot;
  }

  const roomByTablet = await targetDb.collection("rooms").where("active_tablet_id", "==", tabletId).limit(1).get();
  if (!roomByTablet.empty) return roomByTablet.docs[0];

  const roomByDocId = await targetDb.collection("rooms").where("active_tablet_id", "==", tabletDoc.id).limit(1).get();
  return roomByDocId.empty ? null : roomByDocId.docs[0];
}

function roomNumberFrom(data: Record<string, unknown>, fallback: string) {
  return (
    fieldString(data, "room_number", "roomNumber", "name", "room_name", "roomName") ||
    fallback
  );
}

function isDeviceFallbackRoomName(value: string) {
  return /^device-[0-9a-z_-]+(?:호)?$/i.test(String(value ?? "").trim());
}

function responseError(response: HttpResponseLike, status: number, code: string, message: string, details?: unknown) {
  sendJson(response, status, {
    ok: false,
    error: { code, message, httpStatus: status, details },
  });
}

export async function tabletDeviceResolveHandler(request: HttpRequestLike, response: HttpResponseLike) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (!requirePost(request, response)) return;

  const body = readObjectBody<TabletDeviceResolveRequest>(request);
  const deviceId = cleanDeviceId(body.deviceId);

  if (!deviceId) {
    responseError(response, 400, "TABLET_DEVICE_ID_INVALID", "deviceId is required.");
    return;
  }

  const sourceDb = getAdminDbForProject("tablet-device-resolve-source", sourceProjectId);
  const targetDb = getAdminDb();
  const sourceDeviceSnapshot = await sourceDb.collection("devices").doc(deviceId).get();

  if (!sourceDeviceSnapshot.exists) {
    responseError(response, 404, "TABLET_DEVICE_NOT_REGISTERED", "The A3 device is not registered in signage-partner.");
    return;
  }

  const sourceDevice = sourceDeviceSnapshot.data() ?? {};
  const ownerUid = fieldString(sourceDevice, "owner_uid", "ownerUid");
  const deviceBusinessNo =
    fieldString(sourceDevice, ...businessNoFields) || (ownerUid ? await readSourceUserBusinessNo(sourceDb, ownerUid) : "");
  const normalizedDeviceBusinessNo = normalizeBusinessNo(deviceBusinessNo);

  if (!ownerUid || !normalizedDeviceBusinessNo) {
    responseError(response, 409, "TABLET_DEVICE_OWNER_MISSING", "The A3 device has no owner_uid or business number.", {
      hasOwnerUid: Boolean(ownerUid),
      hasBusinessNo: Boolean(normalizedDeviceBusinessNo),
    });
    return;
  }

  const tabletSnapshot = await findTargetTablet(targetDb, deviceId);

  if (!tabletSnapshot) {
    responseError(response, 404, "TABLET_DEVICE_A5_TABLET_NOT_LINKED", "No A5 tablet is linked to this A3 device.");
    return;
  }

  const tablet = tabletSnapshot.data();
  const tabletBusinessNo = normalizeBusinessNo(fieldString(tablet, ...businessNoFields));

  if (tabletBusinessNo && tabletBusinessNo !== normalizedDeviceBusinessNo) {
    responseError(response, 403, "TABLET_DEVICE_BUSINESS_MISMATCH", "A3 device business number and A5 tablet business number do not match.", {
      deviceBusinessNo: normalizedDeviceBusinessNo,
      tabletBusinessNo,
    });
    return;
  }

  const roomSnapshot = await findTargetRoom(targetDb, tabletSnapshot);

  if (!roomSnapshot) {
    responseError(response, 404, "TABLET_DEVICE_ROOM_NOT_LINKED", "No A5 room is linked to this tablet.");
    return;
  }

  const room = roomSnapshot.data();
  const roomId = fieldString(room, "room_id", "roomId") || roomSnapshot.id;
  const nurseryId = fieldString(room, "nursery_id", "nurseryId") || fieldString(tablet, "nursery_id", "nurseryId");
  const tabletId = fieldString(tablet, "tablet_id", "tabletId") || tabletSnapshot.id;

  if (!nurseryId || !roomId || !tabletId) {
    responseError(response, 409, "TABLET_DEVICE_SCOPE_INCOMPLETE", "A5 tablet room scope is incomplete.", {
      nurseryId,
      roomId,
      tabletId,
    });
    return;
  }

  const nurserySnapshot = await targetDb.collection("nurseries").doc(nurseryId).get();
  const nursery = nurserySnapshot.exists ? nurserySnapshot.data() ?? {} : {};
  const now = new Date().toISOString();
  const businessRegistrationNo = fieldString(nursery, ...businessNoFields) || deviceBusinessNo;
  const businessRegistrationNoNormalized = normalizeBusinessNo(businessRegistrationNo) || normalizedDeviceBusinessNo;
  const nurseryName = fieldString(nursery, "name", "nursery_name", "nurseryName", "business_name", "businessName") || nurseryId;
  const roomNumber = roomNumberFrom(room, roomId);
  const roomName = fieldString(room, "name", "room_name", "roomName") || roomNumber;

  if (isDeviceFallbackRoomName(roomNumber) || isDeviceFallbackRoomName(roomName)) {
    responseError(response, 409, "TABLET_DEVICE_ROOM_NAME_INVALID", "A5 room is linked to a device fallback name, not a real room.", {
      roomId,
      roomNumber,
      roomName,
    });
    return;
  }

  const customToken = await getAdminAuth().createCustomToken(`tablet:${deviceId}`, {
    role: "TABLET_DEVICE",
    nursery_id: nurseryId,
    room_id: roomId,
    tablet_id: tabletId,
    business_registration_no: businessRegistrationNoNormalized,
    external_tablet_id: deviceId,
  });

  sendJson(response, 200, {
    ok: true,
    profile: {
      id: nurseryId,
      nurseryId,
      businessRegistrationNo,
      businessRegistrationNoNormalized,
      nurseryName,
      representativeName: fieldString(nursery, "representative_name", "representativeName"),
      managerName: fieldString(nursery, "manager_name", "managerName"),
      managerPhone: fieldString(nursery, "manager_phone", "managerPhone", "phone"),
      managerEmail: fieldString(nursery, "manager_email", "managerEmail", "email"),
      businessAddress: fieldString(nursery, "business_address", "businessAddress", "address"),
      roomCount: fieldString(nursery, "room_count", "roomCount"),
      defaultPassword,
      externalNurseryId: fieldString(nursery, "external_nursery_id", "externalNurseryId") || nurseryId,
      source: "signage_partner",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    },
    room: {
      roomId,
      roomNumber,
      roomName,
      floor: fieldString(room, "floor"),
      pickupEnabled: fieldString(room, "pickup_enabled", "pickupEnabled") !== "false",
      activeTabletId: tabletId,
    },
    customToken,
    diagnostics: {
      sourceProjectId,
      deviceId,
      ownerUid,
      tabletDocId: tabletSnapshot.id,
      roomDocId: roomSnapshot.id,
      nurseryDocFound: nurserySnapshot.exists,
    },
  });
}
