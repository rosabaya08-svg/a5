import { getAdminDb } from "../firebaseAdmin";
import { sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import {
  isApprovedPublicProduct,
  readApprovedCompanyIds,
  toPublicStorefrontProduct,
} from "./publicStorefrontProduct";

export async function storefrontProductsHandler(
  request: HttpRequestLike,
  response: HttpResponseLike,
): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST.", httpStatus: 405 },
    });
    return;
  }

  try {
    const db = getAdminDb();
    const approvedCompanyIds = await readApprovedCompanyIds(db);
    const snapshot = await db
      .collection("products")
      .where("status", "in", ["active", "approved"])
      .limit(1000)
      .get();
    const products = snapshot.docs
      .filter((document) =>
        isApprovedPublicProduct(document.data() as Record<string, unknown>, approvedCompanyIds),
      )
      .map((document) =>
        toPublicStorefrontProduct(document.id, document.data() as Record<string, unknown>),
      )
      .sort((left, right) =>
        [left.category, left.brand, left.name, left.id]
          .join("|")
          .localeCompare([right.category, right.brand, right.name, right.id].join("|"), "ko-KR"),
      );

    sendJson(response, 200, {
      ok: true,
      products,
      source: "firebase_functions_public_storefront_products",
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "STOREFRONT_PRODUCTS_FAILED",
        message: error instanceof Error ? error.message : "Product list read failed.",
        httpStatus: 500,
      },
    });
  }
}
