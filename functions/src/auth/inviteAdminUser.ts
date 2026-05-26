import { getAdminAuth } from "../firebaseAdmin";
import { isSuperOrSeedAdmin, type A5AuthClaims, type A5AuthRole } from "./verifyClaims";

export type InviteAdminUserInput = {
  requesterClaims: A5AuthClaims;
  email: string;
  role: Exclude<A5AuthRole, "CUSTOMER_GUEST">;
  company_id?: string;
  nursery_id?: string;
  room_id?: string;
  tablet_id?: string;
};

export type InviteAdminUserDraft = {
  ok: true;
  email: string;
  role: InviteAdminUserInput["role"];
  authAction: "password_reset_link";
  plainPasswordStored: false;
  customClaims: A5AuthClaims;
};

export async function createAdminInviteDraft(input: InviteAdminUserInput): Promise<InviteAdminUserDraft> {
  if (!isSuperOrSeedAdmin(input.requesterClaims)) {
    throw new Error("PERMISSION_DENIED: only SUPER_ADMIN or seed_admin may invite admin users.");
  }

  const customClaims: A5AuthClaims = {
    role: input.role,
    company_id: input.company_id,
    nursery_id: input.nursery_id,
    room_id: input.room_id,
    tablet_id: input.tablet_id,
    seed_admin: input.role === "seed_admin",
  };

  // This only proves the Auth contract. Actual email delivery remains a separate approved integration.
  await getAdminAuth().generatePasswordResetLink(input.email);

  return {
    ok: true,
    email: input.email,
    role: input.role,
    authAction: "password_reset_link",
    plainPasswordStored: false,
    customClaims,
  };
}
