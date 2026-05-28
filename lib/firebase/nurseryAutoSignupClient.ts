import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { normalizeBusinessNo } from "@/lib/auth/session";
import { ensureAnonymousFirebaseUser, getFirebaseDb } from "@/lib/firebase/client";
import {
  buildNurseryProfileFromCmsRecord,
  type NurseryAutoSignupProfile,
} from "@/lib/nursery/nurseryAutoSignup";

async function readFirstLinkedNurseryProfile(collectionName: "nursery_auto_signup_profiles" | "nurseries", field: string, value: string) {
  const db = getFirebaseDb();
  if (!db || !value) return null;

  const snapshot = await getDocs(query(collection(db, collectionName), where(field, "==", value), limit(1)));
  const document = snapshot.docs[0];
  return document ? buildNurseryProfileFromCmsRecord({ id: document.id, ...document.data() }) : null;
}

export async function readLinkedNurseryProfileByBusinessNo(
  businessRegistrationNo: string,
): Promise<NurseryAutoSignupProfile | null> {
  if (typeof window === "undefined") return null;

  const normalized = normalizeBusinessNo(businessRegistrationNo);
  if (!normalized) return null;

  try {
    await ensureAnonymousFirebaseUser();
    return (
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "business_registration_no_normalized", normalized)) ??
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "businessRegistrationNoNormalized", normalized)) ??
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "business_registration_no", businessRegistrationNo.trim())) ??
      (await readFirstLinkedNurseryProfile("nursery_auto_signup_profiles", "businessRegistrationNo", businessRegistrationNo.trim())) ??
      (await readFirstLinkedNurseryProfile("nurseries", "business_registration_no_normalized", normalized)) ??
      (await readFirstLinkedNurseryProfile("nurseries", "businessRegistrationNoNormalized", normalized)) ??
      (await readFirstLinkedNurseryProfile("nurseries", "business_registration_no", businessRegistrationNo.trim())) ??
      (await readFirstLinkedNurseryProfile("nurseries", "businessRegistrationNo", businessRegistrationNo.trim()))
    );
  } catch {
    return null;
  }
}
