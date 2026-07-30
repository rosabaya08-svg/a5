const test = require("node:test");
const assert = require("node:assert/strict");
const contract = require("../lib/payup/cartApiV12.js");

const API_KEY = "k".repeat(32);

function expectCode(fn, code) {
  assert.throws(fn, (error) => error && error.code === code);
}

test("registration payload matches the v1.2 required string contract", () => {
  const payload = contract.buildSubmerchantUpdatePayload(API_KEY, {
    gubun: "1",
    subMerchantId: "wc2158159188",
    subMerchantName: "(주)혜성청과",
    ownerName: "대표자",
    phoneNumber: "0212345678",
    subBusinessNumber: "2158159188",
    accountBank: "국민은행",
    accountNumber: "1234567890",
    accountOwner: "(주)혜성청과",
  });
  assert.equal(payload.apiKey, API_KEY);
  assert.equal(payload.subMerchantId, "wc2158159188");
  assert.equal(payload.subBusinessNumber, "2158159188");
});

test("update payload sends only non-empty changed fields", () => {
  const payload = contract.buildSubmerchantUpdatePayload(API_KEY, {
    gubun: "2",
    subMerchantId: "wc2158159188",
    subMerchantName: "혜성청과",
    ownerName: "",
    accountNumber: "",
  });
  assert.deepEqual(payload, {
    apiKey: API_KEY,
    gubun: "2",
    subMerchantId: "wc2158159188",
    subMerchantName: "혜성청과",
  });
});

test("invalid lengths and non-string inputs are rejected instead of truncated", () => {
  expectCode(
    () => contract.buildSubmerchantListPayload("short", {}),
    "PAYUP_API_KEY_LENGTH_INVALID",
  );
  expectCode(
    () => contract.buildSubmerchantListPayload(API_KEY, { subMerchantId: "x".repeat(21) }),
    "PAYUP_FIELD_LENGTH_INVALID",
  );
  expectCode(
    () => contract.buildSubmerchantListPayload(API_KEY, { subMerchantId: 1234 }),
    "PAYUP_FIELD_TYPE_INVALID",
  );
});

test("calendar dates are real and the inclusive range is at most 31 days", () => {
  expectCode(
    () => contract.buildTransactionListPayload(API_KEY, {
      searchFromDate: "20260231",
      searchToDate: "20260301",
    }),
    "INVALID_DATE_RANGE",
  );
  assert.equal(
    contract.buildTransactionListPayload(API_KEY, {
      searchFromDate: "20260701",
      searchToDate: "20260731",
    }).searchToDate,
    "20260731",
  );
  expectCode(
    () => contract.buildTransactionListPayload(API_KEY, {
      searchFromDate: "20260701",
      searchToDate: "20260801",
    }),
    "INVALID_DATE_RANGE",
  );
});

test("settlement dateType defaults only when empty and rejects unknown values", () => {
  assert.equal(
    contract.buildSettlementQueryPayload(API_KEY, {
      searchFromDate: "20260701",
      searchToDate: "20260701",
    }).dateType,
    "1",
  );
  expectCode(
    () => contract.buildSettlementQueryPayload(API_KEY, {
      searchFromDate: "20260701",
      searchToDate: "20260701",
      dateType: "9",
    }),
    "PAYUP_DATE_TYPE_INVALID",
  );
});

test("provider extensions are tolerated but are not persisted or returned", () => {
  const projected = contract.projectListResponse({
    responseCode: "0000",
    responseMsg: "정상",
    listCount: "1",
    addedLater: "ignored",
    list: [{
      transactionId: "tx-1",
      totalAmount: "1004",
      statusCode: "2001",
      futureField: "ignored",
      subList: [{
        subTransactionId: "sub-tx-1",
        subMerchantId: "wc2158159188",
        amount: "1004",
        futureNestedField: "ignored",
      }],
    }],
  }, contract.projectTransaction);
  assert.equal(projected.listCount, 1);
  assert.equal(projected.list[0].futureField, undefined);
  assert.equal(projected.list[0].subList[0].futureNestedField, undefined);
});

test("submerchant and settlement responses mask personal account data", () => {
  const submerchant = contract.projectSubmerchant({
    subMerchantId: "wc2158159188",
    phoneNumber: "01012345678",
    accountNumber: "123456789012",
  });
  assert.equal(submerchant.phoneNumberMasked, "010****5678");
  assert.equal(submerchant.accountNumberMasked, "123-****-012");
  assert.equal(submerchant.phoneNumber, undefined);
  assert.equal(submerchant.accountNumber, undefined);

  const settlement = contract.projectSettlementSummary({
    subMerchantId: "wc2158159188",
    closeDate: "20260701",
    supplyDate: "20260702",
    accountNumber: "123456789012",
    accountRate: "3.3",
    accountAmount: "1004",
    supplyAmount: "1004",
    rate: "ignored",
  });
  assert.equal(settlement.accountNumberMasked, "123-****-012");
  assert.equal(settlement.accountRate, "3.3");
  assert.equal(settlement.accountAmount, "1004");
  assert.equal(settlement.rate, undefined);
  assert.equal(settlement.accountNumber, undefined);

  const detail = contract.projectSettlementDetail({
    subMerchantId: "wc2158159188",
    transactionId: "tx-1",
    subTransactionId: "sub-tx-1",
    agentVatFlag: "1",
    vatFlag: "ignored",
  });
  assert.equal(detail.agentVatFlag, "1");
  assert.equal(detail.vatFlag, undefined);
});

test("successful list response must contain a JSON array", () => {
  expectCode(
    () => contract.projectListResponse({ responseCode: "0000", list: {} }, contract.projectSubmerchant),
    "PAYUP_RESPONSE_CONTRACT_INVALID",
  );
  expectCode(
    () => contract.projectListResponse({ responseCode: "0000", list: [{}] }, contract.projectTransaction),
    "PAYUP_RESPONSE_CONTRACT_INVALID",
  );
  assert.deepEqual(
    contract.projectListResponse({ responseCode: "9108", responseMsg: "미등록" }, contract.projectSubmerchant).list,
    [],
  );
});

test("stored readiness requires active, matched and current MID", () => {
  assert.doesNotThrow(() => contract.assertStoredSubmerchantReady({
    status: "ACTIVE",
    payup_sync_status: "MATCHED",
    merchant_id: "qsc0921",
  }, "wc2158159188", "qsc0921"));
  expectCode(
    () => contract.assertStoredSubmerchantReady({
      status: "ACTIVE",
      payup_sync_status: "PENDING",
      merchant_id: "qsc0921",
    }, "wc2158159188", "qsc0921"),
    "PAYUP_SUBMERCHANT_NOT_SYNCED",
  );
});
