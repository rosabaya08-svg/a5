import { readPublicStorefrontProducts } from "../guestShop/session";
import { sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

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
    const products = await readPublicStorefrontProducts(1000);
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
