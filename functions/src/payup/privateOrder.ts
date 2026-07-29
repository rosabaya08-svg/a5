import { createDecipheriv, createHash } from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  asRecord,
  firestoreDocumentId,
  requireAccess,
  sendAccessError,
  text,
  writeAccessAudit,
} from "../access/policy";
import { ORDER_PII_ENCRYPTION_KEY } from "./runtimeV2";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 10, secrets: [ORDER_PII_ENCRYPTION_KEY] };

type EncryptedSnapshot = {
  algorithm?: unknown;
  iv?: unknown;
  authTag?: unknown;
  ciphertext?: unknown;
  keyVersion?: unknown;
};

function decryptSnapshot(value: unknown, secret: string) {
  const encrypted = asRecord(value) as EncryptedSnapshot;
  if (text(encrypted.algorithm, 30) !== "aes-256-gcm" || !text(encrypted.iv, 500) || !text(encrypted.authTag, 500) || !text(encrypted.ciphertext, 100_000)) {
    throw new AccessHttpError(409, "ORDER_PRIVATE_SNAPSHOT_INVALID", "주문 개인정보 암호화 원장이 올바르지 않습니다.");
  }
  if (secret.length < 32) throw new AccessHttpError(409, "ORDER_PII_KEY_MISSING", "주문 개인정보 암호화 Secret이 준비되지 않았습니다.");
  try {
    const key = createHash("sha256").update(secret).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(text(encrypted.iv, 500), "base64"));
    decipher.setAuthTag(Buffer.from(text(encrypted.authTag, 500), "base64"));
    const plain = Buffer.concat([decipher.update(Buffer.from(text(encrypted.ciphertext, 100_000), "base64")), decipher.final()]).toString("utf8");
    return JSON.parse(plain) as Record<string, unknown>;
  } catch {
    throw new AccessHttpError(409, "ORDER_PRIVATE_DECRYPT_FAILED", "주문 개인정보 원장을 복호화하지 못했습니다.");
  }
}

function globalPiiRole(roles: string[]) {
  return roles.some((role) => ["SUPER_ADMIN", "FINANCE_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_ADMIN"].includes(role));
}

export const payupOrderPrivateRead = onRequest(options, async (request, response) => {
  try {
    const actor = await requireAccess(request, "ORDER_PII_READ");
    const body = asRecord(request.body);
    const orderNumber = firestoreDocumentId(body.orderNumber, "orderNumber");
    const db = getAdminDb();
    const [orderSnapshot, privateSnapshot, distribution] = await Promise.all([
      db.doc(`orders/${orderNumber}`).get(),
      db.doc(`order_private/${orderNumber}`).get(),
      db.collection("payment_distribution_lines").where("order_number", "==", orderNumber).limit(300).get(),
    ]);
    if (!orderSnapshot.exists || !privateSnapshot.exists) throw new AccessHttpError(404, "ORDER_PRIVATE_NOT_FOUND", "주문 또는 암호화 개인정보 원장을 찾지 못했습니다.");
    if (!globalPiiRole(actor.roles)) {
      const scoped = distribution.docs.some((document) => {
        const line = document.data();
        const organizationId = text(line.organization_id ?? line.organizationId, 160);
        const businessNumber = text(line.business_number ?? line.businessNumber, 20).replace(/[^0-9]/g, "");
        return (organizationId && actor.organizationIds.includes(organizationId)) || (businessNumber && actor.businessNumbers.includes(businessNumber));
      });
      if (!scoped) throw new AccessHttpError(403, "ORDER_PRIVATE_SCOPE_DENIED", "다른 하위사업자의 주문 개인정보는 조회할 수 없습니다.");
    }
    const privateData = privateSnapshot.data() ?? {};
    const decrypted = decryptSnapshot(privateData.encrypted_snapshot, ORDER_PII_ENCRYPTION_KEY.value());
    const correlationId = await writeAccessAudit({ actor, action: "PAYUP.ORDER_PRIVATE.READ", targetType: "order", targetId: orderNumber, reason: text(body.reason, 500) || "주문 이행·고객지원 목적" });
    response.status(200).json({ ok: true, orderNumber, order: orderSnapshot.data(), private: decrypted, correlationId, accessLogged: true });
  } catch (error) {
    sendAccessError(response, error);
  }
});
