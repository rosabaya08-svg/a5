import { getAdminAuth } from "../firebaseAdmin";
import { isSuperOrSeedAdmin, type A5AuthClaims } from "./verifyClaims";

export type SetCustomClaimsInput = {
  requesterClaims: A5AuthClaims;
  uid: string;
  claims: A5AuthClaims;
};

export async function setCustomClaimsSkeleton(input: SetCustomClaimsInput): Promise<{ ok: true; uid: string; claims: A5AuthClaims }> {
  if (!isSuperOrSeedAdmin(input.requesterClaims)) {
    throw new Error("PERMISSION_DENIED: only SUPER_ADMIN or seed_admin may set A5 custom claims.");
  }

  await getAdminAuth().setCustomUserClaims(input.uid, input.claims);

  return {
    ok: true,
    uid: input.uid,
    claims: input.claims,
  };
}
