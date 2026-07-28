import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function check(ok, message) {
  return { ok, message };
}

const files = {
  sync: "functions/src/memberHub/sync.ts",
  signupSubmit: "functions/src/company/signupSubmit.ts",
  signupReview: "functions/src/company/signupReview.ts",
  source: "functions/src/identity/source.ts",
  functionsEnv: "functions/.env.example",
  rootEnv: ".env.local.example",
};

const missingFiles = Object.values(files).filter((file) => !exists(file));
if (missingFiles.length) {
  for (const file of missingFiles) {
    console.error(`- fail: missing source file ${file}`);
  }
  process.exit(1);
}

const syncSource = read(files.sync);
const signupSubmitSource = read(files.signupSubmit);
const signupReviewSource = read(files.signupReview);
const identitySource = read(files.source);
const envSource = `${read(files.functionsEnv)}\n${read(files.rootEnv)}`;

const checks = [
  check(
    syncSource.includes('const hubSourceSite = "a5"') &&
      syncSource.includes('const hubSourceChannel = "a5_company"') &&
      syncSource.includes('const hubMemberType = "a5_company"'),
    "A5 hub standard coordinates are explicit and do not replace legacy sourceSite/memberType.",
  ),
  check(
    syncSource.includes("member_profiles") &&
      syncSource.includes("a5_company_members") &&
      syncSource.includes("member_identity_index"),
    "A5 legacy member hub collections are still written.",
  ),
  check(
    syncSource.includes("businessMembers") &&
      syncSource.includes("members") &&
      syncSource.includes("providerIdentities") &&
      syncSource.includes("siteLinks") &&
      syncSource.includes("auditLogs"),
    "New standard member hub collections are present for dual-write.",
  ),
  check(
    syncSource.includes("const legacyBatch = db.batch()") &&
      syncSource.includes("await legacyBatch.commit()") &&
      syncSource.includes("const standardBatch = db.batch()") &&
      syncSource.includes("standardSyncStatus = \"failed\""),
    "Legacy hub write and standard dual-write are isolated so standard failures do not break legacy sync.",
  ),
  check(
    syncSource.includes("memberHubId") &&
      syncSource.includes("businessMemberId") &&
      syncSource.includes("siteLinkId") &&
      syncSource.includes("member_hub_standard_sync_status"),
    "A5 local sync state stores standard hub IDs and standard dual-write status.",
  ),
  check(
    syncSource.includes("a5_member_email_") &&
      syncSource.includes("a5_member_company_") &&
      !syncSource.includes("a5_member_${safeDocumentId(input.authUid)}"),
    "A5 memberHubId is stable hub identity and not directly derived from Firebase UID.",
  ),
  check(
    syncSource.includes("createHash") &&
      syncSource.includes("hashKey(") &&
      !syncSource.includes("providerUid"),
    "Identity indexes use hashed keys and do not introduce raw SNS provider UID handling.",
  ),
  check(
    signupSubmitSource.includes("syncA5CompanyMemberToHub") &&
      signupSubmitSource.includes("persistMemberHubSyncStatusInA5"),
    "A5 signup submit path still syncs and persists member hub status.",
  ),
  check(
    signupReviewSource.includes("syncA5CompanyMemberToHub") &&
      signupReviewSource.includes("persistMemberHubSyncStatusInA5"),
    "A5 signup approval path still syncs and persists member hub status.",
  ),
  check(
    identitySource.includes('A5_COMPANY_SOURCE_SITE = "a5-company"') &&
      identitySource.includes('member_type: "company"'),
    "A5 legacy auth/source claims remain unchanged.",
  ),
  check(
    envSource.includes("MEMBER_HUB_PROJECT_ID=withcommerce-member-hub"),
    "Member hub project id example remains documented.",
  ),
];

console.log("[check:member-hub] A5 member hub sync safety gate");

for (const result of checks) {
  console.log(`- ${result.ok ? "ok" : "fail"}: ${result.message}`);
}

const failed = checks.filter((result) => !result.ok);
if (failed.length) {
  console.error(`[check:member-hub] FAILED: ${failed.length} safety check(s) failed.`);
  process.exit(1);
}

console.log("[check:member-hub] OK. A5 member hub sync keeps legacy coordinates and adds standard dual-write safely.");
