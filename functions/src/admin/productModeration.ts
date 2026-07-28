import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { publishStorefrontRuntimeSnapshot } from "../commerce/storefrontSnapshot";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type ProductModerationAction = "suspend" | "restore";

type ProductModerationRequest = {
  productId?: string;
  action?: ProductModerationAction;
  reason?: string;
};

type AdminActor = {
  uid: string;
  email: string;
  role: string;
};

const masterAdminEmail = "rosabaya08@gmail.com";

export async function adminProductModerationHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const actor = await requireSuperAdmin(request, response);
  if (!actor) return;

  const body = readObjectBody<ProductModerationRequest>(request);
  const productId = text(body.productId);
  const action = body.action;
  const reason = text(body.reason);

  if (!productId || !isProductModerationAction(action)) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "ADMIN_PRODUCT_MODERATION_REQUEST_INVALID",
        message: "productId and action are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const productRef = db.collection("products").doc(productId);
  const moderatedAt = new Date().toISOString();

  try {
    const productSnapshot = await productRef.get();

    if (!productSnapshot.exists) {
      sendJson(response, 404, {
        ok: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Product was not found.",
          httpStatus: 404,
        },
      });
      return;
    }

    const product = productSnapshot.data() ?? {};
    const companyId = text(product.company_id ?? product.companyId);
    const nextStatus = action === "suspend" ? "suspended" : "active";
    const nextModerationStatus = action === "suspend" ? "restricted" : "registered";
    const optionSnapshot = await db.collection("product_options").where("product_id", "==", productId).get();
    const batch = db.batch();

    batch.set(
      productRef,
      cleanRecord({
        status: nextStatus,
        moderation_status: nextModerationStatus,
        suspension_reason: action === "suspend" ? reason : "",
        restored_reason: action === "restore" ? reason : "",
        suspended_at: action === "suspend" ? moderatedAt : undefined,
        restored_at: action === "restore" ? moderatedAt : undefined,
        moderated_at: moderatedAt,
        moderated_by_uid: actor.uid,
        moderated_by_email: actor.email,
        source_app: "admin",
        source_channel: "admin_product_moderation",
        updated_at: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

    for (const option of optionSnapshot.docs) {
      batch.set(
        option.ref,
        cleanRecord({
          status: nextStatus,
          moderation_status: nextModerationStatus,
          moderated_at: moderatedAt,
          moderated_by_uid: actor.uid,
          moderated_by_email: actor.email,
          source_app: "admin",
          source_channel: "admin_product_moderation",
          updated_at: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
    }

    batch.set(db.collection("product_moderation_logs").doc(`product-moderation-${productId}-${Date.now()}`), {
      type: "admin_product_moderation",
      action,
      product_id: productId,
      company_id: companyId,
      previous_status: text(product.status) || "unknown",
      next_status: nextStatus,
      reason,
      option_count: optionSnapshot.size,
      actor_uid: actor.uid,
      actor_email: actor.email,
      actor_role: actor.role,
      created_at: FieldValue.serverTimestamp(),
    });

    batch.set(db.collection("audit_logs").doc(`admin-product-moderation-${productId}-${Date.now()}`), {
      type: "admin_product_moderation",
      action,
      product_id: productId,
      company_id: companyId,
      actor_uid: actor.uid,
      actor_email: actor.email,
      actor_role: actor.role,
      reason,
      written_collections: ["products", "product_options", "product_moderation_logs"],
      created_at: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    const snapshotPublish = await publishSnapshotAfterProductModeration(db, productId, action);

    sendJson(response, 200, {
      ok: true,
      productId,
      companyId,
      action,
      status: nextStatus,
      moderationStatus: nextModerationStatus,
      optionCount: optionSnapshot.size,
      moderatedAt,
      snapshotPublish,
      source: "firebase_functions",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product moderation failed.";
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "ADMIN_PRODUCT_MODERATION_FAILED",
        message,
        httpStatus: 500,
      },
    });
  }
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<AdminActor | null> {
  const header = request.get?.("authorization") || request.get?.("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "ADMIN_AUTH_REQUIRED",
        message: "Firebase ID token is required.",
        httpStatus: 401,
      },
    });
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const email = text(decoded.email).toLowerCase();
    const role = text(decoded.role ?? decoded.adminRole ?? decoded.user_role).toUpperCase();
    const allowed = email === masterAdminEmail || role === "SUPER_ADMIN" || role === "SEED_ADMIN";

    if (!allowed) {
      sendJson(response, 403, {
        ok: false,
        error: {
          code: "ADMIN_PERMISSION_DENIED",
          message: "Super admin permission is required.",
          httpStatus: 403,
        },
      });
      return null;
    }

    return {
      uid: decoded.uid,
      email,
      role: role || "SUPER_ADMIN",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Firebase ID token.";
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "ADMIN_TOKEN_INVALID",
        message,
        httpStatus: 401,
      },
    });
    return null;
  }
}

async function publishSnapshotAfterProductModeration(db: Firestore, productId: string, action: ProductModerationAction) {
  try {
    const snapshot = await publishStorefrontRuntimeSnapshot(db, `admin_product_moderation:${action}:${productId}`);

    return {
      ok: true,
      snapshotId: snapshot.id,
      version: snapshot.version,
      generatedAt: snapshot.generatedAt,
      productCount: snapshot.products.length,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Storefront runtime snapshot publish failed.",
    };
  }
}

function isProductModerationAction(value: unknown): value is ProductModerationAction {
  return value === "suspend" || value === "restore";
}

function cleanRecord(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
