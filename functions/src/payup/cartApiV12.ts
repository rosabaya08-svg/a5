import { AccessHttpError } from "../access/policy";

type JsonRecord = Record<string, unknown>;

const DAY_MS = 86_400_000;

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function responseText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function requiredResponseText(source: JsonRecord, field: string): string {
  const value = responseText(source[field]);
  if (!value) {
    throw new AccessHttpError(502, "PAYUP_RESPONSE_CONTRACT_INVALID", `PayUp 성공 응답에 ${field} 값이 없습니다.`);
  }
  return value;
}

function requestText(value: unknown, field: string, maxLength: number, required = false): string {
  if (value === undefined || value === null || value === "") {
    if (required) throw new AccessHttpError(400, "PAYUP_FIELD_REQUIRED", `${field} 값이 필요합니다.`);
    return "";
  }
  if (typeof value !== "string") {
    throw new AccessHttpError(400, "PAYUP_FIELD_TYPE_INVALID", `${field} 값은 문자열이어야 합니다.`);
  }
  const normalized = value.trim();
  if (required && !normalized) throw new AccessHttpError(400, "PAYUP_FIELD_REQUIRED", `${field} 값이 필요합니다.`);
  if (normalized.length > maxLength) {
    throw new AccessHttpError(400, "PAYUP_FIELD_LENGTH_INVALID", `${field} 값은 ${maxLength}자 이하여야 합니다.`);
  }
  return normalized;
}

function digitsOnly(value: unknown, field: string, maxLength: number, required = false): string {
  const normalized = requestText(value, field, maxLength, required);
  if (normalized && !/^\d+$/.test(normalized)) {
    throw new AccessHttpError(400, "PAYUP_FIELD_DIGITS_INVALID", `${field} 값은 하이픈 없는 숫자만 허용됩니다.`);
  }
  return normalized;
}

function apiKeyValue(value: unknown): string {
  const apiKey = requestText(value, "apiKey", 32, true);
  if (apiKey.length !== 32) {
    throw new AccessHttpError(409, "PAYUP_API_KEY_LENGTH_INVALID", "PayUp 장바구니 API KEY는 32자여야 합니다.");
  }
  return apiKey;
}

function subMerchantIdValue(value: unknown, required = false): string {
  return requestText(value, "subMerchantId", 20, required);
}

export function payupCartPath(
  merchantIdValue: unknown,
  resource: "sub-update" | "sub-list" | "auth-list" | "closing-list" | "closing-detail",
): string {
  const merchantId = requestText(merchantIdValue, "merchantId", 100, true);
  const encoded = encodeURIComponent(merchantId);
  if (resource === "sub-update") return `/cartpay/api/sub/${encoded}/update`;
  if (resource === "sub-list") return `/cartpay/api/sub/${encoded}/list`;
  if (resource === "auth-list") return `/cartpay/api/auth/${encoded}/list`;
  return `/cartpay/api/closing/${encoded}/${resource === "closing-detail" ? "detail" : "list"}`;
}

export function buildSubmerchantUpdatePayload(apiKey: unknown, value: unknown): JsonRecord {
  const input = objectValue(value);
  const gubun = requestText(input.gubun, "gubun", 1, true);
  if (!["1", "2"].includes(gubun)) {
    throw new AccessHttpError(400, "PAYUP_GUBUN_INVALID", "gubun은 등록 1 또는 수정 2여야 합니다.");
  }
  const payload: JsonRecord = {
    apiKey: apiKeyValue(apiKey),
    gubun,
    subMerchantId: subMerchantIdValue(input.subMerchantId, true),
  };
  const fields = {
    subMerchantName: requestText(input.subMerchantName, "subMerchantName", 30, gubun === "1"),
    ownerName: requestText(input.ownerName, "ownerName", 20, gubun === "1"),
    phoneNumber: requestText(input.phoneNumber, "phoneNumber", 20, gubun === "1"),
    subBusinessNumber: digitsOnly(input.subBusinessNumber, "subBusinessNumber", 20, gubun === "1"),
    accountBank: requestText(input.accountBank, "accountBank", 30, gubun === "1"),
    accountNumber: digitsOnly(input.accountNumber, "accountNumber", 30, gubun === "1"),
    accountOwner: requestText(input.accountOwner, "accountOwner", 30, gubun === "1"),
  };
  Object.entries(fields).forEach(([key, fieldValue]) => {
    if (fieldValue) payload[key] = fieldValue;
  });
  if (gubun === "2" && Object.keys(payload).length === 3) {
    throw new AccessHttpError(400, "PAYUP_UPDATE_FIELDS_REQUIRED", "수정할 하위가맹점 항목을 하나 이상 입력해야 합니다.");
  }
  return payload;
}

export function buildSubmerchantListPayload(apiKey: unknown, value: unknown): JsonRecord {
  const input = objectValue(value);
  const subMerchantId = subMerchantIdValue(input.subMerchantId);
  return { apiKey: apiKeyValue(apiKey), ...(subMerchantId ? { subMerchantId } : {}) };
}

function dateToken(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function validDateToken(value: unknown, field: string): string {
  const token = requestText(value, field, 8, true);
  if (!/^\d{8}$/.test(token)) {
    throw new AccessHttpError(400, "INVALID_DATE_RANGE", `${field} 값은 yyyyMMdd 형식이어야 합니다.`);
  }
  const year = Number(token.slice(0, 4));
  const month = Number(token.slice(4, 6));
  const day = Number(token.slice(6, 8));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    throw new AccessHttpError(400, "INVALID_DATE_RANGE", `${field} 값이 유효한 날짜가 아닙니다.`);
  }
  return token;
}

function dateRangePayload(apiKey: unknown, value: unknown, today = new Date()): JsonRecord {
  const input = objectValue(value);
  const defaultDate = dateToken(today);
  const from = validDateToken(input.searchFromDate || defaultDate, "searchFromDate");
  const to = validDateToken(input.searchToDate || defaultDate, "searchToDate");
  const toUtc = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(4, 6)) - 1, Number(to.slice(6, 8)));
  const fromUtc = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(4, 6)) - 1, Number(from.slice(6, 8)));
  const days = (toUtc - fromUtc) / DAY_MS;
  if (days < 0 || days > 30) {
    throw new AccessHttpError(400, "INVALID_DATE_RANGE", "PayUp 조회기간은 시작일을 포함해 최대 31일이어야 합니다.");
  }
  const subMerchantId = subMerchantIdValue(input.subMerchantId);
  return {
    apiKey: apiKeyValue(apiKey),
    searchFromDate: from,
    searchToDate: to,
    ...(subMerchantId ? { subMerchantId } : {}),
  };
}

export function buildTransactionListPayload(apiKey: unknown, value: unknown, today = new Date()): JsonRecord {
  return dateRangePayload(apiKey, value, today);
}

export function buildSettlementQueryPayload(apiKey: unknown, value: unknown, today = new Date()): JsonRecord {
  const input = objectValue(value);
  const dateType = requestText(input.dateType, "dateType", 1) || "1";
  if (!["1", "2", "3"].includes(dateType)) {
    throw new AccessHttpError(400, "PAYUP_DATE_TYPE_INVALID", "dateType은 1, 2, 3 중 하나여야 합니다.");
  }
  return { ...dateRangePayload(apiKey, input, today), dateType };
}

function pick(source: JsonRecord, keys: readonly string[]): JsonRecord {
  return keys.reduce<JsonRecord>((result, key) => {
    const value = responseText(source[key]);
    if (value) result[key] = value;
    return result;
  }, {});
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return digits ? "***" : "";
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

export function maskPayupAccount(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 6) return `${digits.slice(0, 2)}****`;
  return `${digits.slice(0, 3)}-****-${digits.slice(-3)}`;
}

export function projectSubmerchant(value: unknown): JsonRecord {
  const source = objectValue(value);
  const result = pick(source, [
    "subMerchantId", "subMerchantName", "ownerName", "subBusinessNumber",
    "accountBank", "accountOwner", "businessScale",
  ]);
  result.subMerchantId = requiredResponseText(source, "subMerchantId");
  const phone = responseText(source.phoneNumber);
  const account = responseText(source.accountNumber);
  if (phone) result.phoneNumberMasked = maskPhone(phone);
  if (account) result.accountNumberMasked = maskPayupAccount(account);
  return result;
}

export function projectTransaction(value: unknown): JsonRecord {
  const source = objectValue(value);
  const result = pick(source, [
    "transactionId", "orderNumber", "authNumber", "cardName", "itemName", "totalAmount",
    "userName", "allotmentMonth", "authDatetime", "statusCode", "cancelDatetime",
  ]);
  result.transactionId = requiredResponseText(source, "transactionId");
  result.subList = Array.isArray(source.subList)
    ? source.subList.map((item) => pick(objectValue(item), [
      "subTransactionId", "subMerchantId", "subMerchantName", "subBusinessNumber",
      "amount", "businessScale",
    ]))
    : [];
  return result;
}

export function projectSettlementSummary(value: unknown): JsonRecord {
  const source = objectValue(value);
  const result = pick(source, [
    "subMerchantId", "subMerchantName", "closeDate", "targetDate", "supplyDate",
    "taxbillDate", "supplyType", "vatFlag", "accountCount",
    "accountRate", "accountAmount", "feeAmount", "vatAmount", "supplyAmount",
    "accountOwner", "accountBank", "businessScale",
  ]);
  result.subMerchantId = requiredResponseText(source, "subMerchantId");
  result.closeDate = requiredResponseText(source, "closeDate");
  result.supplyDate = requiredResponseText(source, "supplyDate");
  const account = responseText(source.accountNumber);
  if (account) result.accountNumberMasked = maskPayupAccount(account);
  return result;
}

export function projectSettlementDetail(value: unknown): JsonRecord {
  const source = objectValue(value);
  const result = pick(source, [
    "subMerchantId", "subMerchantName", "closeDate", "targetDate", "supplyDate",
    "transactionId", "subTransactionId", "orderNumber", "authDate", "cancelDate",
    "amount", "businessScale", "agentRate", "agentFee", "agentVat", "agentVatFlag",
  ]);
  result.subMerchantId = requiredResponseText(source, "subMerchantId");
  result.transactionId = requiredResponseText(source, "transactionId");
  result.subTransactionId = requiredResponseText(source, "subTransactionId");
  return result;
}

export function projectListResponse(
  value: unknown,
  projector: (item: unknown) => JsonRecord,
): { responseCode: string; responseMsg: string; merchantId: string; listCount: number; list: JsonRecord[] } {
  const source = objectValue(value);
  const responseCode = responseText(source.responseCode);
  const rawList = source.list;
  if (responseCode === "0000" && !Array.isArray(rawList)) {
    throw new AccessHttpError(502, "PAYUP_RESPONSE_CONTRACT_INVALID", "PayUp 성공 응답의 list가 배열이 아닙니다.");
  }
  const list = responseCode === "0000" && Array.isArray(rawList) ? rawList.map(projector) : [];
  const providerCount = Number(source.listCount);
  return {
    responseCode,
    responseMsg: responseText(source.responseMsg),
    merchantId: responseText(source.merchantId),
    listCount: Number.isInteger(providerCount) && providerCount >= 0 ? providerCount : list.length,
    list,
  };
}

export function assertStoredSubmerchantReady(
  value: unknown,
  subMerchantId: string,
  merchantId: string,
): void {
  const source = objectValue(value);
  if (!["ACTIVE", "APPROVED"].includes(responseText(source.status).toUpperCase())) {
    throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_NOT_READY", `${subMerchantId} 하위가맹점이 활성 상태가 아닙니다.`);
  }
  if (responseText(source.payup_sync_status).toUpperCase() !== "MATCHED") {
    throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_NOT_SYNCED", `${subMerchantId} 하위가맹점이 PayUp 목록과 대사되지 않았습니다.`);
  }
  if (!merchantId || responseText(source.merchant_id) !== merchantId) {
    throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_MID_MISMATCH", `${subMerchantId} 하위가맹점이 현재 MID에 매핑되지 않았습니다.`);
  }
}
