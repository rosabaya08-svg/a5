import { FieldValue, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import {
  calculateItemsAmount,
  type CartItemInput,
  makeQrSessionId,
  makeShortCode,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
  type QrCreateRequest,
  type QrExpireRequest,
} from "../payments/types";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getQrTransactionPlan } from "../utils/firestoreTransaction";

const defaultA5PublicOrigin = "https://a5-closed-mall.pages.dev";

export type QrSessionValidationInput = {
  qrSessionId: string;
  status?: "active" | "paid" | "expired" | "cancelled";
  expiresAt?: string;
};

export type QrSessionValidationResult =
  | { ok: true; qrSessionId: string; checkedAt: string }
  | { ok: false; code: string; message: string; checkedAt: string };

export type FirestoreQrSession = {
  id: string;
  status: string;
  expiresAt?: string;
  shortCode?: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  totalAmountSnapshot?: number;
  itemsSnapshot?: unknown;
};

type PricedCartItem = CartItemInput & {
  status: string;
  inventory: number;
  reservedInventory: number;
  availableInventory: number;
  lineAmount: number;
  source: "firestore_products";
};

type TabletScope = {
  nurseryId: string;
  roomId: string;
  tabletId: string;
  repaired?: boolean;
};

type QrSessionLookupInput = {
  shortCode?: string;
  qrSessionId?: string;
};

type QrSessionLookupResult = {
  snapshot: DocumentSnapshot | null;
  triedDocIds: string[];
  triedShortCodes: string[];
  triedSessionFields: string[];
};

class QrCreateHttpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function validateQrSession(input: QrSessionValidationInput): QrSessionValidationResult {
  const checkedAt = new Date().toISOString();

  if (!input.qrSessionId) {
    return { ok: false, code: "QR_SESSION_REQUIRED", message: "qrSessionId is required.", checkedAt };
  }

  if (input.status && input.status !== "active") {
    return {
      ok: false,
      code: "QR_SESSION_NOT_ACTIVE",
      message: `QR session is ${input.status}. Payment must be blocked.`,
      checkedAt,
    };
  }

  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
    return {
      ok: false,
      code: "QR_SESSION_EXPIRED",
      message: "QR session is expired. Create a new QR from tablet.",
      checkedAt,
    };
  }

  return { ok: true, qrSessionId: input.qrSessionId, checkedAt };
}

export async function readQrSession(qrSessionId: string): Promise<FirestoreQrSession | null> {
  const { snapshot } = await findQrSessionDocument(getAdminDb(), { qrSessionId });

  if (!snapshot?.exists) return null;

  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    status: String(data.status ?? "unknown"),
    expiresAt: toIsoString(data.expires_at ?? data.expiresAt),
    shortCode: optionalString(data.short_code ?? data.shortCode),
    nurseryId: optionalString(data.nursery_id ?? data.nurseryId),
    roomId: optionalString(data.room_id ?? data.roomId),
    tabletId: optionalString(data.tablet_id ?? data.tabletId),
    totalAmountSnapshot: typeof data.total_amount_snapshot === "number" ? data.total_amount_snapshot : undefined,
    itemsSnapshot: data.items_snapshot ?? data.itemsSnapshot,
  };
}

export async function validateFirestoreQrSession(qrSessionId: string): Promise<QrSessionValidationResult & { session?: FirestoreQrSession }> {
  const session = await readQrSession(qrSessionId);

  if (!session) {
    return {
      ok: false,
      code: "QR_SESSION_NOT_FOUND",
      message: "QR session document was not found.",
      checkedAt: new Date().toISOString(),
    };
  }

  const validation = validateQrSession({
    qrSessionId,
    status: normalizeQrStatus(session.status),
    expiresAt: session.expiresAt,
  });

  return validation.ok ? { ...validation, session } : validation;
}

export async function qrCreateHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  try {
    const body = readObjectBody<QrCreateRequest>(request);
    const items = normalizeCartItems(body.items);
    const nurseryId = String(body.nurseryId ?? "");
    const roomId = String(body.roomId ?? "");
    const tabletId = String(body.tabletId ?? "");

    if (!nurseryId || !roomId || !tabletId || items.length === 0) {
      throw new QrCreateHttpError(
        "QR_CREATE_INPUT_INVALID",
        "nurseryId, roomId, tabletId, and at least one item are required.",
        400,
      );
    }

    const db = getAdminDb();
    const tabletScope = await resolveTabletScope(db, {
      nurseryId,
      roomId,
      tabletId,
      pickupLocation: body.pickupLocation,
    });

    const pricedItems = await priceCartItemsFromFirestore(db, items);
    const companyIds = new Set(pricedItems.map((item) => item.companyId).filter(Boolean));
    if (companyIds.size > 1) {
      throw new QrCreateHttpError(
        "QR_CREATE_COMPANY_GROUP_REQUIRED",
        "One payment QR can contain items from only one company/MID. Create a separate QR for each company group.",
        409,
        { companyIds: [...companyIds] },
      );
    }

    const totalAmount = calculateItemsAmount(pricedItems);
    const clientAmount = readClientAmount(body);
    const amountMismatch =
      typeof clientAmount === "number" && clientAmount !== totalAmount
        ? { clientAmount, serverAmount: totalAmount }
        : null;

    const now = new Date();
    const shortCode = await resolveShortCode(db, optionalString(body.shortCode), now);
    const qrSessionId = makeQrSessionId(shortCode);
    const expiresInMinutes = clampNumber(Number(body.expiresInMinutes ?? 180), 5, 24 * 60);
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000).toISOString();
    const deliveryMethod = body.deliveryMethod === "delivery" ? "delivery" : "pickup";
    const pickupLocation = normalizePickupLocation(body.pickupLocation, {
      nurseryId: tabletScope.nurseryId,
      roomId: tabletScope.roomId,
    });
    const auditRef = db.collection("audit_logs").doc();
    const qrRef = db.collection("qr_payment_sessions").doc(qrSessionId);

    await db.runTransaction(async (transaction) => {
      transaction.set(qrRef, {
        id: qrSessionId,
        qr_session_id: qrSessionId,
        short_code: shortCode,
        cart_id: body.cartId ?? null,
        nursery_id: tabletScope.nurseryId,
        room_id: tabletScope.roomId,
        tablet_id: tabletScope.tabletId,
        type: "purchase",
        status: "active",
        delivery_method: deliveryMethod,
        items_snapshot: pricedItems.map(toSnapshotItem),
        total_amount_snapshot: totalAmount,
        client_amount_hint: clientAmount ?? null,
        amount_mismatch_warning: amountMismatch,
        pickup_location: pickupLocation,
        pickupLocation,
        currency: body.currency ?? "KRW",
        expires_at: expiresAt,
        guest_read_enabled: true,
        source: "firebase_functions_qr_create",
        demo_read_enabled: true,
        created_at: now.toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      });

      transaction.set(
        auditRef,
        {
          ...toAuditLogDocument(
            createAuditLogDraft({
              action: "qr_session_create",
              target: qrSessionId,
              severity: "info",
              message: "QR payment session created by Firebase Functions after server-side scope, product, option, inventory, and amount validation.",
            }),
          ),
          nursery_id: tabletScope.nurseryId,
          room_id: tabletScope.roomId,
          tablet_id: tabletScope.tabletId,
          short_code: shortCode,
          client_amount_hint: clientAmount ?? null,
          total_amount_snapshot: totalAmount,
          amount_mismatch_warning: amountMismatch,
          updated_at: FieldValue.serverTimestamp(),
        },
      );
    });

    const liveQrPath = `/q/live?code=${encodeURIComponent(shortCode)}`;
    const customerUrl = buildCustomerUrl(request, liveQrPath);
    const paymentUrl = buildCustomerUrl(request, liveQrPath);

    sendJson(response, 200, {
      ok: true,
      qrSessionId,
      shortCode,
      status: "active",
      expiresAt,
      nurseryId: tabletScope.nurseryId,
      roomId: tabletScope.roomId,
      tabletId: tabletScope.tabletId,
      scopeRepaired: Boolean(tabletScope.repaired),
      totalAmount,
      items: pricedItems.map(toClientCartItem),
      amountMismatch,
      pickupLocation,
      paymentUrl,
      customerUrl,
      source: "firebase_functions_qr_create",
      firestoreTransactionPlan: getQrTransactionPlan(),
      message: "QR session created in beta server flow. Direct client writes remain blocked.",
    });
  } catch (error) {
    const normalized =
      error instanceof QrCreateHttpError
        ? error
        : new QrCreateHttpError("FIRESTORE_WRITE_FAILED", error instanceof Error ? error.message : "QR create failed.", 500);

    sendJson(response, normalized.httpStatus, {
      ok: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        httpStatus: normalized.httpStatus,
        details: normalized.details,
      },
    });
  }
}

export async function qrExpireHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<QrExpireRequest>(request);
  const qrSessionId = String(body.qrSessionId ?? "");

  if (!qrSessionId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "QR_EXPIRE_INPUT_INVALID",
        message: "qrSessionId is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const qrRef = db.collection("qr_payment_sessions").doc(qrSessionId);
  const auditRef = db.collection("audit_logs").doc();
  let newStatus = "expired";

  await db.runTransaction(async (transaction) => {
    const qrSnapshot = await transaction.get(qrRef);

    if (!qrSnapshot.exists) {
      throw new Error("QR_SESSION_NOT_FOUND");
    }

    const status = String(qrSnapshot.get("status") ?? "");
    if (status === "paid") {
      newStatus = "paid";
      return;
    }

    if (status === "cancelled") {
      newStatus = "cancelled";
      return;
    }

    transaction.set(
      qrRef,
      {
        status: "expired",
        expired_reason: body.reason ?? "manual_or_scheduler_expire",
        expired_at: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(
      auditRef,
      {
        ...toAuditLogDocument(
          createAuditLogDraft({
            action: "qr_session_expire",
            target: qrSessionId,
            severity: "info",
            message: "QR session expired by Firebase Functions.",
          }),
        ),
        updated_at: FieldValue.serverTimestamp(),
      },
    );
  });

  sendJson(response, 200, {
    ok: newStatus === "expired",
    qrSessionId,
    status: newStatus,
    message: newStatus === "expired" ? "QR session expired." : "QR session was not changed because it is already terminal.",
  });
}

export async function qrLookupHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use GET or POST for QR lookup.",
        httpStatus: 405,
      },
    });
    return;
  }

  const body = readObjectBody<{ shortCode?: string; code?: string; qrSessionId?: string }>(request);
  const shortCode = optionalString(request.query?.shortCode ?? request.query?.code ?? body.shortCode ?? body.code);
  const qrSessionId = optionalString(request.query?.qrSessionId ?? body.qrSessionId);

  if (!shortCode && !qrSessionId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "QR_LOOKUP_INPUT_INVALID",
        message: "shortCode or qrSessionId is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const lookup = await findQrSessionDocument(getAdminDb(), { shortCode, qrSessionId });
  const snapshot = lookup.snapshot;

  if (!snapshot?.exists) {
    sendJson(response, 404, {
      ok: false,
      error: {
        code: "QR_SESSION_NOT_FOUND",
        message: "QR session document was not found.",
        httpStatus: 404,
        details: {
          shortCode,
          qrSessionId,
          triedDocIds: lookup.triedDocIds.slice(0, 12),
          triedShortCodes: lookup.triedShortCodes.slice(0, 12),
          triedSessionFields: lookup.triedSessionFields.slice(0, 12),
        },
      },
    });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    session: toPublicQrSession(snapshot.id, asRecord(snapshot.data())),
    source: "firebase_functions_qr_lookup",
  });
}

async function findQrSessionDocument(db: Firestore, input: QrSessionLookupInput): Promise<QrSessionLookupResult> {
  const collection = db.collection("qr_payment_sessions");
  const triedDocIds: string[] = [];
  const triedShortCodes: string[] = [];
  const triedSessionFields: string[] = [];

  for (const documentId of getQrLookupDocumentIds(input)) {
    triedDocIds.push(documentId);
    const snapshot = await collection.doc(documentId).get();
    if (snapshot.exists) return { snapshot, triedDocIds, triedShortCodes, triedSessionFields };
  }

  for (const field of ["short_code", "shortCode"]) {
    for (const code of getQrLookupCodes(input)) {
      triedShortCodes.push(`${field}:${code}`);
      const snapshot = await collection.where(field, "==", code).limit(1).get();
      const found = snapshot.docs[0];
      if (found?.exists) return { snapshot: found, triedDocIds, triedShortCodes, triedSessionFields };
    }
  }

  for (const field of ["qr_session_id", "qrSessionId", "id"]) {
    for (const sessionId of getQrLookupDocumentIds(input)) {
      triedSessionFields.push(`${field}:${sessionId}`);
      const snapshot = await collection.where(field, "==", sessionId).limit(1).get();
      const found = snapshot.docs[0];
      if (found?.exists) return { snapshot: found, triedDocIds, triedShortCodes, triedSessionFields };
    }
  }

  return { snapshot: null, triedDocIds, triedShortCodes, triedSessionFields };
}

function getQrLookupCodes(input: QrSessionLookupInput): string[] {
  const shortCode = normalizeQrLookupToken(input.shortCode);
  const qrSessionId = normalizeQrLookupToken(input.qrSessionId);

  return uniqueLookupValues([shortCode, removeQrDocumentPrefix(shortCode), qrSessionId, removeQrDocumentPrefix(qrSessionId)]);
}

function getQrLookupDocumentIds(input: QrSessionLookupInput): string[] {
  const qrSessionId = normalizeQrLookupToken(input.qrSessionId);
  const codes = getQrLookupCodes(input);

  return uniqueLookupValues([
    qrSessionId,
    removeQrDocumentPrefix(qrSessionId),
    ...codes,
    ...codes.map((code) => makeQrSessionId(removeQrDocumentPrefix(code) ?? code)),
  ]);
}

function normalizeQrLookupToken(value: string | undefined): string | undefined {
  const text = optionalString(value);
  if (!text) return undefined;

  if (!/^https?:\/\//i.test(text)) return text;

  try {
    const url = new URL(text);
    return optionalString(url.searchParams.get("code") ?? url.searchParams.get("shortCode") ?? url.searchParams.get("qrSessionId")) ?? text;
  } catch {
    return text;
  }
}

function removeQrDocumentPrefix(value: string | undefined): string | undefined {
  const text = optionalString(value);
  if (!text) return undefined;
  return text.toLowerCase().startsWith("qr-") ? text.slice(3) : text;
}

function uniqueLookupValues(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = optionalString(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }

  return result;
}

async function validateTabletScope(
  db: Firestore,
  input: { nurseryId: string; roomId: string; tabletId: string },
): Promise<void> {
  const nursery = await readRequiredDocument(db, "nurseries", input.nurseryId, "ROOM_SCOPE_INVALID");
  const room = await readRequiredDocument(db, "rooms", input.roomId, "ROOM_SCOPE_INVALID");
  const tablet = await readRequiredDocument(db, "tablets", input.tabletId, "TABLET_SCOPE_INVALID");
  const nurseryStatus = fieldString(nursery, "status") ?? "approved";
  const roomNurseryId = fieldString(room, "nursery_id", "nurseryId");
  const tabletNurseryId = fieldString(tablet, "nursery_id", "nurseryId");
  const tabletRoomId = fieldString(tablet, "room_id", "roomId");
  const tabletStatus = fieldString(tablet, "status") ?? "active";

  if (!["approved", "active"].includes(nurseryStatus)) {
    throw new QrCreateHttpError("ROOM_SCOPE_INVALID", "Nursery is not active for QR creation.", 403, {
      nurseryId: input.nurseryId,
      status: nurseryStatus,
    });
  }

  if (roomNurseryId !== input.nurseryId) {
    throw new QrCreateHttpError("ROOM_SCOPE_INVALID", "Room does not belong to the requested nursery.", 403, {
      roomId: input.roomId,
      roomNurseryId,
      nurseryId: input.nurseryId,
    });
  }

  if (tabletNurseryId !== input.nurseryId || tabletRoomId !== input.roomId || tabletStatus !== "active") {
    throw new QrCreateHttpError("TABLET_SCOPE_INVALID", "Tablet scope does not match nursery/room or tablet is not active.", 403, {
      tabletId: input.tabletId,
      tabletNurseryId,
      tabletRoomId,
      tabletStatus,
    });
  }
}

async function resolveTabletScope(
  db: Firestore,
  input: { nurseryId: string; roomId: string; tabletId: string; pickupLocation?: unknown },
): Promise<TabletScope> {
  try {
    await validateTabletScope(db, input);
    return input;
  } catch (error) {
    if (!(error instanceof QrCreateHttpError)) throw error;
    if (!["ROOM_SCOPE_INVALID", "TABLET_SCOPE_INVALID"].includes(error.code)) throw error;
  }

  const nursery = await readRequiredDocument(db, "nurseries", input.nurseryId, "ROOM_SCOPE_INVALID");
  const nurseryStatus = fieldString(nursery, "status") ?? "approved";

  if (!["approved", "active"].includes(nurseryStatus)) {
    throw new QrCreateHttpError("ROOM_SCOPE_INVALID", "Nursery is not active for QR creation.", 403, {
      nurseryId: input.nurseryId,
      status: nurseryStatus,
    });
  }

  const roomNumber = resolveRoomNumber(input.roomId, input.pickupLocation);

  if (!roomNumber) {
    throw new QrCreateHttpError("ROOM_SCOPE_INVALID", "Room scope could not be repaired because room number is missing.", 403, {
      nurseryId: input.nurseryId,
      roomId: input.roomId,
      tabletId: input.tabletId,
    });
  }

  const nurserySegment = toDocumentSegment(input.nurseryId.replace(/^nursery-/, "")) || "nursery";
  const roomSegment = toDocumentSegment(roomNumber);
  const repairedRoomId = `room-${nurserySegment}-${roomSegment}`;
  const repairedTabletId = `tablet-${nurserySegment}-${roomSegment}-a`;
  const pickup = asRecord(input.pickupLocation);
  const roomName = fieldString(pickup, "roomName", "room_name") ?? `${roomNumber}호`;
  const now = FieldValue.serverTimestamp();

  await db.collection("rooms").doc(repairedRoomId).set(
    {
      room_id: repairedRoomId,
      nursery_id: input.nurseryId,
      name: roomName,
      room_number: roomNumber,
      floor: inferRoomFloor(roomNumber),
      pickup_enabled: true,
      active_tablet_id: repairedTabletId,
      status: "active",
      import_source: "QR_SCOPE_REPAIR",
      legacy_room_id: input.roomId,
      legacy_tablet_id: input.tabletId,
      created_at: now,
      updated_at: now,
    },
    { merge: true },
  );

  await db.collection("tablets").doc(repairedTabletId).set(
    {
      tablet_id: repairedTabletId,
      nursery_id: input.nurseryId,
      room_id: repairedRoomId,
      label: `${roomName} 태블릿`,
      status: "active",
      import_source: "QR_SCOPE_REPAIR",
      legacy_room_id: input.roomId,
      legacy_tablet_id: input.tabletId,
      created_at: now,
      updated_at: now,
    },
    { merge: true },
  );

  const repairedScope = {
    nurseryId: input.nurseryId,
    roomId: repairedRoomId,
    tabletId: repairedTabletId,
    repaired: true,
  };

  await validateTabletScope(db, repairedScope);
  return repairedScope;
}

async function priceCartItemsFromFirestore(db: Firestore, items: CartItemInput[]): Promise<PricedCartItem[]> {
  const pricedItems: PricedCartItem[] = [];

  for (const item of items) {
    const product = await readProductForCart(db, item.productId);
    const option = item.optionId ? await readOptionForCart(db, item.productId, item.optionId) : undefined;
    const productPrice = resolveProductPrice(product);
    const priceDelta = option ? fieldNumber(option, "price_delta", "priceDelta") ?? 0 : 0;
    const unitPrice = productPrice + priceDelta;
    const productStock = fieldNumber(product, "stock", "inventory", "available_stock", "availableStock") ?? 0;
    const optionStock = option ? fieldNumber(option, "stock", "inventory", "available_stock", "availableStock") : undefined;
    const stock = optionStock ?? productStock;
    const reservedInventory = option
      ? fieldNumber(option, "reserved_inventory", "reservedInventory") ?? 0
      : fieldNumber(product, "reserved_inventory", "reservedInventory") ?? 0;
    const availableInventory = Math.max(0, stock - reservedInventory);

    if (item.quantity > availableInventory) {
      throw new QrCreateHttpError("INVENTORY_SHORTAGE", "Inventory is not enough to create QR session.", 409, {
        productId: item.productId,
        optionId: item.optionId,
        requestedQuantity: item.quantity,
        availableInventory,
      });
    }

    pricedItems.push({
      productId: item.productId,
      optionId: item.optionId,
      productName: fieldString(product, "title", "name") ?? item.productName,
      optionName: option ? fieldString(option, "name", "option_name", "optionName") ?? item.optionName : item.optionName,
      unitPrice,
      quantity: item.quantity,
      companyId: fieldString(product, "company_id", "companyId") ?? item.companyId,
      status: fieldString(product, "status") ?? "active",
      inventory: stock,
      reservedInventory,
      availableInventory,
      lineAmount: unitPrice * item.quantity,
      source: "firestore_products",
    });
  }

  return pricedItems;
}

async function readProductForCart(db: Firestore, productId: string): Promise<Record<string, unknown>> {
  const product = await readRequiredDocument(db, "products", productId, "PRODUCT_NOT_FOUND");
  const status = fieldString(product, "status") ?? "";

  if (!["active", "approved"].includes(status)) {
    throw new QrCreateHttpError("PRODUCT_NOT_ACTIVE", "Product is not active or approved.", 409, {
      productId,
      status,
    });
  }

  return product;
}

async function readOptionForCart(db: Firestore, productId: string, optionId: string): Promise<Record<string, unknown>> {
  const direct = await db.collection("product_options").doc(optionId).get();
  let option = direct.exists ? asRecord(direct.data()) : undefined;

  if (!option) {
    const snapshot = await db
      .collection("product_options")
      .where("product_id", "==", productId)
      .where("option_id", "==", optionId)
      .limit(1)
      .get();
    option = snapshot.docs[0]?.data();
  }

  if (!option) {
    throw new QrCreateHttpError("OPTION_NOT_FOUND", "Product option was not found.", 404, { productId, optionId });
  }

  const optionProductId = fieldString(option, "product_id", "productId");

  if (optionProductId && optionProductId !== productId) {
    throw new QrCreateHttpError("OPTION_NOT_FOUND", "Product option does not belong to the requested product.", 404, {
      productId,
      optionId,
      optionProductId,
    });
  }

  return option;
}

async function readRequiredDocument(
  db: Firestore,
  collectionName: string,
  documentId: string,
  errorCode: string,
): Promise<Record<string, unknown>> {
  const snapshot = await db.collection(collectionName).doc(documentId).get();

  if (!snapshot.exists) {
    throw new QrCreateHttpError(errorCode, `${collectionName}/${documentId} was not found.`, 404, {
      collectionName,
      documentId,
    });
  }

  return asRecord(snapshot.data());
}

async function resolveShortCode(db: Firestore, requestedShortCode: string | undefined, now: Date): Promise<string> {
  if (requestedShortCode) {
    if (await shortCodeExists(db, requestedShortCode)) {
      throw new QrCreateHttpError("QR_SHORT_CODE_COLLISION", "Requested short code already exists.", 409, {
        shortCode: requestedShortCode,
      });
    }

    return requestedShortCode;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = makeShortCode("SANHO", new Date(now.getTime() + attempt));
    if (!(await shortCodeExists(db, candidate))) return candidate;
  }

  throw new QrCreateHttpError("QR_SHORT_CODE_COLLISION", "Could not allocate unique QR short code after 3 attempts.", 409);
}

async function shortCodeExists(db: Firestore, shortCode: string): Promise<boolean> {
  const snapshot = await db.collection("qr_payment_sessions").where("short_code", "==", shortCode).limit(1).get();
  return !snapshot.empty;
}

function resolveProductPrice(product: Record<string, unknown>): number {
  const comparison = asRecord(product.comparison);
  const price =
    fieldNumber(product, "closed_mall_price", "closedMallPrice", "price") ??
    fieldNumber(comparison, "closedMallPrice", "closed_mall_price");

  if (typeof price !== "number" || price < 0) {
    throw new QrCreateHttpError("PRODUCT_NOT_FOUND", "Product price is missing for QR server recalculation.", 409, {
      productId: fieldString(product, "product_id", "productId", "id"),
    });
  }

  return price;
}

function readClientAmount(body: Partial<QrCreateRequest>): number | undefined {
  if (typeof body.clientAmount === "number" && Number.isFinite(body.clientAmount)) return body.clientAmount;

  const legacyHint = (body as { totalAmountHint?: unknown }).totalAmountHint;
  if (typeof legacyHint === "number" && Number.isFinite(legacyHint)) return legacyHint;

  return undefined;
}

function buildCustomerUrl(request: HttpRequestLike, path: string): string {
  const configuredBase = (process.env.NEXT_PUBLIC_A5_PUBLIC_BASE_URL || process.env.A5_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const inferredBase = inferOriginFromRequest(request);
  const base = configuredBase || inferredBase || defaultA5PublicOrigin;

  return base ? `${base}${path}` : path;
}

function inferOriginFromRequest(request: HttpRequestLike): string {
  const origin = request.get?.("origin");
  if (origin) return origin.replace(/\/$/, "");

  const referer = request.get?.("referer");
  if (!referer) return "";

  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function fieldString(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return undefined;
}

function fieldNumber(data: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }

  return undefined;
}

function normalizeQrStatus(value: string): QrSessionValidationInput["status"] {
  return value === "paid" || value === "expired" || value === "cancelled" ? value : "active";
}

function toSnapshotItem(item: ReturnType<typeof normalizeCartItems>[number]) {
  return {
    product_id: item.productId,
    option_id: item.optionId ?? null,
    product_name: item.productName,
    option_name: item.optionName,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    company_id: item.companyId,
    line_amount: item.unitPrice * item.quantity,
    source: "firestore_products",
  };
}

function toClientCartItem(item: ReturnType<typeof normalizeCartItems>[number]) {
  return {
    productId: item.productId,
    optionId: item.optionId,
    productName: item.productName,
    optionName: item.optionName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    companyId: item.companyId,
  };
}

function toPublicQrSession(documentId: string, data: Record<string, unknown>) {
  const items = normalizeCartItems(data.items_snapshot ?? data.items ?? data.itemsSnapshot);
  const pickupLocation = normalizePickupLocation(data.pickup_location ?? data.pickupLocation, {
    nurseryId: fieldString(data, "nursery_id", "nurseryId") ?? "",
    roomId: fieldString(data, "room_id", "roomId") ?? "",
  });

  return {
    id: fieldString(data, "id", "qr_session_id", "qrSessionId") ?? documentId,
    shortCode: fieldString(data, "short_code", "shortCode") ?? documentId,
    type: data.type === "ask" ? "ask" : "purchase",
    status: normalizeQrStatus(String(data.status ?? "active")),
    nurseryId: fieldString(data, "nursery_id", "nurseryId") ?? "",
    roomId: fieldString(data, "room_id", "roomId") ?? "",
    tabletId: fieldString(data, "tablet_id", "tabletId") ?? "",
    cartId: fieldString(data, "cart_id", "cartId") ?? "",
    createdAt: toIsoString(data.created_at ?? data.createdAt) ?? new Date().toISOString(),
    expiresAt: toIsoString(data.expires_at ?? data.expiresAt) ?? new Date().toISOString(),
    deliveryMethod: data.delivery_method === "delivery" || data.deliveryMethod === "delivery" ? "delivery" : "pickup",
    totalAmount: fieldNumber(data, "total_amount_snapshot", "totalAmount", "total_amount") ?? calculateItemsAmount(items),
    items: items.map(toClientCartItem),
    pickupLocation,
  };
}

function normalizePickupLocation(value: unknown, fallback: { nurseryId: string; roomId: string }) {
  const data = asRecord(value);
  const nurseryName = fieldString(data, "nurseryName", "nursery_name") ?? fallback.nurseryId;
  const nurseryAddress = fieldString(data, "nurseryAddress", "nursery_address") ?? "";
  const roomId = fieldString(data, "roomId", "room_id") ?? fallback.roomId;
  const roomName = fieldString(data, "roomName", "room_name") ?? fallback.roomId;

  if (!nurseryAddress || !roomName) return null;

  return {
    nurseryName,
    nursery_name: nurseryName,
    nurseryAddress,
    nursery_address: nurseryAddress,
    roomId,
    room_id: roomId,
    roomName,
    room_name: roomName,
  };
}

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const maybeTimestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().toISOString();
    if (typeof maybeTimestamp.seconds === "number") return new Date(maybeTimestamp.seconds * 1000).toISOString();
  }

  return undefined;
}

function optionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function resolveRoomNumber(roomId: string, pickupLocation: unknown): string {
  const pickup = asRecord(pickupLocation);
  const fromPickup = fieldString(pickup, "roomName", "room_name", "roomId", "room_id") ?? "";
  const fromRoomId = roomId.replace(/^room-/i, "");
  return (fromPickup || fromRoomId).replace(/[^0-9A-Za-z가-힣]/g, "");
}

function toDocumentSegment(value: string): string {
  return value
    .trim()
    .replace(/[^0-9A-Za-z가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferRoomFloor(roomNumber: string): string {
  const digits = roomNumber.replace(/[^0-9]/g, "");
  return digits.length >= 3 ? `${digits.slice(0, -2)}F` : "";
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
