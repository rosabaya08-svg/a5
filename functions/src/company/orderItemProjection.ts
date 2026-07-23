import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { readSellerContactSnapshot, sellerContactDocument } from "./sellerContact";

type FirestoreCreateEvent = {
  params?: Record<string, string>;
  data?: { data(): Record<string, unknown> };
};

export async function companyOrderItemCreatedProjectionHandler(event: FirestoreCreateEvent) {
  const itemId = event.params?.itemId ?? "";
  const itemData = event.data?.data() ?? {};
  const orderNo = text(itemData.order_no ?? itemData.orderNo ?? itemData.order_id);
  const companyId = text(itemData.company_id ?? itemData.companyId ?? itemData.seller_company_id);
  if (!itemId || !orderNo || !companyId) return;

  const db = getAdminDb();
  const contact = await readSellerContactSnapshot(db, companyId);
  const contactDocument = sellerContactDocument(contact);
  const itemRef = db.collection("order_items").doc(itemId);
  const orderRef = db.collection("orders").doc(orderNo);
  const auditRef = db.collection("audit_logs").doc();
  const now = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    const existingContacts = orderSnapshot.exists && Array.isArray(orderSnapshot.get("seller_contacts_snapshot"))
      ? orderSnapshot.get("seller_contacts_snapshot") as Array<Record<string, unknown>>
      : [];
    const mergedContacts = [
      ...existingContacts.filter((value) => text(value.company_id ?? value.companyId) !== companyId),
      contactDocument,
    ];

    transaction.set(itemRef, {
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
      seller_contact_snapshot: contactDocument,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(orderRef, {
      seller_contacts_snapshot: mergedContacts,
      seller_contact_snapshot_version: 1,
      seller_contact_snapshot_updated_at: now,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(auditRef, {
      action: "order_item_seller_contact_snapshot_created",
      target: itemId,
      order_no: orderNo,
      company_id: companyId,
      contact_verified: contact.verified,
      created_at: now,
      updated_at: FieldValue.serverTimestamp(),
    });
  });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
