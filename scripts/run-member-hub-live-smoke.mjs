import crypto from "node:crypto";
import process from "node:process";

const writeEnabled = process.argv.includes("--write");
const rootProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "a5-closed-mall";

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function stamp() {
  return new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
}

function hashKey(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
}

async function docExists(ref) {
  const snapshot = await ref.get();
  return {
    exists: snapshot.exists,
    data: snapshot.exists ? snapshot.data() : null,
  };
}

function plannedInput() {
  const runId = stamp();
  const companyId = argValue("company-id") || `codex-hub-smoke-${runId}`;
  const requestId = argValue("request-id") || `codex-hub-smoke-request-${runId}`;
  const businessNo = argValue("business-no") || `88${runId.slice(-8)}`;
  const authUid = argValue("auth-uid") || `codex-smoke-uid-${runId}`;
  const managerEmail = argValue("manager-email") || `codex-hub-smoke+${runId}@example.invalid`;

  return {
    companyId,
    requestId,
    businessNo,
    authUid,
    managerEmail,
    managerEmailNormalized: managerEmail.trim().toLowerCase(),
    companyName: argValue("company-name") || "Codex Hub Smoke Test",
    managerName: argValue("manager-name") || "Codex Hub Smoke",
    managerPhone: argValue("manager-phone") || "01000000000",
  };
}

async function main() {
  const input = plannedInput();

  if (!writeEnabled) {
    console.log(JSON.stringify({
      ok: true,
      mode: "dry-run",
      message: "No Firestore writes were attempted. Re-run with --write in an approved authenticated environment to execute.",
      rootProjectId,
      hubProjectId: process.env.MEMBER_HUB_PROJECT_ID?.trim() || "withcommerce-member-hub",
      planned: {
        companyId: input.companyId,
        requestId: input.requestId,
        businessNo: input.businessNo,
        authUidHash: hashKey(input.authUid),
        managerEmailHash: hashKey(input.managerEmailNormalized),
      },
    }, null, 2));
    return;
  }

  process.env.GOOGLE_CLOUD_PROJECT ||= rootProjectId;
  process.env.GCLOUD_PROJECT ||= rootProjectId;

  const { syncA5CompanyMemberToHub, persistMemberHubSyncStatusInA5 } = await import("../functions/lib/memberHub/sync.js");
  const { getAdminDb, getAdminDbForProject } = await import("../functions/lib/firebaseAdmin.js");

  const result = await syncA5CompanyMemberToHub({
    companyId: input.companyId,
    businessNo: input.businessNo,
    companyName: input.companyName,
    managerEmail: input.managerEmail,
    managerName: input.managerName,
    managerPhone: input.managerPhone,
    status: "active",
    approvalStatus: "approved",
    authUid: input.authUid,
    sourceRequestId: input.requestId,
    updatedByEmail: "codex-smoke@example.invalid",
  });

  await persistMemberHubSyncStatusInA5({ companyId: input.companyId, requestId: input.requestId, result });

  const hubProjectId = process.env.MEMBER_HUB_PROJECT_ID?.trim() || "withcommerce-member-hub";
  const hubDb = getAdminDbForProject("withcommerce-member-hub", hubProjectId);
  const localDb = getAdminDb();

  const checks = [
    ["hub.member_profiles", hubDb.collection("member_profiles").doc(result.memberId)],
    ["hub.a5_company_members", hubDb.collection("a5_company_members").doc(input.companyId)],
    ["hub.member_identity_index", hubDb.collection("member_identity_index").doc(`business_no_${input.businessNo}`)],
    ["hub.businessMembers", hubDb.collection("businessMembers").doc(result.businessMemberId)],
    ["hub.members", hubDb.collection("members").doc(result.memberHubId)],
    ["hub.siteLinks", hubDb.collection("siteLinks").doc(result.siteLinkId)],
    ["hub.providerIdentities.businessNo", hubDb.collection("providerIdentities").doc(`a5_business_no_${hashKey(input.businessNo)}`)],
    ["hub.providerIdentities.firebaseUid", hubDb.collection("providerIdentities").doc(`a5_firebase_uid_${hashKey(input.authUid)}`)],
    ["hub.providerIdentities.email", hubDb.collection("providerIdentities").doc(`a5_email_${hashKey(input.managerEmailNormalized)}`)],
    ["local.companies", localDb.collection("companies").doc(input.companyId)],
    ["local.company_signup_requests", localDb.collection("company_signup_requests").doc(input.requestId)],
  ];

  const verified = [];
  for (const [label, ref] of checks) {
    const item = await docExists(ref);
    verified.push({ label, exists: item.exists });
  }

  const localCompany = (await docExists(localDb.collection("companies").doc(input.companyId))).data || {};
  const summary = {
    ok: result.ok,
    mode: "write",
    projectId: result.projectId,
    companyId: input.companyId,
    requestId: input.requestId,
    memberId: result.memberId,
    memberHubId: result.memberHubId,
    businessMemberId: result.businessMemberId,
    siteLinkId: result.siteLinkId,
    standardSyncStatus: result.standardSyncStatus,
    localSyncStatus: localCompany.member_hub_sync_status || null,
    localStandardSyncStatus: localCompany.member_hub_standard_sync_status || null,
    localHasStandardSyncError: Boolean(localCompany.member_hub_standard_sync_error),
    verified,
  };

  console.log(JSON.stringify(summary, null, 2));

  const failed = verified.filter((item) => !item.exists);
  if (!result.ok || result.standardSyncStatus !== "synced" || failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
