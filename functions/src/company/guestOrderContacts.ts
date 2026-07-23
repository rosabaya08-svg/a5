import { createHash, timingSafeEqual } from "node:crypto";
import { getAdminDb } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { readSellerContactSnapshot, sellerContactDocument } from "./sellerContact";

export async function guestOrderContactsReadHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  const body = readObjectBody<Record<string, unknown>>(request);
  const orderNo = text(body.orderNo);
  const lookupToken = text(body.lookupToken ?? body.token);
  const phoneLast4 = digits(body.phoneLast4 ?? body.phone).slice(-4);
  if (!orderNo || (!lookupToken && phoneLast4.length !== 4)) {
    sendJson(response, 400, { ok: false, error: { code: "ORDER_CONTACT_INPUT_INVALID", message: "Order verification is required.", httpStatus: 400 } });
    return;
  }

  const snapshot = await getAdminDb().collection("orders").doc(orderNo).get();
  if (!snapshot.exists || snapshot.get("guest_lookup_enabled") !== true) {
    sendJson(response, 404, { ok: false, error: { code: "ORDER_NOT_FOUND", message: "Order was not found.", httpStatus: 404 } });
    return;
  }
  const expectedHash = text(snapshot.get("guest_lookup_token_hash"));
  const expectedLast4 = text(snapshot.get("customer_phone_last4"));
  const tokenOk = Boolean(lookupToken && expectedHash && safeEqual(hash(lookupToken), expectedHash));
  const phoneOk = Boolean(phoneLast4.length === 4 && expectedLast4 && phoneLast4 === expectedLast4);
  if (!tokenOk && !phoneOk) {
    sendJson(response, 403, { ok: false, error: { code: "ORDER_CONTACT_DENIED", message: "Order verification failed.", httpStatus: 403 } });
    return;
  }

  const itemSnapshots = await getAdminDb().collection("order_items").where("order_no", "==", orderNo).get();
  const items = itemSnapshots.docs.map((item) => ({
    id: item.id,
    productName: text(item.get("product_name") ?? item.get("productName")),
    optionName: text(item.get("option_name") ?? item.get("optionName")),
    quantity: Math.max(0, Math.trunc(Number(item.get("quantity") ?? 0))),
    companyId: text(item.get("company_id") ?? item.get("companyId") ?? item.get("seller_company_id")),
  }));
  let contacts = Array.isArray(snapshot.get("seller_contacts_snapshot"))
    ? snapshot.get("seller_contacts_snapshot")
    : [];
  if (!contacts.length) {
    const companyIds = [...new Set(items.map((item) => item.companyId).filter(Boolean))];
    contacts = await Promise.all(
      companyIds.map(async (companyId) => sellerContactDocument(await readSellerContactSnapshot(getAdminDb(), companyId))),
    );
  }
  sendJson(response, 200, {
    ok: true,
    orderNo,
    contacts,
    items: items.map(({ companyId: _companyId, ...item }) => item),
  });
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}
