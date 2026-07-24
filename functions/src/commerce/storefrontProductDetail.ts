import { getAdminDb } from "../firebaseAdmin";
import {
  readObjectBody,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
} from "../payments/types";
import {
  isApprovedPublicProduct,
  readApprovedCompanyIds,
  toPublicStorefrontProduct,
  toPublicStorefrontProductOption,
} from "./publicStorefrontProduct";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function storefrontProductDetailHandler(
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

  const body = readObjectBody<{ productId?: string }>(request);
  const productId = text(request.query?.productId ?? body.productId);
  if (!productId || productId.length > 200) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "PRODUCT_INPUT_INVALID", message: "A valid productId is required.", httpStatus: 400 },
    });
    return;
  }

  try {
    const db = getAdminDb();
    const productSnapshot = await db.collection("products").doc(productId).get();
    const data = productSnapshot.data() as Record<string, unknown> | undefined;
    if (
      !productSnapshot.exists ||
      !data ||
      !["active", "approved"].includes(String(data.status ?? "")) ||
      !isApprovedPublicProduct(data, await readApprovedCompanyIds(db))
    ) {
      sendJson(response, 404, {
        ok: false,
        error: { code: "PRODUCT_NOT_FOUND", message: "Product was not found.", httpStatus: 404 },
      });
      return;
    }

    const optionSnapshot = await db
      .collection("product_options")
      .where("product_id", "==", productId)
      .limit(50)
      .get();
    sendJson(response, 200, {
      ok: true,
      product: toPublicStorefrontProduct(productSnapshot.id, data),
      options: optionSnapshot.docs.map((document) =>
        toPublicStorefrontProductOption(
          document.id,
          document.data() as Record<string, unknown>,
        ),
      ),
      source: "firebase_functions_public_storefront_product_detail",
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "STOREFRONT_PRODUCT_DETAIL_FAILED",
        message: error instanceof Error ? error.message : "Product detail read failed.",
        httpStatus: 500,
      },
    });
  }
}
