import { createHash, randomBytes, randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  asRecord,
  firestoreDocumentId,
  requireAccess,
  safeDocumentId,
  sendAccessError,
  text,
  writeAccessAudit,
} from "../access/policy";
import { enforceBrowserRequestGuards } from "../access/requestGuards";

const REGION = "asia-northeast3";
const adminOptions = { region: REGION, cors: true, maxInstances: 10 };
const publicOptions = { region: REGION, cors: true, maxInstances: 20 };

type JsonRecord = Record<string, unknown>;

type DeviceScope = {
  nurseryId: string;
  roomId: string;
  tabletId: string;
  businessNumber: string;
  nurseryName: string;
  roomName: string;
  tabletLabel: string;
};

function requirePost(method: string) {
  if (method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
}

function normalizeBusinessNumber(value: unknown) {
  const result = text(value, 30).replace(/[^0-9]/g, "");
  if (result.length !== 10) throw new AccessHttpError(400, "BUSINESS_NUMBER_INVALID", "사업자번호는 숫자 10자리여야 합니다.");
  return result;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function enrollmentCode() {
  return `A5T-${randomBytes(18).toString("base64url")}`;
}

function maskBusinessNumber(value: string) {
  return value.length === 10 ? `${value.slice(0, 3)}-**-${value.slice(-5)}` : "***";
}

function scopeField(data: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = text(data[key], 200);
    if (value) return value;
  }
  return "";
}

async function loadDeviceScope(input: { nurseryId: string; roomId: string; tabletId: string; businessNumber: string }): Promise<DeviceScope> {
  const db = getAdminDb();
  const [nurserySnapshot, roomSnapshot, tabletSnapshot] = await Promise.all([
    db.doc(`nurseries/${firestoreDocumentId(input.nurseryId, "nurseryId")}`).get(),
    db.doc(`rooms/${firestoreDocumentId(input.roomId, "roomId")}`).get(),
    db.doc(`tablets/${firestoreDocumentId(input.tabletId, "tabletId")}`).get(),
  ]);
  if (!nurserySnapshot.exists) throw new AccessHttpError(404, "NURSERY_NOT_FOUND", "등록 대상 조리원을 찾을 수 없습니다.");
  if (!roomSnapshot.exists) throw new AccessHttpError(404, "ROOM_NOT_FOUND", "등록 대상 객실을 찾을 수 없습니다.");
  if (!tabletSnapshot.exists) throw new AccessHttpError(404, "TABLET_NOT_FOUND", "등록 대상 태블릿을 찾을 수 없습니다.");

  const nursery = (nurserySnapshot.data() ?? {}) as JsonRecord;
  const room = (roomSnapshot.data() ?? {}) as JsonRecord;
  const tablet = (tabletSnapshot.data() ?? {}) as JsonRecord;
  const nurseryStatus = scopeField(nursery, "status").toLowerCase();
  const tabletStatus = scopeField(tablet, "status").toLowerCase();
  const nurseryBusinessNumber = scopeField(nursery, "business_number", "business_registration_no", "businessNo").replace(/[^0-9]/g, "");
  const roomNurseryId = scopeField(room, "nursery_id", "nurseryId");
  const tabletNurseryId = scopeField(tablet, "nursery_id", "nurseryId");
  const tabletRoomId = scopeField(tablet, "room_id", "roomId");

  if (nurseryBusinessNumber && nurseryBusinessNumber !== input.businessNumber) {
    throw new AccessHttpError(409, "NURSERY_BUSINESS_NUMBER_MISMATCH", "조리원 사업자번호가 등록정보와 일치하지 않습니다.");
  }
  if (roomNurseryId && roomNurseryId !== input.nurseryId) {
    throw new AccessHttpError(409, "ROOM_NURSERY_SCOPE_MISMATCH", "객실이 선택한 조리원에 속하지 않습니다.");
  }
  if ((tabletNurseryId && tabletNurseryId !== input.nurseryId) || (tabletRoomId && tabletRoomId !== input.roomId)) {
    throw new AccessHttpError(409, "TABLET_SCOPE_MISMATCH", "태블릿의 조리원·객실 범위가 일치하지 않습니다.");
  }
  if (nurseryStatus && !["active", "approved"].includes(nurseryStatus)) {
    throw new AccessHttpError(409, "NURSERY_NOT_ACTIVE", "활성 조리원만 태블릿을 등록할 수 있습니다.");
  }
  if (tabletStatus && tabletStatus !== "active") {
    throw new AccessHttpError(409, "TABLET_NOT_ACTIVE", "활성 상태의 태블릿만 등록할 수 있습니다.");
  }

  return {
    nurseryId: input.nurseryId,
    roomId: input.roomId,
    tabletId: input.tabletId,
    businessNumber: input.businessNumber,
    nurseryName: scopeField(nursery, "name", "nursery_name", "business_name") || input.nurseryId,
    roomName: scopeField(room, "name", "room_name", "room_number") || input.roomId,
    tabletLabel: scopeField(tablet, "label", "tablet_label", "name") || input.tabletId,
  };
}

async function enforceEnrollmentRateLimit(request: { get(name: string): string | undefined; ip?: string }) {
  const forwarded = text(request.get("x-forwarded-for"), 500).split(",")[0]?.trim();
  const address = forwarded || text(request.ip, 200) || "unknown";
  const bucket = new Date().toISOString().slice(0, 13);
  const ref = getAdminDb().doc(`public_request_throttles/${sha256(`tablet-enroll|${address}|${bucket}`)}`);
  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= 10) throw new AccessHttpError(429, "TABLET_ENROLL_RATE_LIMITED", "태블릿 등록 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    transaction.set(ref, {
      type: "tablet_enrollment",
      count: count + 1,
      bucket,
      updated_at: FieldValue.serverTimestamp(),
      expires_at_iso: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    }, { merge: true });
  });
}

function sanitizedEnrollment(id: string, data: JsonRecord) {
  return {
    id,
    nurseryId: scopeField(data, "nursery_id"),
    nurseryName: scopeField(data, "nursery_name"),
    roomId: scopeField(data, "room_id"),
    roomName: scopeField(data, "room_name"),
    tabletId: scopeField(data, "tablet_id"),
    tabletLabel: scopeField(data, "tablet_label"),
    businessNumberMasked: maskBusinessNumber(scopeField(data, "business_number")),
    status: scopeField(data, "status") || "UNKNOWN",
    codeHint: scopeField(data, "code_hint"),
    expiresAt: scopeField(data, "expires_at_iso"),
    enrolledAt: scopeField(data, "enrolled_at_iso"),
    enrolledUid: scopeField(data, "enrolled_uid"),
    revokedAt: scopeField(data, "revoked_at_iso"),
    createdAt: scopeField(data, "created_at_iso"),
  };
}

export const tabletDeviceAdmin = onRequest(adminOptions, async (request, response) => {
  try {
    requirePost(request.method);
    const body = asRecord(request.body);
    const action = text(body.action, 30) || "list";
    const actor = await requireAccess(request, action === "list" ? "PAYUP_ACCESS_READ" : "PAYUP_ACCESS_MANAGE");
    const db = getAdminDb();

    if (action === "list") {
      const requestedLimit = Number(body.limit ?? 300);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 300;
      const snapshot = await db.collection("tablet_enrollment_codes").limit(limit).get();
      const list = snapshot.docs
        .map((document) => sanitizedEnrollment(document.id, (document.data() ?? {}) as JsonRecord))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      response.status(200).json({ ok: true, listCount: list.length, list, generatedAt: new Date().toISOString() });
      return;
    }

    if (action === "create") {
      const nurseryId = firestoreDocumentId(body.nurseryId, "nurseryId");
      const roomId = firestoreDocumentId(body.roomId, "roomId");
      const tabletId = firestoreDocumentId(body.tabletId, "tabletId");
      const businessNumber = normalizeBusinessNumber(body.businessNumber);
      const scope = await loadDeviceScope({ nurseryId, roomId, tabletId, businessNumber });
      const requestedHours = Number(body.expiresInHours ?? 24);
      const expiresInHours = Number.isFinite(requestedHours) ? Math.min(Math.max(Math.floor(requestedHours), 1), 168) : 24;
      const code = enrollmentCode();
      const id = `enroll-${Date.now()}-${randomUUID().slice(0, 8)}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString();
      await db.doc(`tablet_enrollment_codes/${safeDocumentId(id)}`).set({
        id,
        code_hash: sha256(code),
        code_hint: `${code.slice(0, 7)}…${code.slice(-4)}`,
        status: "ACTIVE",
        use_count: 0,
        max_uses: 1,
        nursery_id: scope.nurseryId,
        nursery_name: scope.nurseryName,
        room_id: scope.roomId,
        room_name: scope.roomName,
        tablet_id: scope.tabletId,
        tablet_label: scope.tabletLabel,
        business_number: scope.businessNumber,
        expires_at_iso: expiresAt,
        created_by_uid: actor.uid,
        created_by_email: actor.email,
        created_at: FieldValue.serverTimestamp(),
        created_at_iso: now.toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      });
      const correlationId = await writeAccessAudit({
        actor,
        action: "TABLET_DEVICE.ENROLLMENT_CREATED",
        targetType: "tablet_enrollment",
        targetId: id,
        after: { nurseryId, roomId, tabletId, businessNumberMasked: maskBusinessNumber(businessNumber), expiresAt },
        reason: text(body.reason, 500) || "태블릿 Firebase 등록코드 발급",
      });
      response.status(200).json({
        ok: true,
        enrollmentId: id,
        enrollmentCode: code,
        codeDisplayedOnce: true,
        expiresAt,
        scope,
        correlationId,
      });
      return;
    }

    if (action === "revoke") {
      const enrollmentId = firestoreDocumentId(body.enrollmentId, "enrollmentId");
      const ref = db.doc(`tablet_enrollment_codes/${enrollmentId}`);
      const snapshot = await ref.get();
      if (!snapshot.exists) throw new AccessHttpError(404, "TABLET_ENROLLMENT_NOT_FOUND", "태블릿 등록원장을 찾을 수 없습니다.");
      const data = (snapshot.data() ?? {}) as JsonRecord;
      const enrolledUid = scopeField(data, "enrolled_uid");
      const tabletId = scopeField(data, "tablet_id");
      await ref.set({
        status: "REVOKED",
        revoked_by_uid: actor.uid,
        revoked_by_email: actor.email,
        revoked_at: FieldValue.serverTimestamp(),
        revoked_at_iso: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (enrolledUid) {
        try {
          const user = await getAdminAuth().getUser(enrolledUid);
          await getAdminAuth().setCustomUserClaims(enrolledUid, { ...(user.customClaims ?? {}), access_status: "SUSPENDED" });
          await getAdminAuth().revokeRefreshTokens(enrolledUid);
        } catch {
          // 원장 취소는 유지하고 사용자 계정 복구는 수동처리 큐에서 확인합니다.
          await db.collection("manual_action_queue").add({
            type: "TABLET_AUTH_REVOKE_RETRY",
            status: "OPEN",
            enrollment_id: enrollmentId,
            enrolled_uid: enrolledUid,
            created_at: FieldValue.serverTimestamp(),
            created_at_iso: new Date().toISOString(),
          });
        }
      }
      if (tabletId) {
        await db.doc(`tablets/${firestoreDocumentId(tabletId, "tabletId")}`).set({
          device_auth_status: "SUSPENDED",
          device_auth_revoked_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      const correlationId = await writeAccessAudit({
        actor,
        action: "TABLET_DEVICE.ACCESS_REVOKED",
        targetType: "tablet_enrollment",
        targetId: enrollmentId,
        before: sanitizedEnrollment(snapshot.id, data),
        after: { status: "REVOKED" },
        reason: text(body.reason, 500) || "태블릿 접근권한 회수",
      });
      response.status(200).json({ ok: true, enrollmentId, status: "REVOKED", correlationId });
      return;
    }

    throw new AccessHttpError(400, "TABLET_ADMIN_ACTION_INVALID", "action은 list, create 또는 revoke여야 합니다.");
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const tabletDeviceEnroll = onRequest(publicOptions, async (request, response) => {
  let enrollmentRefPath = "";
  let attemptId = "";
  try {
    requirePost(request.method);
    await enforceBrowserRequestGuards(request);
    await enforceEnrollmentRateLimit(request);
    const body = asRecord(request.body);
    const businessNumber = normalizeBusinessNumber(body.businessNumber);
    const code = text(body.enrollmentCode, 200);
    if (!code || !/^A5T-[A-Za-z0-9_-]{20,80}$/.test(code)) {
      throw new AccessHttpError(400, "TABLET_ENROLLMENT_CODE_INVALID", "태블릿 등록코드 형식이 올바르지 않습니다.");
    }
    const codeHash = sha256(code);
    const db = getAdminDb();
    const matches = await db.collection("tablet_enrollment_codes").where("code_hash", "==", codeHash).limit(1).get();
    const enrollmentSnapshot = matches.docs[0];
    if (!enrollmentSnapshot) throw new AccessHttpError(404, "TABLET_ENROLLMENT_CODE_NOT_FOUND", "유효한 태블릿 등록코드를 찾을 수 없습니다.");
    enrollmentRefPath = enrollmentSnapshot.ref.path;
    attemptId = randomUUID();

    let scope: DeviceScope | null = null;
    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(enrollmentSnapshot.ref);
      const data = (fresh.data() ?? {}) as JsonRecord;
      const status = scopeField(data, "status");
      const expiresAt = scopeField(data, "expires_at_iso");
      const storedBusinessNumber = scopeField(data, "business_number").replace(/[^0-9]/g, "");
      const useCount = Number(data.use_count ?? 0);
      const maxUses = Number(data.max_uses ?? 1);
      if (status !== "ACTIVE") throw new AccessHttpError(409, "TABLET_ENROLLMENT_NOT_ACTIVE", "이미 사용되었거나 취소된 등록코드입니다.");
      if (!expiresAt || Date.parse(expiresAt) <= Date.now()) throw new AccessHttpError(409, "TABLET_ENROLLMENT_EXPIRED", "태블릿 등록코드가 만료되었습니다.");
      if (storedBusinessNumber !== businessNumber) throw new AccessHttpError(403, "TABLET_BUSINESS_NUMBER_MISMATCH", "사업자번호가 등록코드의 조리원과 일치하지 않습니다.");
      if (useCount >= maxUses) throw new AccessHttpError(409, "TABLET_ENROLLMENT_ALREADY_USED", "이미 사용된 태블릿 등록코드입니다.");
      scope = {
        nurseryId: scopeField(data, "nursery_id"),
        nurseryName: scopeField(data, "nursery_name"),
        roomId: scopeField(data, "room_id"),
        roomName: scopeField(data, "room_name"),
        tabletId: scopeField(data, "tablet_id"),
        tabletLabel: scopeField(data, "tablet_label"),
        businessNumber: storedBusinessNumber,
      };
      transaction.update(enrollmentSnapshot.ref, {
        status: "ENROLLING",
        enrollment_attempt_id: attemptId,
        enrollment_attempt_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    if (!scope) throw new AccessHttpError(500, "TABLET_SCOPE_RESOLUTION_FAILED", "태블릿 범위를 확인하지 못했습니다.");
    const verifiedScope = await loadDeviceScope(scope);
    const uid = `tablet_${safeDocumentId(verifiedScope.tabletId)}`.slice(0, 128);
    try {
      await getAdminAuth().getUser(uid);
    } catch {
      await getAdminAuth().createUser({ uid, displayName: `${verifiedScope.nurseryName} ${verifiedScope.roomName} 태블릿`, disabled: false });
    }
    const claims = {
      role: "TABLET_DEVICE",
      roles: ["TABLET_DEVICE"],
      access_status: "ACTIVE",
      nursery_id: verifiedScope.nurseryId,
      room_id: verifiedScope.roomId,
      tablet_id: verifiedScope.tabletId,
      business_number: verifiedScope.businessNumber,
      device_enrollment_id: enrollmentSnapshot.id,
    };
    await getAdminAuth().setCustomUserClaims(uid, claims);
    await getAdminAuth().revokeRefreshTokens(uid);
    const customToken = await getAdminAuth().createCustomToken(uid, claims);

    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(enrollmentSnapshot.ref);
      const data = (fresh.data() ?? {}) as JsonRecord;
      if (scopeField(data, "status") !== "ENROLLING" || scopeField(data, "enrollment_attempt_id") !== attemptId) {
        throw new AccessHttpError(409, "TABLET_ENROLLMENT_RACE_DETECTED", "태블릿 등록 상태가 변경되었습니다. 새 등록코드를 발급받아 주세요.");
      }
      transaction.update(enrollmentSnapshot.ref, {
        status: "USED",
        use_count: Number(data.use_count ?? 0) + 1,
        enrolled_uid: uid,
        enrolled_at: FieldValue.serverTimestamp(),
        enrolled_at_iso: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      });
      transaction.set(db.doc(`tablets/${firestoreDocumentId(verifiedScope.tabletId, "tabletId")}`), {
        device_auth_status: "ACTIVE",
        device_uid: uid,
        device_enrollment_id: enrollmentSnapshot.id,
        device_auth_registered_at: FieldValue.serverTimestamp(),
        last_seen_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    await db.collection("audit_logs").add({
      actor_uid: uid,
      actor_role: "TABLET_DEVICE",
      action: "TABLET_DEVICE.ENROLLED",
      target_type: "tablet",
      target_id: verifiedScope.tabletId,
      nursery_id: verifiedScope.nurseryId,
      room_id: verifiedScope.roomId,
      enrollment_id: enrollmentSnapshot.id,
      source: "tablet_device_enrollment",
      created_at: FieldValue.serverTimestamp(),
      created_at_iso: new Date().toISOString(),
    });

    response.status(200).json({
      ok: true,
      customToken,
      session: {
        nurseryId: verifiedScope.nurseryId,
        businessNo: verifiedScope.businessNumber,
        businessName: verifiedScope.nurseryName,
        roomId: verifiedScope.roomId,
        roomName: verifiedScope.roomName,
        tabletId: verifiedScope.tabletId,
        tabletLabel: verifiedScope.tabletLabel,
        fixedLogin: true,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (enrollmentRefPath && attemptId) {
      try {
        const ref = getAdminDb().doc(enrollmentRefPath);
        await getAdminDb().runTransaction(async (transaction) => {
          const snapshot = await transaction.get(ref);
          const data = (snapshot.data() ?? {}) as JsonRecord;
          if (scopeField(data, "status") === "ENROLLING" && scopeField(data, "enrollment_attempt_id") === attemptId) {
            transaction.update(ref, {
              status: "ACTIVE",
              enrollment_attempt_id: FieldValue.delete(),
              enrollment_attempt_at: FieldValue.delete(),
              last_error: error instanceof Error ? error.message.slice(0, 500) : "등록 실패",
              updated_at: FieldValue.serverTimestamp(),
            });
          }
        });
      } catch {
        // 수동처리 큐는 등록원장 상태 점검 스케줄러에서 생성합니다.
      }
    }
    sendAccessError(response, error);
  }
});

export const tabletDeviceStatus = onRequest(publicOptions, async (request, response) => {
  try {
    requirePost(request.method);
    await enforceBrowserRequestGuards(request);
    const authorization = request.get("authorization") ?? request.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) throw new AccessHttpError(401, "TABLET_AUTH_REQUIRED", "등록된 태블릿 Firebase 로그인이 필요합니다.");
    const decoded = await getAdminAuth().verifyIdToken(authorization.slice("Bearer ".length), true);
    const roles = [decoded.role, ...(Array.isArray(decoded.roles) ? decoded.roles : [])].map((value) => text(value, 100).toUpperCase());
    if (!roles.includes("TABLET_DEVICE") || text(decoded.access_status, 30).toUpperCase() !== "ACTIVE") {
      throw new AccessHttpError(403, "TABLET_AUTH_DENIED", "활성 TABLET_DEVICE 권한이 없습니다.");
    }
    const tabletId = firestoreDocumentId(decoded.tablet_id, "tabletId");
    const tablet = await getAdminDb().doc(`tablets/${tabletId}`).get();
    if (!tablet.exists || text(tablet.data()?.device_auth_status, 30).toUpperCase() !== "ACTIVE") {
      throw new AccessHttpError(403, "TABLET_DEVICE_SUSPENDED", "태블릿 등록이 중지되었습니다.");
    }
    await tablet.ref.set({ last_seen_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() }, { merge: true });
    response.status(200).json({
      ok: true,
      session: {
        nurseryId: text(decoded.nursery_id, 160),
        businessNo: text(decoded.business_number, 20),
        roomId: text(decoded.room_id, 160),
        tabletId,
        role: "TABLET_DEVICE",
        accessStatus: "ACTIVE",
      },
    });
  } catch (error) {
    sendAccessError(response, error);
  }
});
