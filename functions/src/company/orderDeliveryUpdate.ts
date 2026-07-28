import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type DeliveryUpdateRequest = {
  companyId?: string;
  orderItemId?: string;
  orderNo?: string;
  deliveryStatus?: string;
  carrierCode?: string;
  invoiceNumber?: string;
};

const allowedDeliveryStatuses = new Set(["invoice_pending", "invoice_entered", "in_transit", "delivered", "pickup_ready", "picked_up"]);

export async function companyOrderDeliveryUpdateHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<DeliveryUpdateRequest>(request);
  const companyId = text(body.companyId);
  const orderItemId = text(body.orderItemId);
  const requestedStatus = text(body.deliveryStatus);

  if (!companyId || !orderItemId || !allowedDeliveryStatuses.has(requestedStatus)) {
    sendJson(response, 400, {
      ok: false,
      resultCode: 400,
      resultMsg: "companyId, orderItemId, and valid deliveryStatus are required.",
    });
    return;
  }

  const token = authorizationToken(request);
  if (!token) {
    sendJson(response, 401, {
      ok: false,
      resultCode: 401,
      resultMsg: "Firebase ID token is required.",
    });
    return;
  }

  const claims = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!claims || !canUpdateCompany(claims as Record<string, unknown>, companyId)) {
    sendJson(response, 403, {
      ok: false,
      resultCode: 403,
      resultMsg: "The signed-in company account cannot update this order item.",
    });
    return;
  }

  const db = getAdminDb();
  const orderItemRef = db.collection("order_items").doc(orderItemId);
  const orderItemSnapshot = await orderItemRef.get();

  if (!orderItemSnapshot.exists) {
    sendJson(response, 404, {
      ok: false,
      resultCode: 404,
      resultMsg: "Order item was not found.",
    });
    return;
  }

  const orderItem = orderItemSnapshot.data() ?? {};
  const orderItemCompanyId = text(orderItem.company_id ?? orderItem.companyId);
  if (orderItemCompanyId !== companyId) {
    sendJson(response, 403, {
      ok: false,
      resultCode: 403,
      resultMsg: "Order item company scope mismatch.",
    });
    return;
  }

  const orderNo = text(body.orderNo) || text(orderItem.order_no ?? orderItem.orderNo ?? orderItem.order_id);
  const carrierCode = text(body.carrierCode);
  const invoiceNumber = text(body.invoiceNumber);
  const now = new Date().toISOString();
  const orderUpdate = orderStatusPatch(requestedStatus);
  const shipmentPatch = carrierCode || invoiceNumber
    ? {
        carrier_code: carrierCode || null,
        carrierCode: carrierCode || null,
        invoice_no: invoiceNumber || null,
        invoiceNo: invoiceNumber || null,
        sheet_no: invoiceNumber || null,
      }
    : {};

  await db.runTransaction(async (transaction) => {
    transaction.set(
      orderItemRef,
      {
        ...shipmentPatch,
        delivery_status: requestedStatus,
        deliveryStatus: requestedStatus,
        delivery_updated_at: now,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (orderNo) {
      transaction.set(
        db.collection("orders").doc(orderNo),
        {
          ...orderUpdate,
          delivery_updated_at: now,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  sendJson(response, 200, {
    ok: true,
    companyId,
    orderItemId,
    orderNo,
    deliveryStatus: requestedStatus,
  });
}

function authorizationToken(request: HttpRequestLike) {
  const header = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function canUpdateCompany(claims: Record<string, unknown>, companyId: string) {
  if (claims.role === "SUPER_ADMIN" || claims.role === "seed_admin" || claims.seed_admin === true) return true;
  return claims.role === "COMPANY_ADMIN" && claims.company_id === companyId;
}

function orderStatusPatch(deliveryStatus: string) {
  if (deliveryStatus === "picked_up") return { status: "picked_up", delivery_status: "picked_up", deliveryStatus: "picked_up" };
  if (deliveryStatus === "pickup_ready") return { status: "ready_for_pickup", delivery_status: "pickup_ready", deliveryStatus: "pickup_ready" };
  if (deliveryStatus === "delivered") return { status: "delivered", delivery_status: "delivered", deliveryStatus: "delivered" };
  if (deliveryStatus === "in_transit") return { status: "shipping", delivery_status: "in_transit", deliveryStatus: "in_transit" };
  if (deliveryStatus === "invoice_entered") return { status: "shipping", delivery_status: "invoice_entered", deliveryStatus: "invoice_entered" };
  return { delivery_status: deliveryStatus, deliveryStatus };
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
