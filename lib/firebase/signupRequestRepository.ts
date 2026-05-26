import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

export type CompanySignupRequestPayload = {
  id: string;
  companyName: string;
  businessRegistrationNumber: string;
  representativeName: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  commerceLicenseNo: string;
  csPhone: string;
  returnAddress: string;
  documentNames: string[];
  status: "pending_review";
  createdAt: string;
  updatedAt: string;
};

export async function saveCompanySignupRequest(payload: CompanySignupRequestPayload) {
  const db = getFirebaseDb();

  if (!db) {
    return { mode: "local" as const, message: "Firestore config is missing." };
  }

  await setDoc(
    doc(db, "company_signup_requests", payload.id),
    {
      ...payload,
      business_registration_number: payload.businessRegistrationNumber,
      representative_name: payload.representativeName,
      manager_name: payload.managerName,
      manager_phone: payload.managerPhone,
      manager_email: payload.managerEmail,
      commerce_license_no: payload.commerceLicenseNo,
      cs_phone: payload.csPhone,
      return_address: payload.returnAddress,
      document_names: payload.documentNames,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );

  return { mode: "firestore" as const, message: "Signup request saved." };
}
