import { getAdminAuth } from "../firebaseAdmin";
import { assertCanSetClaims, type A5AuthClaims } from "./verifyClaims";

export type SetCustomClaimsInput = {
  requesterClaims: A5AuthClaims;
  uid: string;
  claims: A5AuthClaims;
};

export type SetCustomClaimsResult = {
  ok: true;
  uid: string;
  claims: A5AuthClaims;
  plainPasswordStored: false;
  auditAction: "auth.custom_claims.set";
};

export async function setCustomClaimsSkeleton(input: SetCustomClaimsInput): Promise<SetCustomClaimsResult> {
  assertCanSetClaims(input.requesterClaims, input.claims);

  // Firebase Functions runtime credentials are used here. Do not create or load a service account key file.
  await getAdminAuth().setCustomUserClaims(input.uid, input.claims);

  return {
    ok: true,
    uid: input.uid,
    claims: input.claims,
    plainPasswordStored: false,
    auditAction: "auth.custom_claims.set",
  };
}
