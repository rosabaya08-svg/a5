import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, getAdminDbForProject } from "../firebaseAdmin";
import { A5_COMPANY_SOURCE_SITE, A5_SITE_SCOPE, A5_SOURCE_PROJECT } from "../identity/source";

const memberHubProjectId = process.env.MEMBER_HUB_PROJECT_ID?.trim() || "withcommerce-member-hub";
const memberHubAdminEmail = process.env.MEMBER_HUB_ADMIN_EMAIL?.trim().toLowerCase() || "rosabaya08@gmail.com";
const memberHubAppName = "withcommerce-member-hub";
const hubSourceSite = "a5";
const hubSourceChannel = "a5_company";
const hubMemberType = "a5_company";
const hubSchemaVersion = 1;

type A5CompanyMemberSyncInput = {
  companyId: string;
  businessNo?: string;
  companyName?: string;
  managerEmail?: string;
  managerName?: string;
  managerPhone?: string;
  status: string;
  approvalStatus?: string;
  authUid?: string;
  sourceRequestId?: string;
  updatedByEmail?: string;
};

export type MemberHubSyncResult =
  | {
      ok: true;
      projectId: string;
      memberId: string;
      memberHubId: string;
      businessMemberId: string;
      siteLinkId: string;
      standardSyncStatus: "synced" | "failed";
      standardSyncError?: string;
    }
  | {
      ok: false;
      projectId: string;
      memberId: string;
      memberHubId: string;
      businessMemberId: string;
      siteLinkId: string;
      standardSyncStatus: "not_attempted";
      code: string;
      message: string;
    };

export async function syncA5CompanyMemberToHub(input: A5CompanyMemberSyncInput): Promise<MemberHubSyncResult> {
  const safeCompanyId = safeDocumentId(input.companyId);
  const memberId = `a5_company_${safeCompanyId}`;
  const businessMemberId = `a5_business_${safeCompanyId}`;
  const siteLinkId = `a5_company_${safeCompanyId}`;
  const businessNoNormalized = normalizeBusinessNo(input.businessNo);
  const managerEmailNormalized = normalizeEmail(input.managerEmail);
  const memberHubId = managerEmailNormalized
    ? `a5_member_email_${hashKey(managerEmailNormalized)}`
    : `a5_member_company_${safeCompanyId}`;

  try {
    const db = getAdminDbForProject(memberHubAppName, memberHubProjectId);
    const document = {
      id: memberId,
      memberId,
      member_id: memberId,
      sourceProject: A5_SOURCE_PROJECT,
      source_project: A5_SOURCE_PROJECT,
      sourceSite: A5_COMPANY_SOURCE_SITE,
      source_site: A5_COMPANY_SOURCE_SITE,
      site_scope: A5_SITE_SCOPE,
      memberType: "company",
      member_type: "company",
      hubSourceSite: hubSourceSite,
      hub_source_site: hubSourceSite,
      hubSourceChannel: hubSourceChannel,
      hub_source_channel: hubSourceChannel,
      hubMemberType: hubMemberType,
      hub_member_type: hubMemberType,
      memberHubId,
      member_hub_id: memberHubId,
      businessMemberId,
      business_member_id: businessMemberId,
      siteLinkId,
      site_link_id: siteLinkId,
      hub_schema_version: hubSchemaVersion,
      ownerUid: input.authUid ?? `company:${input.companyId}`,
      owner_uid: input.authUid ?? `company:${input.companyId}`,
      a5CompanyId: input.companyId,
      a5_company_id: input.companyId,
      company_id: input.companyId,
      companyId: input.companyId,
      business_registration_number: input.businessNo ?? null,
      business_registration_number_normalized: businessNoNormalized ?? null,
      company_name: input.companyName ?? input.companyId,
      name: input.companyName ?? input.companyId,
      manager_email: input.managerEmail ?? null,
      manager_name: input.managerName ?? null,
      manager_phone: input.managerPhone ?? null,
      auth_uid: input.authUid ?? null,
      account_status: input.status,
      approval_status: input.approvalStatus ?? input.status,
      source_request_id: input.sourceRequestId ?? null,
      hub_admin_email: memberHubAdminEmail,
      last_updated_by_site: A5_COMPANY_SOURCE_SITE,
      last_updated_by_email: input.updatedByEmail ?? null,
      last_synced_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    const legacyBatch = db.batch();

    legacyBatch.set(db.collection("member_profiles").doc(memberId), document, { merge: true });
    legacyBatch.set(db.collection("a5_company_members").doc(input.companyId), document, { merge: true });

    if (businessNoNormalized) {
      legacyBatch.set(db.collection("member_identity_index").doc(`business_no_${businessNoNormalized}`),
        {
          member_id: memberId,
          source_project: A5_SOURCE_PROJECT,
          source_site: A5_COMPANY_SOURCE_SITE,
          member_type: "company",
          hub_source_site: hubSourceSite,
          hub_member_type: hubMemberType,
          memberHubId,
          member_hub_id: memberHubId,
          businessMemberId,
          business_member_id: businessMemberId,
          company_id: input.companyId,
          business_registration_number_normalized: businessNoNormalized,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    await legacyBatch.commit();

    let standardSyncStatus: "synced" | "failed" = "synced";
    let standardSyncError: string | undefined;

    try {
      const standardBatch = db.batch();

      standardBatch.set(db.collection("businessMembers").doc(businessMemberId), buildBusinessMemberDocument({
      input,
      memberId,
      memberHubId,
      businessMemberId,
      siteLinkId,
      businessNoNormalized,
    }), { merge: true });
      standardBatch.set(db.collection("members").doc(memberHubId), buildManagerMemberDocument({
      input,
      memberId,
      memberHubId,
      businessMemberId,
      siteLinkId,
      managerEmailNormalized,
    }), { merge: true });
      standardBatch.set(db.collection("siteLinks").doc(siteLinkId), buildSiteLinkDocument({
      input,
      memberId,
      memberHubId,
      businessMemberId,
      siteLinkId,
      businessNoNormalized,
    }), { merge: true });

      if (businessNoNormalized) {
        standardBatch.set(db.collection("providerIdentities").doc(`a5_business_no_${hashKey(businessNoNormalized)}`), {
        ...hubCoordinates(),
        identityType: "business_registration_number",
        identity_type: "business_registration_number",
        identityKeyHash: hashKey(businessNoNormalized),
        identity_key_hash: hashKey(businessNoNormalized),
        memberHubId,
        member_hub_id: memberHubId,
        businessMemberId,
        business_member_id: businessMemberId,
        legacyMemberId: memberId,
        legacy_member_id: memberId,
        companyId: input.companyId,
        company_id: input.companyId,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });
      }

      if (input.authUid) {
        standardBatch.set(db.collection("providerIdentities").doc(`a5_firebase_uid_${hashKey(input.authUid)}`), {
        ...hubCoordinates(),
        identityType: "firebase_uid",
        identity_type: "firebase_uid",
        identityKeyHash: hashKey(input.authUid),
        identity_key_hash: hashKey(input.authUid),
        uid: input.authUid,
        memberHubId,
        member_hub_id: memberHubId,
        businessMemberId,
        business_member_id: businessMemberId,
        legacyMemberId: memberId,
        legacy_member_id: memberId,
        companyId: input.companyId,
        company_id: input.companyId,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });
      }

      if (managerEmailNormalized) {
        standardBatch.set(db.collection("providerIdentities").doc(`a5_email_${hashKey(managerEmailNormalized)}`), {
        ...hubCoordinates(),
        identityType: "email",
        identity_type: "email",
        identityKeyHash: hashKey(managerEmailNormalized),
        identity_key_hash: hashKey(managerEmailNormalized),
        emailNormalized: managerEmailNormalized,
        email_normalized: managerEmailNormalized,
        memberHubId,
        member_hub_id: memberHubId,
        businessMemberId,
        business_member_id: businessMemberId,
        legacyMemberId: memberId,
        legacy_member_id: memberId,
        companyId: input.companyId,
        company_id: input.companyId,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true });
      }

      standardBatch.set(db.collection("auditLogs").doc(), {
      ...hubCoordinates(),
      action: "a5.company_member.synced",
      targetType: "businessMember",
      target_type: "businessMember",
      targetId: businessMemberId,
      target_id: businessMemberId,
      memberHubId,
      member_hub_id: memberHubId,
      businessMemberId,
      business_member_id: businessMemberId,
      legacyMemberId: memberId,
      legacy_member_id: memberId,
      companyId: input.companyId,
      company_id: input.companyId,
      sourceRequestId: input.sourceRequestId ?? null,
      source_request_id: input.sourceRequestId ?? null,
      actorEmail: input.updatedByEmail ?? memberHubAdminEmail,
      actor_email: input.updatedByEmail ?? memberHubAdminEmail,
      createdAt: FieldValue.serverTimestamp(),
      created_at: FieldValue.serverTimestamp(),
    });

      await standardBatch.commit();
    } catch (error) {
      standardSyncStatus = "failed";
      standardSyncError = error instanceof Error ? error.message : "Standard member hub dual-write failed.";
    }

    return {
      ok: true,
      projectId: memberHubProjectId,
      memberId,
      memberHubId,
      businessMemberId,
      siteLinkId,
      standardSyncStatus,
      ...(standardSyncError ? { standardSyncError } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      projectId: memberHubProjectId,
      memberId,
      memberHubId,
      businessMemberId,
      siteLinkId,
      standardSyncStatus: "not_attempted",
      code: "MEMBER_HUB_SYNC_FAILED",
      message: error instanceof Error ? error.message : "Member hub sync failed.",
    };
  }
}

export async function persistMemberHubSyncStatusInA5(input: {
  companyId: string;
  requestId?: string;
  result: MemberHubSyncResult;
}) {
  const db = getAdminDb();
  const patch = {
    member_hub_project_id: input.result.projectId,
    member_hub_member_id: input.result.memberId,
    memberHubId: input.result.memberHubId,
    member_hub_id: input.result.memberHubId,
    businessMemberId: input.result.businessMemberId,
    business_member_id: input.result.businessMemberId,
    siteLinkId: input.result.siteLinkId,
    site_link_id: input.result.siteLinkId,
    hub_source_site: hubSourceSite,
    hub_source_channel: hubSourceChannel,
    hub_member_type: hubMemberType,
    hub_schema_version: hubSchemaVersion,
    syncStatus: input.result.ok ? "synced" : "failed",
    member_hub_standard_sync_status: input.result.standardSyncStatus,
    member_hub_standard_sync_error: input.result.ok && input.result.standardSyncError
      ? input.result.standardSyncError
      : FieldValue.delete(),
    member_hub_sync_status: input.result.ok ? "synced" : "failed",
    member_hub_sync_error: input.result.ok ? FieldValue.delete() : input.result.message,
    member_hub_synced_at: input.result.ok ? FieldValue.serverTimestamp() : FieldValue.delete(),
    member_hub_last_attempt_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };

  await db.collection("companies").doc(input.companyId).set(patch, { merge: true });

  if (input.requestId) {
    await db.collection("company_signup_requests").doc(input.requestId).set(patch, { merge: true });
  }
}

function buildBusinessMemberDocument(input: {
  input: A5CompanyMemberSyncInput;
  memberId: string;
  memberHubId: string;
  businessMemberId: string;
  siteLinkId: string;
  businessNoNormalized?: string;
}) {
  return {
    ...hubCoordinates(),
    id: input.businessMemberId,
    businessMemberId: input.businessMemberId,
    business_member_id: input.businessMemberId,
    memberHubId: input.memberHubId,
    member_hub_id: input.memberHubId,
    siteLinkId: input.siteLinkId,
    site_link_id: input.siteLinkId,
    legacyMemberId: input.memberId,
    legacy_member_id: input.memberId,
    ownerUid: input.input.authUid ?? `company:${input.input.companyId}`,
    owner_uid: input.input.authUid ?? `company:${input.input.companyId}`,
    a5CompanyId: input.input.companyId,
    a5_company_id: input.input.companyId,
    companyId: input.input.companyId,
    company_id: input.input.companyId,
    businessRegistrationNumber: input.input.businessNo ?? null,
    business_registration_number: input.input.businessNo ?? null,
    businessRegistrationNumberNormalized: input.businessNoNormalized ?? null,
    business_registration_number_normalized: input.businessNoNormalized ?? null,
    companyName: input.input.companyName ?? input.input.companyId,
    company_name: input.input.companyName ?? input.input.companyId,
    name: input.input.companyName ?? input.input.companyId,
    managerMemberHubId: input.memberHubId,
    manager_member_hub_id: input.memberHubId,
    managerEmail: normalizeEmail(input.input.managerEmail) ?? null,
    manager_email: normalizeEmail(input.input.managerEmail) ?? null,
    managerName: input.input.managerName ?? null,
    manager_name: input.input.managerName ?? null,
    managerPhone: input.input.managerPhone ?? null,
    manager_phone: input.input.managerPhone ?? null,
    accountStatus: input.input.status,
    account_status: input.input.status,
    approvalStatus: input.input.approvalStatus ?? input.input.status,
    approval_status: input.input.approvalStatus ?? input.input.status,
    sourceRequestId: input.input.sourceRequestId ?? null,
    source_request_id: input.input.sourceRequestId ?? null,
    profileVersion: FieldValue.increment(1),
    profile_version: FieldValue.increment(1),
    syncStatus: "synced",
    sync_status: "synced",
    updatedAt: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

function buildManagerMemberDocument(input: {
  input: A5CompanyMemberSyncInput;
  memberId: string;
  memberHubId: string;
  businessMemberId: string;
  siteLinkId: string;
  managerEmailNormalized?: string;
}) {
  return {
    ...hubCoordinates(),
    id: input.memberHubId,
    memberHubId: input.memberHubId,
    member_hub_id: input.memberHubId,
    businessMemberId: input.businessMemberId,
    business_member_id: input.businessMemberId,
    siteLinkId: input.siteLinkId,
    site_link_id: input.siteLinkId,
    legacyMemberId: input.memberId,
    legacy_member_id: input.memberId,
    uid: input.input.authUid ?? null,
    ownerUid: input.input.authUid ?? `company:${input.input.companyId}`,
    owner_uid: input.input.authUid ?? `company:${input.input.companyId}`,
    a5CompanyId: input.input.companyId,
    a5_company_id: input.input.companyId,
    companyId: input.input.companyId,
    company_id: input.input.companyId,
    displayName: input.input.managerName ?? input.input.companyName ?? input.input.companyId,
    display_name: input.input.managerName ?? input.input.companyName ?? input.input.companyId,
    email: input.managerEmailNormalized ?? null,
    email_normalized: input.managerEmailNormalized ?? null,
    phone: input.input.managerPhone ?? null,
    managerRole: "company_admin",
    manager_role: "company_admin",
    accountStatus: input.input.status,
    account_status: input.input.status,
    approvalStatus: input.input.approvalStatus ?? input.input.status,
    approval_status: input.input.approvalStatus ?? input.input.status,
    sourceRequestId: input.input.sourceRequestId ?? null,
    source_request_id: input.input.sourceRequestId ?? null,
    profileVersion: FieldValue.increment(1),
    profile_version: FieldValue.increment(1),
    syncStatus: "synced",
    sync_status: "synced",
    updatedAt: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

function buildSiteLinkDocument(input: {
  input: A5CompanyMemberSyncInput;
  memberId: string;
  memberHubId: string;
  businessMemberId: string;
  siteLinkId: string;
  businessNoNormalized?: string;
}) {
  return {
    ...hubCoordinates(),
    id: input.siteLinkId,
    siteLinkId: input.siteLinkId,
    site_link_id: input.siteLinkId,
    siteLinkType: "a5_company",
    site_link_type: "a5_company",
    memberHubId: input.memberHubId,
    member_hub_id: input.memberHubId,
    businessMemberId: input.businessMemberId,
    business_member_id: input.businessMemberId,
    legacyMemberId: input.memberId,
    legacy_member_id: input.memberId,
    sourceCompanyId: input.input.companyId,
    source_company_id: input.input.companyId,
    companyId: input.input.companyId,
    company_id: input.input.companyId,
    businessRegistrationNumberNormalized: input.businessNoNormalized ?? null,
    business_registration_number_normalized: input.businessNoNormalized ?? null,
    authUid: input.input.authUid ?? null,
    auth_uid: input.input.authUid ?? null,
    status: input.input.status,
    approvalStatus: input.input.approvalStatus ?? input.input.status,
    approval_status: input.input.approvalStatus ?? input.input.status,
    updatedAt: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

function hubCoordinates() {
  return {
    sourceProject: A5_SOURCE_PROJECT,
    source_project: A5_SOURCE_PROJECT,
    sourceSite: hubSourceSite,
    source_site: hubSourceSite,
    sourceChannel: hubSourceChannel,
    source_channel: hubSourceChannel,
    memberType: hubMemberType,
    member_type: hubMemberType,
    legacySourceSite: A5_COMPANY_SOURCE_SITE,
    legacy_source_site: A5_COMPANY_SOURCE_SITE,
    legacyMemberType: "company",
    legacy_member_type: "company",
    siteScope: A5_SITE_SCOPE,
    site_scope: A5_SITE_SCOPE,
    createdBySite: hubSourceSite,
    created_by_site: hubSourceSite,
    lastUpdatedBySite: hubSourceSite,
    last_updated_by_site: hubSourceSite,
    hubSchemaVersion: hubSchemaVersion,
    hub_schema_version: hubSchemaVersion,
  };
}

function normalizeBusinessNo(value?: string) {
  const normalized = String(value ?? "").replace(/\D/g, "");
  return normalized || undefined;
}

function normalizeEmail(value?: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || undefined;
}

function safeDocumentId(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
