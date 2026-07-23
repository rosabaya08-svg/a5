import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { readSellerContactSnapshot, sellerContactDocument } from "./sellerContact";

type FirestoreCreateEvent = {
  params?: Record<string, string>;
  data?: {
    data(): Record<string, unknown>;
    ref: {
      set(data: Record<string, unknown>, options?: { merge: boolean }): Promise<unknown>;
    };
  };
};

export async function companyOrderCreatedProjectionHandler(event: FirestoreCreateEvent) {
  const orderNo = event.params?.orderId ?? "";
  const snapshot = event.data;
  if (!orderNo || !snapshot) return;

  const db = getAdminDb();
  const orderData = snapshot.data();
  const orderItems = await db.collection("order_items").where("order_no", "==", orderNo).get();
  const companyIds = [...new Set(
    orderItems.docs
      .map((doc) => text(doc.get("company_id") ?? doc.get("companyId") ?? doc.get("seller_company_id")))
      .filter(Boolean),
  )];

  if (!companyIds.length) {
    const rootCompanyId = text(orderData.company_id ?? orderData.companyId);
    if (rootCompanyId) companyIds.push(rootCompanyId);
  }

  const contacts = await Promise.all(companyIds.map((companyId) => readSellerContactSnapshot(db, companyId)));
  const contactsByCompany = new Map(contacts.map((contact) => [contact.companyId, contact]));
  const batch = db.batch();

  for (const item of orderItems.docs) {
    const companyId = text(item.get("company_id") ?? item.get("companyId") ?? item.get("seller_company_id"));
    const contact = contactsByCompany.get(companyId);
    if (!contact) continue;

    batch.set(item.ref, {
      seller_company_id: companyId,
      seller_company_name: contact.companyName || null,
      seller_business_no: contact.businessNo || null,
      seller_business_no_normalized: contact.businessNo || null,
      seller_representative_name: contact.representativeName || null,
      seller_customer_service_phone: contact.customerServicePhone || null,
      seller_public_email: contact.publicEmail || null,
      seller_ecommerce_license_no: contact.ecommerceLicenseNo || null,
      seller_return_address: contact.returnAddress || null,
      seller_contact_verified: contact.verified,
      seller_contact_snapshot: sellerContactDocument(contact),
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  const itemSnapshots = Array.isArray(orderData.items_snapshot)
    ? orderData.items_snapshot.map((value) => {
        const item = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
        const companyId = text(item.company_id ?? item.companyId ?? item.seller_company_id);
        const contact = contactsByCompany.get(companyId);
        return contact
          ? {
              ...item,
              seller_company_id: companyId,
              seller_company_name: contact.companyName || null,
              seller_business_no: contact.businessNo || null,
              seller_representative_name: contact.representativeName || null,
              seller_customer_service_phone: contact.customerServicePhone || null,
              seller_public_email: contact.publicEmail || null,
              seller_return_address: contact.returnAddress || null,
            }
          : item;
      })
    : [];

  batch.set(db.collection("orders").doc(orderNo), {
    items_snapshot: itemSnapshots,
    seller_contacts_snapshot: contacts.map(sellerContactDocument),
    seller_contact_snapshot_version: 1,
    seller_contact_snapshot_created_at: new Date().toISOString(),
    updated_at: FieldValue.serverTimestamp(),
  }, { merge: true });

  batch.set(db.collection("audit_logs").doc(), {
    action: "order_seller_contact_snapshot_created",
    target: orderNo,
    company_ids: companyIds,
    contact_count: contacts.length,
    source: "company_order_created_projection",
    created_at: new Date().toISOString(),
    updated_at: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
