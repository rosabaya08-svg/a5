import { getAdminAuth } from "../firebaseAdmin";
import {
  assertCanSetClaims,
  buildCustomClaimsDraft,
  type A5AssignableAuthRole,
  type A5AuthClaims,
} from "./verifyClaims";

export type InviteAdminUserInput = {
  requesterClaims: A5AuthClaims;
  email: string;
  role: A5AssignableAuthRole;
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
  bulkUserCreation: false;
  customClaims: A5AuthClaims;
};

export async function createAdminInviteDraft(input: InviteAdminUserInput): Promise<InviteAdminUserDraft> {
  const customClaims = buildCustomClaimsDraft(input.role, {
    company_id: input.company_id,
    nursery_id: input.nursery_id,
    room_id: input.room_id,
    tablet_id: input.tablet_id,
  });
  assertCanSetClaims(input.requesterClaims, customClaims);

  // This only proves the Auth contract. Passwords are set by users through Firebase reset links.
  await getAdminAuth().generatePasswordResetLink(input.email);

  return {
    ok: true,
    email: input.email,
    role: input.role,
    authAction: "password_reset_link",
    plainPasswordStored: false,
    bulkUserCreation: false,
    customClaims,
  };
}
