import process from "node:process";

const token = String(process.env.FIRESTORE_ACCESS_TOKEN || "").trim();
const companyId = String(process.argv[2] || "").trim();
if (!token || !companyId) throw new Error("FIRESTORE_ACCESS_TOKEN and companyId are required.");

const url = `https://firestore.googleapis.com/v1/projects/a5-closed-mall/databases/(default)/documents/companies/${encodeURIComponent(companyId)}`;
const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!response.ok) throw new Error(`Company read failed: HTTP ${response.status}`);
const fields = (await response.json()).fields || {};

const text = (...keys) => {
  for (const key of keys) {
    const value = String(fields[key]?.stringValue ?? "").trim();
    if (value && !/^[-?]+$/.test(value)) return value;
  }
  return "";
};
const companyName = text("company_name", "companyName", "name", "business_name", "businessName");
const businessNo = text("business_registration_number", "businessRegistrationNumber", "business_no", "businessNo").replace(/\D/g, "");
const representative = text("representative_name", "representativeName", "ceo_name", "ceoName");
const publicPhone = text("public_contact_phone", "publicContactPhone", "customer_service_phone", "customerServicePhone", "cs_phone", "csPhone", "contact_phone", "contactPhone");
const publicEmail = text("public_email", "publicEmail", "customer_service_email", "customerServiceEmail");
const returnAddress = text("return_address", "returnAddress");

console.log(JSON.stringify({
  companyId,
  companyDocumentExists: true,
  companyNamePresent: Boolean(companyName),
  businessNoPresent: Boolean(businessNo),
  representativePresent: Boolean(representative),
  publicPhonePresent: Boolean(publicPhone),
  publicEmailPresent: Boolean(publicEmail),
  returnAddressPresent: Boolean(returnAddress),
  verifiedForOrderSnapshot: Boolean(companyName && businessNo && publicPhone),
  personalDataPrinted: 0,
}, null, 2));
