import type { Firestore } from "firebase-admin/firestore";

export type SellerContactSnapshot = {
  companyId: string;
  companyName: string;
  businessNo: string;
  representativeName: string;
  customerServicePhone: string;
  publicEmail: string;
  ecommerceLicenseNo: string;
  returnAddress: string;
  verified: boolean;
};

export async function readSellerContactSnapshot(db: Firestore, companyId: string): Promise<SellerContactSnapshot> {
  const direct = await db.collection("companies").doc(companyId).get();
  let data = direct.data() ?? {};

  if (!direct.exists) {
    const fallback = await db.collection("companies").where("company_id", "==", companyId).limit(1).get();
    data = fallback.docs[0]?.data() ?? {};
  }

  const companyName = pickText(data, ["company_name", "companyName", "name", "business_name", "businessName"]);
  const businessNo = digits(pickText(data, [
    "business_registration_number",
    "businessRegistrationNumber",
    "business_no",
    "businessNo",
  ]));
  const representativeName = pickText(data, ["representative_name", "representativeName", "ceo_name", "ceoName"]);
  const customerServicePhone = pickText(data, [
    "public_contact_phone",
    "publicContactPhone",
    "customer_service_phone",
    "customerServicePhone",
    "cs_phone",
    "csPhone",
    "contact_phone",
    "contactPhone",
  ]);
  const publicEmail = pickText(data, ["public_email", "publicEmail", "customer_service_email", "customerServiceEmail"]);
  const ecommerceLicenseNo = pickText(data, [
    "ecommerce_license_no",
    "ecommerceLicenseNo",
    "mail_order_business_number",
    "mailOrderBusinessNumber",
  ]);
  const returnAddress = pickText(data, ["return_address", "returnAddress"]);

  return {
    companyId,
    companyName,
    businessNo,
    representativeName,
    customerServicePhone,
    publicEmail,
    ecommerceLicenseNo,
    returnAddress,
    verified: Boolean(companyName && businessNo && customerServicePhone),
  };
}

export function sellerContactDocument(snapshot: SellerContactSnapshot) {
  return {
    company_id: snapshot.companyId,
    company_name: snapshot.companyName || null,
    business_no: snapshot.businessNo || null,
    representative_name: snapshot.representativeName || null,
    customer_service_phone: snapshot.customerServicePhone || null,
    public_email: snapshot.publicEmail || null,
    ecommerce_license_no: snapshot.ecommerceLicenseNo || null,
    return_address: snapshot.returnAddress || null,
    verified: snapshot.verified,
  };
}

function pickText(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = String(data[key] ?? "").trim();
    if (value && !/^[-?]+$/.test(value)) return value;
  }
  return "";
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}
