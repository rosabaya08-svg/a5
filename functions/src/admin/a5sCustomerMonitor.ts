import { getAdminAuth, getAdminDbForProject } from "../firebaseAdmin";
import { sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

const masterAdminEmail = "rosabaya08@gmail.com";
const memberHubProjectId = process.env.MEMBER_HUB_PROJECT_ID?.trim() || "withcommerce-member-hub";
const memberHubAppName = "withcommerce-member-hub-a5s-customer-monitor";
const defaultLimit = 80;
const maxLimit = 200;
const maskedPrivacyMode = "masked_default";

type HubRecord = Record<string, unknown>;

type A5sHubCustomerRow = {
  id: string;
  memberHubId: string;
  customerId: string;
  customerUid: string;
  sellerId: string;
  displayName: string;
  email: string;
  phone: string;
  accountStatus: string;
  hubSyncStatus: string;
  profileVersion: number;
  signupRoute: string;
  signupProviders: string[];
  joinedChannel: string;
  updatedAt: string;
  sourceSite: "a5s";
};

export async function adminA5sCustomerMonitorHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use GET for A5S customer monitor.",
        httpStatus: 405,
      },
    });
    return;
  }

  if (!(await requireSuperAdmin(request, response))) return;

  const limit = clampLimit(request.query?.limit);
  const searchText = queryString(request.query?.q);

  try {
    const hubDb = getAdminDbForProject(memberHubAppName, memberHubProjectId);
    const siteLinks = await readA5sCustomerSiteLinks(hubDb, limit);
    const memberHubIds = unique(siteLinks.map((siteLink) => stringField(siteLink, ["memberHubId", "member_hub_id"])).filter(Boolean));
    const [members, identityMap] = await Promise.all([
      readMembersById(hubDb, memberHubIds),
      readProviderIdentityTypes(hubDb, memberHubIds, Math.min(maxLimit * 4, Math.max(limit * 6, 100))),
    ]);

    const rawCustomers = siteLinks
      .map((siteLink) => buildCustomerRow(siteLink, members.get(stringField(siteLink, ["memberHubId", "member_hub_id"])) ?? {}, identityMap))
      .filter((customer) => customer.memberHubId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const customers = rawCustomers
      .filter((customer) => matchesCustomerSearch(customer, searchText))
      .map(maskCustomerRow);

    sendJson(response, 200, {
      ok: true,
      projectId: memberHubProjectId,
      source: "withcommerce-member-hub.siteLinks/members/providerIdentities",
      privacyMode: maskedPrivacyMode,
      count: customers.length,
      customers,
      generatedAt: new Date().toISOString(),
      message: customers.length
        ? "A5S customer hub links loaded with masked personal fields for A5 super admin monitoring."
        : "No A5S customer hub links were found yet.",
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "A5S_CUSTOMER_MONITOR_FAILED",
        message: error instanceof Error ? error.message : "A5S customer monitor failed.",
        httpStatus: 500,
      },
    });
  }
}

async function readA5sCustomerSiteLinks(db: ReturnType<typeof getAdminDbForProject>, limit: number): Promise<HubRecord[]> {
  const primary = await db.collection("siteLinks").where("sourceSite", "==", "a5s").limit(limit).get();
  const primaryRows = primary.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(isA5sCustomerSiteLink);
  if (primaryRows.length > 0) return primaryRows;

  const fallback = await db.collection("siteLinks").where("source_site", "==", "a5s").limit(limit).get();
  return fallback.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(isA5sCustomerSiteLink);
}

async function readMembersById(db: ReturnType<typeof getAdminDbForProject>, ids: string[]) {
  const output = new Map<string, HubRecord>();
  await Promise.all(
    ids.map(async (id) => {
      const snapshot = await db.collection("members").doc(id).get();
      if (snapshot.exists) output.set(id, { id: snapshot.id, ...snapshot.data() });
    }),
  );
  return output;
}

async function readProviderIdentityTypes(db: ReturnType<typeof getAdminDbForProject>, memberHubIds: string[], limit: number) {
  const targetIds = new Set(memberHubIds);
  const output = new Map<string, Set<string>>();
  const addIdentity = (record: HubRecord) => {
    const memberHubId = stringField(record, ["memberHubId", "member_hub_id"]);
    if (!memberHubId || !targetIds.has(memberHubId)) return;
    const identityType = stringField(record, ["identityType", "identity_type", "provider"]) || "unknown";
    const set = output.get(memberHubId) ?? new Set<string>();
    set.add(identityType);
    output.set(memberHubId, set);
  };

  const primary = await db.collection("providerIdentities").where("sourceSite", "==", "a5s").limit(limit).get();
  primary.docs.forEach((doc) => addIdentity({ id: doc.id, ...doc.data() }));
  if (output.size > 0) return output;

  const fallback = await db.collection("providerIdentities").where("source_site", "==", "a5s").limit(limit).get();
  fallback.docs.forEach((doc) => addIdentity({ id: doc.id, ...doc.data() }));
  return output;
}

function buildCustomerRow(siteLink: HubRecord, member: HubRecord, identityMap: Map<string, Set<string>>): A5sHubCustomerRow {
  const memberHubId = stringField(siteLink, ["memberHubId", "member_hub_id"]) || stringField(member, ["memberHubId", "member_hub_id"]);
  const identityTypes = Array.from(identityMap.get(memberHubId) ?? new Set<string>()).sort();
  const signupProviders = signupProviderLabels(identityTypes);

  return {
    id: stringField(siteLink, ["id", "siteLinkId", "site_link_id"]) || memberHubId,
    memberHubId,
    customerId: stringField(siteLink, ["a5sCustomerId", "a5s_customer_id"]) || stringField(member, ["a5sCustomerId", "a5s_customer_id"]),
    customerUid: stringField(siteLink, ["customerUid", "customer_uid"]) || stringField(member, ["customerUid", "customer_uid", "uid"]),
    sellerId: stringField(siteLink, ["sellerId", "seller_id"]) || stringField(member, ["sellerId", "seller_id"]),
    displayName: stringField(member, ["displayName", "display_name", "name"]),
    email: stringField(member, ["email", "email_normalized"]),
    phone: stringField(member, ["phone"]),
    accountStatus: stringField(member, ["accountStatus", "account_status"]) || stringField(siteLink, ["status"]) || "unknown",
    hubSyncStatus: stringField(member, ["syncStatus", "sync_status"]) || "linked",
    profileVersion: numberField(member, ["profileVersion", "profile_version"]),
    signupRoute: signupRouteLabel(identityTypes),
    signupProviders,
    joinedChannel: stringField(member, ["joinedChannel", "joined_channel", "channel"]) || stringField(siteLink, ["channel"]) || "A5S",
    updatedAt: timestampField(member, ["updatedAt", "updated_at"]) || timestampField(siteLink, ["updatedAt", "updated_at"]),
    sourceSite: "a5s",
  };
}

function matchesCustomerSearch(customer: A5sHubCustomerRow, searchText: string) {
  const keyword = normalizeSearch(searchText);
  if (!keyword) return true;

  const haystack = normalizeSearch([
    customer.displayName,
    customer.email,
    customer.phone,
    customer.customerId,
    customer.customerUid,
    customer.memberHubId,
    customer.sellerId,
    customer.signupRoute,
    customer.signupProviders.join(" "),
    customer.accountStatus,
    customer.hubSyncStatus,
  ].join(" "));

  const keywordDigits = onlyDigits(searchText);
  return haystack.includes(keyword) || Boolean(keywordDigits && onlyDigits(haystack).includes(keywordDigits));
}

function maskCustomerRow(customer: A5sHubCustomerRow): A5sHubCustomerRow {
  return {
    ...customer,
    id: maskIdentifier(customer.id),
    customerId: maskIdentifier(customer.customerId),
    customerUid: maskIdentifier(customer.customerUid),
    displayName: maskName(customer.displayName),
    email: maskEmail(customer.email),
    phone: maskPhone(customer.phone),
  };
}

function isA5sCustomerSiteLink(record: HubRecord) {
  const sourceSite = stringField(record, ["sourceSite", "source_site"]);
  const linkType = stringField(record, ["siteLinkType", "site_link_type"]);
  return sourceSite === "a5s" && (!linkType || linkType === "a5s_customer");
}

function signupRouteLabel(identityTypes: string[]) {
  const providers = signupProviderLabels(identityTypes);
  if (providers.some((provider) => ["카카오", "네이버", "구글", "애플"].includes(provider))) {
    return providers.join(" / ");
  }
  if (providers.includes("이메일")) return "이메일 가입";
  if (providers.includes("Firebase")) return "Firebase 로그인";
  return "HUB 연결";
}

function signupProviderLabels(identityTypes: string[]) {
  const labels = new Set<string>();
  for (const type of identityTypes.map((item) => item.toLowerCase())) {
    if (type.includes("kakao")) labels.add("카카오");
    else if (type.includes("naver")) labels.add("네이버");
    else if (type.includes("google")) labels.add("구글");
    else if (type.includes("apple")) labels.add("애플");
    else if (type.includes("email")) labels.add("이메일");
    else if (type.includes("firebase")) labels.add("Firebase");
  }
  return Array.from(labels);
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<boolean> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "A5S_CUSTOMER_MONITOR_AUTH_REQUIRED",
        message: "Firebase ID token is required.",
        httpStatus: 401,
      },
    });
    return false;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const allowed = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail;
    if (allowed) return true;
  } catch {
    // Keep denial generic so token internals are not leaked.
  }

  sendJson(response, 403, {
    ok: false,
    error: {
      code: "A5S_CUSTOMER_MONITOR_FORBIDDEN",
      message: "SUPER_ADMIN permission is required.",
      httpStatus: 403,
    },
  });
  return false;
}

function stringField(record: HubRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberField(record: HubRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function timestampField(record: HubRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      const timestamp = value as { toDate?: () => Date; seconds?: number };
      if (timestamp.toDate) return timestamp.toDate().toISOString();
      if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
    }
  }
  return "";
}

function queryString(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskName(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (text.length <= 1) return "*";
  if (text.length === 2) return `${text.slice(0, 1)}*`;
  return `${text.slice(0, 1)}${"*".repeat(Math.min(3, text.length - 2))}${text.slice(-1)}`;
}

function maskEmail(value: string) {
  const text = value.trim();
  if (!text) return "";
  const [local, domain] = text.split("@");
  if (!local || !domain) return maskIdentifier(text);
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function maskPhone(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.length >= 10) return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
  return `****${digits.slice(-4)}`;
}

function maskIdentifier(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (text.length <= 10) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function clampLimit(value: unknown) {
  const parsed = Array.isArray(value) ? Number(value[0]) : Number(value);
  if (!Number.isFinite(parsed)) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.floor(parsed)));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
