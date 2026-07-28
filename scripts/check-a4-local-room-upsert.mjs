import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const root = process.cwd();
const defaultFunctionBaseUrl = "https://asia-northeast3-a5-closed-mall.cloudfunctions.net";
const projectId = readProjectId();
const dotenv = readDotenv(".env.local");
const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  dotenv.NEXT_PUBLIC_FIREBASE_API_KEY ||
  dotenv.FIREBASE_API_KEY ||
  "";
const functionBaseUrl = trimSlash(
  process.env.A5_FUNCTIONS_BASE_URL ||
    process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ||
    process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ||
    dotenv.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ||
    dotenv.NEXT_PUBLIC_PAYMENT_API_BASE_URL ||
    defaultFunctionBaseUrl,
);
const allowWrites = process.env.A5_RUN_A4_LOCAL_ROOM_UPSERT_E2E === "1";
const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const roomId = `room-e2e-a4-local-${stamp}`;
const tabletId = `tablet-e2e-a4-local-${stamp}`;
const roomNumber = `88${stamp.slice(-4)}`;
let nurseryId = "nursery-test-1004";
let businessRegistrationNo = "1004-1004-1004";
const createdName = `E2E A4 Local ${stamp}`;
const renamedName = `E2E A4 Local Renamed ${stamp}`;

if (!allowWrites) {
  console.error("Refusing to run A4 local room upsert E2E without A5_RUN_A4_LOCAL_ROOM_UPSERT_E2E=1.");
  console.error("This script creates and deletes controlled E2E room/tablet documents in live Firebase.");
  process.exit(2);
}

if (!apiKey) {
  console.error("NEXT_PUBLIC_FIREBASE_API_KEY is required for Firebase custom token exchange.");
  process.exit(2);
}

const result = {
  ok: false,
  projectId,
  functionBaseUrl,
  nurseryId,
  roomId,
  tabletId,
  steps: [],
};

let oauthToken = "";
let nurseryIdToken = "";

try {
  oauthToken = await getFirebaseCliAccessToken();

  await runStep("tablet_nursery_login_token", async () => {
    const login = await postFunction("tabletNurseryLogin", {
      businessRegistrationNo,
      password: "1004",
    });
    if (!login.ok || !login.customToken) throw new Error("tabletNurseryLogin did not return a customToken.");

    nurseryId = String(login.profile?.nurseryId || nurseryId);
    businessRegistrationNo = String(login.profile?.businessRegistrationNo || businessRegistrationNo);
    result.nurseryId = nurseryId;
    const exchange = await exchangeCustomTokenForIdToken(login.customToken);
    nurseryIdToken = exchange.idToken;

    return {
      nurseryId,
      businessRegistrationNo,
      roomCount: Array.isArray(login.rooms) ? login.rooms.length : 0,
      tokenExchanged: Boolean(nurseryIdToken),
    };
  });

  await runStep("create_local_room", async () => {
    const body = await postFunction("a4LocalRoomUpsert", {
      nurseryId,
      businessRegistrationNo,
      roomId,
      roomNumber,
      name: createdName,
      pickupEnabled: true,
      activeTabletId: tabletId,
    }, { idToken: nurseryIdToken });
    if (!body.ok) throw new Error("a4LocalRoomUpsert did not return ok=true for create.");
    return { targetRoomId: body.room?.targetRoomId, roomNumber: body.room?.roomNumber, name: body.room?.name };
  });

  await runStep("verify_created_firestore", async () => {
    const room = await getFirestoreDocument("rooms", roomId);
    const tablet = await getFirestoreDocument("tablets", tabletId);
    assert(room.exists, `rooms/${roomId} was not found after create.`);
    assert(tablet.exists, `tablets/${tabletId} was not found after create.`);
    assert(room.fields.nursery_id === nurseryId, "room nursery_id mismatch.");
    assert(room.fields.business_registration_no === businessRegistrationNo, "room business_registration_no mismatch.");
    assert(room.fields.name === createdName, "room name mismatch after create.");
    assert(tablet.fields.room_id === roomId, "tablet room_id mismatch after create.");
    return {
      roomName: room.fields.name,
      roomImportSource: room.fields.import_source,
      tabletRoomId: tablet.fields.room_id,
      tabletImportSource: tablet.fields.import_source,
    };
  });

  await runStep("rename_local_room", async () => {
    const body = await postFunction("a4LocalRoomUpsert", {
      nurseryId,
      businessRegistrationNo,
      roomId,
      roomNumber,
      name: renamedName,
      pickupEnabled: true,
      activeTabletId: tabletId,
    }, { idToken: nurseryIdToken });
    if (!body.ok) throw new Error("a4LocalRoomUpsert did not return ok=true for rename.");
    return { targetRoomId: body.room?.targetRoomId, roomNumber: body.room?.roomNumber, name: body.room?.name };
  });

  await runStep("verify_renamed_firestore", async () => {
    const room = await getFirestoreDocument("rooms", roomId);
    const tablet = await getFirestoreDocument("tablets", tabletId);
    assert(room.exists, `rooms/${roomId} was not found after rename.`);
    assert(tablet.exists, `tablets/${tabletId} was not found after rename.`);
    assert(room.fields.name === renamedName, "room name mismatch after rename.");
    assert(tablet.fields.label === `${renamedName} tablet`, "tablet label mismatch after rename.");
    return { roomName: room.fields.name, tabletLabel: tablet.fields.label };
  });

  result.ok = result.steps.every((step) => step.ok);
} finally {
  if (oauthToken) {
    await runStep("cleanup_e2e_room_and_tablet", async () => {
      const deleted = [];
      deleted.push(await deleteFirestoreDocument("rooms", roomId));
      deleted.push(await deleteFirestoreDocument("tablets", tabletId));
      return { deleted };
    });
  }
}

console.log("A4_LOCAL_ROOM_UPSERT_E2E_RESULT_START");
console.log(JSON.stringify(result, null, 2));
console.log("A4_LOCAL_ROOM_UPSERT_E2E_RESULT_END");

if (!result.ok) process.exit(1);

async function runStep(name, action) {
  const startedAt = Date.now();
  try {
    const stepResult = await action();
    result.steps.push({ name, ok: true, durationMs: Date.now() - startedAt, result: stepResult });
  } catch (error) {
    result.steps.push({ name, ok: false, durationMs: Date.now() - startedAt, error: normalizeError(error) });
  }
}

async function postFunction(name, body, options = {}) {
  const response = await fetch(`${functionBaseUrl}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-A5-Client": "a4-local-room-upsert-e2e",
      "X-A5-Beta-Room-Sync": "enabled",
      ...(options.idToken ? { Authorization: `Bearer ${options.idToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const responseBody = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(`${name} failed with HTTP ${response.status}: ${JSON.stringify(responseBody)}`);
  }
  return responseBody;
}

async function exchangeCustomTokenForIdToken(customToken) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: customToken,
      returnSecureToken: true,
    }),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok || !body.idToken) {
    throw new Error(`Firebase custom token exchange failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return { idToken: body.idToken, localId: body.localId };
}

async function getFirestoreDocument(collection, id) {
  const response = await fetch(firestoreDocumentUrl(collection, id), {
    headers: { Authorization: `Bearer ${oauthToken}` },
  });

  if (response.status === 404) return { exists: false, id, fields: {} };

  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(`${collection}/${id} read failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  return {
    exists: true,
    id,
    name: body.name,
    fields: decodeFirestoreFields(body.fields || {}),
  };
}

async function deleteFirestoreDocument(collection, id) {
  const response = await fetch(firestoreDocumentUrl(collection, id), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${oauthToken}` },
  });

  if (response.status === 404) return { collection, id, status: 404, skipped: true };
  if (!response.ok) {
    const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
    throw new Error(`${collection}/${id} delete failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return { collection, id, status: response.status };
}

function firestoreDocumentUrl(collection, id) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
}

async function getFirebaseCliAccessToken() {
  const require = createRequire(import.meta.url);
  const firebaseToolsRoot = join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools");
  const auth = require(join(firebaseToolsRoot, "lib", "auth.js"));
  const scopes = require(join(firebaseToolsRoot, "lib", "scopes.js"));
  const account = auth.getGlobalDefaultAccount();

  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI login account was not found. Run firebase login first.");
  }

  const token = await auth.getAccessToken(account.tokens.refresh_token, [
    scopes.CLOUD_PLATFORM,
    scopes.FIREBASE_PLATFORM,
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
  ]);
  return token.access_token;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeError(error) {
  return {
    code: "ERROR",
    message: error instanceof Error ? error.message : String(error),
  };
}

function readDotenv(path) {
  try {
    const result = {};
    for (const line of readFileSync(join(root, path), "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function readProjectId() {
  try {
    const rc = JSON.parse(readFileSync(join(root, ".firebaserc"), "utf8"));
    return rc.projects?.default || "a5-closed-mall";
  } catch {
    return "a5-closed-mall";
  }
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}
