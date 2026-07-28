export type InnopayResult<T extends Record<string, unknown>> =
  | {
      ok: true;
      data: T;
      resultCode: string;
      resultMsg: string;
      rawMasked: Record<string, unknown>;
    }
  | {
      ok: false;
      resultCode?: string;
      resultMsg: string;
      httpStatus?: number;
      rawMasked?: Record<string, unknown>;
    };

export type InnopaySmsPaymentRequest = {
  mid: string;
  payExpDate?: string;
  userId?: string;
  moid: string;
  goodsName: string;
  amt: string;
  dutyFreeAmt?: string;
  buyerName: string;
  buyerTel: string;
  buyerEmail?: string;
  svcPrdtCd: "03" | "04";
};

export type InnopaySmsPaymentResponse = {
  mid?: string;
  moid?: string;
  goodsName?: string;
  amt?: string;
  dutyFreeAmt?: string;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
  payExpDate?: string;
  userId?: string;
  resultCode?: string;
  resultMsg?: string;
};

export type InnopayCancelRequest = {
  mid: string;
  tid: string;
  svcCd: "01" | "02" | "04" | "07";
  cancelAmt: string;
  cancelMsg: string;
  cancelPwd: string;
  partialCancelCode?: "0" | "1";
  refundBankCd?: string;
  refundAcctNo?: string;
  refundAcctNm?: string;
};

export type InnopayCancelResponse = {
  pgTid?: string;
  resultCode?: string;
  resultMsg?: string;
  pgApprovalAmt?: string;
  pgAppDate?: string;
  pgAppTime?: string;
  stateCd?: string;
};

export type InnopayVbankRequest = {
  mid: string;
  licenseKey: string;
  moid: string;
  goodsCnt?: string;
  goodsName: string;
  amt: string;
  buyerName: string;
  buyerTel?: string;
  buyerEmail?: string;
  vbankBankCode: string;
  vbankExpDate?: string;
  vbankAccountName: string;
  countryCode: string;
  socNo: string;
  addr?: string;
  accountTel: string;
  receiptAmt?: string;
  receiptServiceAmt?: string;
  receiptType?: "0" | "1" | "2";
  receiptIdentity?: string;
  mallReserved?: string;
  userId?: string;
  buyerCode?: string;
  mallUserId?: string;
};

export type InnopayVbankResponse = {
  tid?: string;
  mid?: string;
  moid?: string;
  goodsName?: string;
  amt?: string;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
  authDate?: string;
  resultCode?: string;
  resultMsg?: string;
  vbankNum?: string;
  vbankBankNm?: string;
  mallReserved?: string;
};

export type InnopayVbankQueryRequest = {
  mid: string;
  licenseKey: string;
  moid?: string;
  reqCd: "S" | "D";
  vbankBankCode: string;
  vbankNum: string;
  vbankAccountName: string;
  countryCode: string;
  socNo: string;
  addr?: string;
  accountTel?: string;
};

export type InnopayVbankQueryResponse = {
  mid?: string;
  moid?: string;
  tid?: string;
  reqCd?: string;
  vbankBankCode?: string;
  vbankNum?: string;
  vbankAccountName?: string;
  amt?: string;
  resultCode?: string;
  resultMsg?: string;
};

export type InnopayVbankCancelRequest = {
  mid: string;
  licenseKey: string;
  tid: string;
  moid?: string;
  amt: string;
  vbankBankCode: string;
  vbankNum: string;
};

export type InnopayVbankCancelResponse = {
  tid?: string;
  mid?: string;
  moid?: string;
  resultCode?: string;
  resultMsg?: string;
};

export type InnopayTransactionLookup = {
  success?: boolean;
  resultCode?: string;
  resultMsg?: string;
  status?: string | number;
  statusName?: string;
  stateCd?: string | number;
  stateName?: string;
  tid?: string;
  pgTid?: string;
  moid?: string;
  amt?: string | number;
  amount?: string | number;
  goodsAmt?: string | number;
  pgApprovalAmt?: string | number;
  authDate?: string;
  pgAppDate?: string;
  pgAppTime?: string;
  data?: Record<string, unknown>;
  transaction?: Record<string, unknown>;
  [key: string]: unknown;
};

export type InnopayTransactionStatus = "approved" | "pending" | "cancelled" | "failed" | "unknown";

type ClientConfig = {
  baseUrl?: string;
  timeoutMs?: number;
};

export class InnopayRestClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ClientConfig = {}) {
    this.baseUrl = trimSlash(config.baseUrl || readEnv("INNOPAY_API_BASE_URL") || readEnv("PG_API_BASE_URL") || readEnv("INFINY_API_BASE_URL") || "https://api.innopay.co.kr");
    this.timeoutMs = config.timeoutMs ?? Number(readEnv("INNOPAY_API_TIMEOUT_MS") || 15000);
  }

  async createSmsPaymentRequest(input: InnopaySmsPaymentRequest): Promise<InnopayResult<InnopaySmsPaymentResponse>> {
    return this.postJson<InnopaySmsPaymentResponse>("/api/smsPayApi", compactObject(input), ["0000"]);
  }

  async cancelTransaction(input: InnopayCancelRequest): Promise<InnopayResult<InnopayCancelResponse>> {
    return this.postJson<InnopayCancelResponse>("/api/cancelApi", compactObject(input), ["2001"]);
  }

  async createVbank(input: InnopayVbankRequest): Promise<InnopayResult<InnopayVbankResponse>> {
    return this.postJson<InnopayVbankResponse>("/api/vbankApi", compactObject(input), ["4100"]);
  }

  async queryVbank(input: InnopayVbankQueryRequest): Promise<InnopayResult<InnopayVbankQueryResponse>> {
    return this.postJson<InnopayVbankQueryResponse>("/api/vacctInquery", compactObject(input), ["4100", "4200"]);
  }

  async cancelVbank(input: InnopayVbankCancelRequest): Promise<InnopayResult<InnopayVbankCancelResponse>> {
    return this.postJson<InnopayVbankCancelResponse>("/api/vbankCancel", compactObject(input), ["4100"]);
  }

  async getTransactionByTid(input: { mid: string; merchantKey: string; tid: string }): Promise<InnopayResult<InnopayTransactionLookup>> {
    return this.getJson<InnopayTransactionLookup>(`/v1/transactions/${encodeURIComponent(input.tid)}`, input);
  }

  async getTransactionByMoid(input: { mid: string; merchantKey: string; moid: string }): Promise<InnopayResult<InnopayTransactionLookup>> {
    return this.getJson<InnopayTransactionLookup>(`/v1/transactions/orders/${encodeURIComponent(input.moid)}`, input);
  }

  private async postJson<T extends Record<string, unknown>>(path: string, payload: Record<string, unknown>, successCodes: string[]): Promise<InnopayResult<T>> {
    const response = await this.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    return normalizeInnopayResponse<T>(response, successCodes);
  }

  private async getJson<T extends Record<string, unknown>>(path: string, input: { mid: string; merchantKey: string }): Promise<InnopayResult<T>> {
    const response = await this.request(path, {
      method: "GET",
      headers: {
        MID: input.mid,
        "Merchant-Key": input.merchantKey,
      },
    });

    return normalizeInnopayResponse<T>(response, ["0000"], true);
  }

  private async request(path: string, init: RequestInit): Promise<{ httpStatus: number; ok: boolean; body: Record<string, unknown> }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/${path.replace(/^\/+/, "")}`, {
        ...init,
        signal: controller.signal,
      });
      const text = await response.text();
      const body = parseJsonObject(text);

      return { httpStatus: response.status, ok: response.ok, body };
    } finally {
      clearTimeout(timer);
    }
  }
}

export function readInnopayTransactionData(value: Record<string, unknown>): InnopayTransactionLookup {
  const data = asRecord(value.data) || asRecord(value.transaction) || value;
  return data as InnopayTransactionLookup;
}

export function readInnopayTransactionStatus(value: Record<string, unknown>): InnopayTransactionStatus {
  const data = readInnopayTransactionData(value);
  const candidates = [
    data.status,
    data.statusName,
    data.stateCd,
    data.stateName,
    data.resultCode,
    data.resultMsg,
    data.payStatus,
    data.payStatusName,
    data.transactionStatus,
  ].map((item) => String(item ?? "").trim().toLowerCase()).filter(Boolean);

  if (candidates.some((item) => item === "25" || item.includes("결제완료") || item.includes("승인") || item.includes("approved") || item.includes("paid") || item.includes("complete"))) {
    return "approved";
  }
  if (candidates.some((item) => item === "85" || item.includes("취소") || item.includes("cancel"))) {
    return "cancelled";
  }
  if (candidates.some((item) => item.includes("실패") || item.includes("fail") || item.includes("reject") || item.includes("expired"))) {
    return "failed";
  }
  if (value.success === true || data.success === true) {
    return "pending";
  }

  return "unknown";
}

export function readInnopayTransactionId(value: Record<string, unknown>): string {
  const data = readInnopayTransactionData(value);
  return readString(data.tid ?? data.pgTid ?? data.transactionId ?? data.transaction_id);
}

export function readInnopayTransactionAmount(value: Record<string, unknown>): number | undefined {
  const data = readInnopayTransactionData(value);
  return readNumber(data.amt ?? data.amount ?? data.goodsAmt ?? data.pgApprovalAmt ?? data.approvalAmt);
}

export function maskInnopayPayload(data: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (/key|pwd|password|secret|card|idnum|socno|merchant-key|token/i.test(key)) {
      masked[key] = "[masked]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      masked[key] = maskInnopayPayload(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

function normalizeInnopayResponse<T extends Record<string, unknown>>(
  response: { httpStatus: number; ok: boolean; body: Record<string, unknown> },
  successCodes: string[],
  allowHttpSuccess = false,
): InnopayResult<T> {
  const resultCode = readString(response.body.resultCode ?? response.body.code);
  const resultMsg = readString(response.body.resultMsg ?? response.body.message ?? response.body.msg) || (response.ok ? "OK" : "InnoPay API request failed.");
  const rawMasked = maskInnopayPayload(response.body);
  const successByCode = resultCode ? successCodes.includes(resultCode) : false;
  const successByLookup = allowHttpSuccess && response.ok && response.body.success !== false;

  if (response.ok && (successByCode || successByLookup)) {
    return {
      ok: true,
      data: response.body as T,
      resultCode: resultCode || "HTTP_OK",
      resultMsg,
      rawMasked,
    };
  }

  return {
    ok: false,
    resultCode,
    resultMsg,
    httpStatus: response.httpStatus,
    rawMasked,
  };
}

function parseJsonObject(text: string): Record<string, unknown> {
  if (!text.trim()) return {};

  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : { value: parsed };
  } catch {
    return { raw: text };
  }
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null)) as T;
}

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function readString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
