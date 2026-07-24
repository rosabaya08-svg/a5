import process from "node:process";

const token = String(process.env.FIRESTORE_ACCESS_TOKEN || "").trim();
const companyId = String(process.argv[2] || "").trim();
if (!token || !companyId) throw new Error("FIRESTORE_ACCESS_TOKEN and companyId are required.");

const url = `https://firestore.googleapis.com/v1/projects/a5-closed-mall/databases/(default)/documents/companies/${encodeURIComponent(companyId)}`;
const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!response.ok) throw new Error(`Company read failed: HTTP ${response.status}`);
const fields = (await response.json()).fields || {};
const present = (key) => Boolean(fields[key] && !("nullValue" in fields[key]));

console.log(JSON.stringify({
  companyId,
  companyDocumentExists: true,
  loginPasswordHashPresent: present("company_login_password_hash"),
  loginPasswordPolicyPresent: present("company_login_password_policy"),
  passwordChangeRequiredPresent: present("password_change_required"),
  authUidPresent: present("auth_uid"),
  authEmailPresent: present("auth_email"),
  authClaimsReady: fields.auth_claims_ready?.booleanValue === true,
  secretValuesPrinted: 0,
}, null, 2));
