import { FieldValue } from "firebase-admin/firestore";
import { getAdminDbForProject } from "../firebaseAdmin";
import { AccessHttpError, safeDocumentId, text } from "../access/policy";

type JsonRecord = Record<string, unknown>;

export type A5sSubmerchantMaterial = {
  sourceProjectId: string;
  businessNumber: string;
  subMerchantId: string;
  subMerchantName: string;
  ownerName: string;
  phoneNumber: string;
  accountBank: string;
  accountNumber: string;
  accountOwner: string;
  businessScale: string;
  organizationId: string;
};

const businessScales = new Set(["영세", "중소1", "중소2", "중소3", "일반"]);

function requiredText(value: unknown, field: string, maxLength: number) {
  const result = text(value, maxLength + 1);
  if (!result) throw new AccessHttpError(409, "A5S_SUBMERCHANT_SOURCE_INCOMPLETE", `${field} 값이 없습니다.`);
  if (result.length > maxLength) {
    throw new AccessHttpError(409, "A5S_SUBMERCHANT_SOURCE_INVALID", `${field} 값이 ${maxLength}자를 초과합니다.`);
  }
  return result;
}

function digits(value: unknown, field: string, maxLength: number) {
  const result = requiredText(value, field, maxLength).replace(/\D/g, "");
  if (!result || result.length > maxLength) {
    throw new AccessHttpError(409, "A5S_SUBMERCHANT_SOURCE_INVALID", `${field} 숫자 형식이 올바르지 않습니다.`);
  }
  return result;
}

function sourceValue(source: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key];
  }
  return "";
}

function normalizedBusinessNumber(value: unknown) {
  const businessNumber = text(value, 30).replace(/\D/g, "");
  if (!/^\d{10}$/.test(businessNumber)) {
    throw new AccessHttpError(400, "A5S_BUSINESS_NUMBER_INVALID", "사업자번호는 숫자 10자리여야 합니다.");
  }
  return businessNumber;
}

export function normalizeA5sSubmerchantMaterial(input: {
  sourceProjectId: string;
  businessNumber: unknown;
  environment: "test" | "production";
  partner: JsonRecord;
  finance: JsonRecord;
}): A5sSubmerchantMaterial {
  const businessNumber = normalizedBusinessNumber(input.businessNumber);
  const status = text(sourceValue(input.partner, "status"), 30).toUpperCase();
  const applicationStatus = text(sourceValue(
    input.partner,
    "applicationStatus",
    "application_status",
    "approvalStatus",
    "approval_status",
  ), 30).toUpperCase();
  if (status !== "ACTIVE" || applicationStatus !== "APPROVED") {
    throw new AccessHttpError(409, "A5S_PARTNER_NOT_APPROVED", "승인된 활성 A5S 파트너만 PayUp 등록을 준비할 수 있습니다.");
  }

  const generatedId = `wc${businessNumber}`;
  const sourceSubMerchantId = input.environment === "test"
    ? sourceValue(input.partner, "payupTestSubMerchantId")
    : sourceValue(input.partner, "payupSubMerchantId");
  const subMerchantId = requiredText(
    sourceSubMerchantId || (input.environment === "test" ? generatedId : ""),
    "subMerchantId",
    20,
  );
  if (!/^[A-Za-z0-9]+$/.test(subMerchantId)) {
    throw new AccessHttpError(409, "A5S_SUBMERCHANT_ID_INVALID", "PayUp 하위가맹점 ID는 영문과 숫자만 사용할 수 있습니다.");
  }

  const businessScale = text(sourceValue(input.partner, "businessScale", "business_scale"), 10);
  if (businessScale && !businessScales.has(businessScale)) {
    throw new AccessHttpError(409, "A5S_BUSINESS_SCALE_INVALID", "PayUp 사업자 규모 값이 올바르지 않습니다.");
  }

  return {
    sourceProjectId: input.sourceProjectId,
    businessNumber,
    subMerchantId,
    subMerchantName: requiredText(sourceValue(input.partner, "businessName", "business_name", "companyName", "company_name"), "subMerchantName", 30),
    ownerName: requiredText(sourceValue(input.partner, "ownerName", "owner_name"), "ownerName", 20),
    phoneNumber: requiredText(sourceValue(input.partner, "phone", "phoneNumber", "phone_number"), "phoneNumber", 20),
    accountBank: requiredText(sourceValue(input.finance, "bankName", "bank_name"), "accountBank", 30),
    accountNumber: digits(sourceValue(input.finance, "accountNo", "accountNumber", "account_number"), "accountNumber", 30),
    accountOwner: requiredText(sourceValue(input.finance, "accountHolder", "accountOwner", "account_owner"), "accountOwner", 30),
    businessScale,
    organizationId: text(sourceValue(input.partner, "partnerId", "partner_id", "ownerMemberHubId"), 160) || businessNumber,
  };
}

function maskPhone(value: string) {
  const phone = value.replace(/\D/g, "");
  if (phone.length < 7) return "***";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function maskAccount(value: string) {
  if (value.length <= 6) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 3)}-****-${value.slice(-3)}`;
}

export function preparedCentralSubmerchant(
  material: A5sSubmerchantMaterial,
  input: { merchantId: string; actorUid: string },
) {
  const nowIso = new Date().toISOString();
  return {
    provider: "payup",
    merchant_id: input.merchantId || null,
    organization_id: material.organizationId,
    channel_ids: ["A5S", "A5WS"],
    role: material.businessNumber === "2871103274" ? "PLATFORM" : "PRODUCT_OWNER",
    sub_merchant_id: material.subMerchantId,
    sub_merchant_name: material.subMerchantName,
    owner_name: material.ownerName,
    phone_number_masked: maskPhone(material.phoneNumber),
    business_number: material.businessNumber,
    account_bank: material.accountBank,
    account_number_masked: maskAccount(material.accountNumber),
    account_owner: material.accountOwner,
    business_scale: material.businessScale,
    source_project_id: material.sourceProjectId,
    source_partner_path: `a5ws_partners/${material.businessNumber}`,
    source_finance_path: `a5ws_partner_finance_private/${material.businessNumber}`,
    source_values_persisted: false,
    registration_payload_ready: true,
    status: "PENDING_VERIFICATION",
    payup_sync_status: "PREPARED",
    checkout_blocked: true,
    checkout_blocked_reason: "PAYUP_LIST_VERIFICATION_REQUIRED",
    updated_by_uid: input.actorUid,
    updated_at: FieldValue.serverTimestamp(),
    updated_at_iso: nowIso,
  };
}

export async function loadA5sSubmerchantMaterial(input: {
  businessNumber: unknown;
  environment: "test" | "production";
}) {
  const businessNumber = normalizedBusinessNumber(input.businessNumber);
  const sourceProjectId = text(process.env.A5S_SOURCE_PROJECT_ID, 100) || "a5s-mall";
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(sourceProjectId)) {
    throw new AccessHttpError(409, "A5S_SOURCE_PROJECT_INVALID", "A5S 원본 프로젝트 ID 설정이 올바르지 않습니다.");
  }
  const sourceDb = getAdminDbForProject(`payup-source-${safeDocumentId(sourceProjectId)}`, sourceProjectId);
  let partnerSnapshot;
  let financeSnapshot;
  try {
    [partnerSnapshot, financeSnapshot] = await Promise.all([
      sourceDb.doc(`a5ws_partners/${businessNumber}`).get(),
      sourceDb.doc(`a5ws_partner_finance_private/${businessNumber}`).get(),
    ]);
  } catch {
    throw new AccessHttpError(
      503,
      "A5S_SOURCE_ACCESS_FAILED",
      "중앙 PayUp 서비스 계정이 A5S 파트너 원본을 읽을 수 없습니다. 프로젝트 간 읽기 권한을 확인해야 합니다.",
    );
  }
  if (!partnerSnapshot.exists) {
    throw new AccessHttpError(404, "A5S_PARTNER_NOT_FOUND", "A5S 파트너 자료를 찾을 수 없습니다.");
  }
  if (!financeSnapshot.exists) {
    throw new AccessHttpError(409, "A5S_FINANCE_NOT_FOUND", "A5S 비공개 정산자료를 찾을 수 없습니다.");
  }
  return normalizeA5sSubmerchantMaterial({
    sourceProjectId,
    businessNumber,
    environment: input.environment,
    partner: partnerSnapshot.data() ?? {},
    finance: financeSnapshot.data() ?? {},
  });
}
