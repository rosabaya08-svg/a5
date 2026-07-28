import { FieldValue } from "firebase-admin/firestore";
import { canWriteCompanyScope, type A5AuthClaims } from "../auth/verifyClaims";
import { publishStorefrontRuntimeSnapshot } from "../commerce/storefrontSnapshot";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type CompanyProductLifecycleAction = "suspend" | "archive" | "restore";

type CompanyProductLifecycleRequest = {
  productId?: string;
  action?: CompanyProductLifecycleAction;
  reason?: string;
};

export async function companyProductLifecycleHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<CompanyProductLifecycleRequest>(request);
  const productId = text(body.productId);
  const action = body.action;
  const reason = text(body.reason);
  if (!productId || !isLifecycleAction(action)) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "COMPANY_PRODUCT_LIFECYCLE_REQUEST_INVALID", message: "productId and action are required." },
    });
    return;
  }

  const token = authorizationToken(request);
  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: { code: "COMPANY_PRODUCT_LIFECYCLE_AUTH_REQUIRED", message: "Firebase ID token is required." },
    });
    return;
  }

  const claims = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!claims) {
    sendJson(response, 403, {
      ok: false,
      error: { code: "COMPANY_PRODUCT_LIFECYCLE_FORBIDDEN", message: "The signed-in account cannot manage this product." },
    });
    return;
  }

  const db = getAdminDb();
  const productRef = db.collection("products").doc(productId);
  const productSnapshot = await productRef.get();
  if (!productSnapshot.exists) {
    sendJson(response, 404, {
      ok: false,
      error: { code: "COMPANY_PRODUCT_NOT_FOUND", message: "Product not found." },
    });
    return;
  }

  const product = productSnapshot.data() ?? {};
  const companyId = text(product.company_id ?? product.companyId ?? product.seller_company_id ?? product.sellerCompanyId);
  if (!companyId || !canWriteCompanyScope(claims as A5AuthClaims, companyId)) {
    sendJson(response, 403, {
      ok: false,
      error: { code: "COMPANY_PRODUCT_LIFECYCLE_SCOPE_MISMATCH", message: "The signed-in company account cannot manage this product." },
    });
    return;
  }

  const detailRef = db.collection("product_detail_pages").doc(productId);
  const supplyRef = db.collection("product_supply_profiles").doc(productId);
  const [detailSnapshot, supplySnapshot, optionSnapshot] = await Promise.all([
    detailRef.get(),
    supplyRef.get(),
    db.collection("product_options").where("product_id", "==", productId).get(),
  ]);
  const now = new Date().toISOString();
  const nextStatus = action === "archive" ? "archived" : action === "suspend" ? "paused" : "active";
  const nextRelatedStatus = action === "archive" ? "archived" : action === "suspend" ? "suspended" : "active";
  const nextModerationStatus = action === "restore" ? "registered" : action === "archive" ? "archived" : "restricted";
  const lifecycleFields = {
    lifecycle_action: action,
    lifecycle_reason: reason,
    lifecycle_changed_at_iso: now,
    lifecycle_changed_by_uid: claims.uid,
    archived_at_iso: action === "archive" ? now : null,
    deleted_at_iso: action === "archive" ? now : null,
    restored_at_iso: action === "restore" ? now : null,
    updated_at_iso: now,
    updated_at: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(productRef, {
    ...lifecycleFields,
    status: nextStatus,
    moderation_status: nextModerationStatus,
  }, { merge: true });
  if (detailSnapshot.exists) {
    batch.set(detailRef, {
      ...lifecycleFields,
      status: nextStatus,
      moderation_status: nextModerationStatus,
    }, { merge: true });
  }
  if (supplySnapshot.exists) {
    batch.set(supplyRef, { ...lifecycleFields, status: nextRelatedStatus }, { merge: true });
  }
  for (const option of optionSnapshot.docs) {
    batch.set(option.ref, {
      ...lifecycleFields,
      status: nextRelatedStatus,
      moderation_status: nextModerationStatus,
    }, { merge: true });
  }
  batch.set(db.collection("audit_logs").doc(`company-product-lifecycle-${productId}-${Date.now()}`), {
    type: "company_product_lifecycle",
    action,
    product_id: productId,
    company_id: companyId,
    previous_status: text(product.status, "unknown"),
    next_status: nextStatus,
    reason,
    actor_uid: claims.uid,
    option_count: optionSnapshot.size,
    created_at: FieldValue.serverTimestamp(),
  });

  try {
    await batch.commit();
    const snapshot = await publishStorefrontRuntimeSnapshot(db, `company_product_lifecycle:${action}:${productId}`);
    sendJson(response, 200, {
      ok: true,
      productId,
      companyId,
      action,
      status: nextStatus,
      snapshotPublished: true,
      snapshotVersion: snapshot.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product lifecycle update failed.";
    sendJson(response, 500, {
      ok: false,
      error: { code: "COMPANY_PRODUCT_LIFECYCLE_FAILED", message },
    });
  }
}

function authorizationToken(request: HttpRequestLike) {
  const header = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function isLifecycleAction(value: unknown): value is CompanyProductLifecycleAction {
  return value === "suspend" || value === "archive" || value === "restore";
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
