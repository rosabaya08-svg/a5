const test = require("node:test");
const assert = require("node:assert/strict");
const contract = require("../lib/payup/cartApiV12.js");
const runtime = require("../lib/payup/runtimeV2.js");
const providerHealth = require("../lib/payup/providerHealth.js");
const a5sSync = require("../lib/payup/a5sSubmerchantSync.js");
const testFixtures = require("../lib/payup/testFixtures.js");

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

test("partial update request can be safely projected without response-only fields", () => {
  const projected = contract.projectSubmerchantRequest({
    apiKey: API_KEY,
    gubun: "2",
    subMerchantId: "wc2158159188",
    subMerchantName: "merchant",
  });
  assert.deepEqual(projected, {
    subMerchantId: "wc2158159188",
    subMerchantName: "merchant",
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
  expectCode(
    () => contract.buildSubmerchantListPayload(API_KEY, { subMerchantId: "wc-invalid" }),
    "PAYUP_SUBMERCHANT_ID_INVALID",
  );
  expectCode(
    () => contract.buildSubmerchantUpdatePayload(API_KEY, {
      gubun: "1",
      subMerchantId: "wc2158159188",
      subMerchantName: "merchant",
      ownerName: "owner",
      phoneNumber: "01012345678",
      subBusinessNumber: "123456789",
      accountBank: "bank",
      accountNumber: "123456",
      accountOwner: "owner",
    }),
    "PAYUP_BUSINESS_NUMBER_INVALID",
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
  assert.equal(
    contract.buildTransactionListPayload(
      API_KEY,
      {},
      new Date("2026-07-29T15:30:00.000Z"),
    ).searchFromDate,
    "20260730",
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
    merchantId: "merchant-test",
    listCount: "1",
    addedLater: "ignored",
    list: [{
      transactionId: "tx-1",
      orderNumber: "order-1",
      authNumber: "12345678",
      cardName: "card",
      itemName: "item",
      totalAmount: "1004",
      userName: "buyer",
      allotmentMonth: "00",
      authDatetime: "20260730010101",
      statusCode: "2001",
      futureField: "ignored",
      subList: [{
        subTransactionId: "sub-tx-1",
        subMerchantId: "wc2158159188",
        subMerchantName: "merchant",
        subBusinessNumber: "2158159188",
        amount: "1004",
        businessScale: "일반",
        futureNestedField: "ignored",
      }],
    }],
  }, contract.projectTransaction, "merchant-test");
  assert.equal(projected.listCount, 1);
  assert.equal(projected.list[0].futureField, undefined);
  assert.equal(projected.list[0].subList[0].futureNestedField, undefined);
});

test("submerchant and settlement responses mask personal account data", () => {
  const submerchant = contract.projectSubmerchant({
    subMerchantId: "wc2158159188",
    subMerchantName: "merchant",
    ownerName: "owner",
    phoneNumber: "01012345678",
    subBusinessNumber: "2158159188",
    accountBank: "bank",
    accountNumber: "123456789012",
    accountOwner: "owner",
    businessScale: "일반",
  });
  assert.equal(submerchant.phoneNumberMasked, "010****5678");
  assert.equal(submerchant.accountNumberMasked, "123-****-012");
  assert.equal(submerchant.phoneNumber, undefined);
  assert.equal(submerchant.accountNumber, undefined);

  const settlement = contract.projectSettlementSummary({
    subMerchantId: "wc2158159188",
    subMerchantName: "merchant",
    closeDate: "20260701",
    targetDate: "20260701",
    supplyDate: "20260702",
    taxbillDate: "20260701",
    supplyType: "0001",
    vatFlag: "1",
    accountCount: "1",
    accountNumber: "123456789012",
    accountRate: "3.3",
    accountAmount: "1004",
    feeAmount: "0",
    vatAmount: "0",
    supplyAmount: "1004",
    accountOwner: "owner",
    accountBank: "bank",
    businessScale: "일반",
    rate: "ignored",
  });
  assert.equal(settlement.accountNumberMasked, "123-****-012");
  assert.equal(settlement.accountRate, "3.3");
  assert.equal(settlement.accountAmount, "1004");
  assert.equal(settlement.rate, undefined);
  assert.equal(settlement.accountNumber, undefined);

  const detail = contract.projectSettlementDetail({
    subMerchantId: "wc2158159188",
    subMerchantName: "merchant",
    closeDate: "20260701",
    targetDate: "20260701",
    supplyDate: "20260702",
    transactionId: "tx-1",
    subTransactionId: "sub-tx-1",
    orderNumber: "order-1",
    authDate: "20260701",
    amount: "1004",
    businessScale: "일반",
    agentRate: "3.3",
    agentFee: "0",
    agentVat: "0",
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

test("successful list response requires matching MID and exact listCount", () => {
  expectCode(
    () => contract.projectListResponse({
      responseCode: "0000",
      responseMsg: "OK",
      merchantId: "other-mid",
      listCount: "0",
      list: [],
    }, contract.projectSubmerchant, "expected-mid"),
    "PAYUP_RESPONSE_MID_MISMATCH",
  );
  expectCode(
    () => contract.projectListResponse({
      responseCode: "0000",
      responseMsg: "OK",
      merchantId: "expected-mid",
      listCount: "1",
      list: [],
    }, contract.projectSubmerchant, "expected-mid"),
    "PAYUP_RESPONSE_LIST_COUNT_MISMATCH",
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

test("fixed egress and IP registration block production but not the PayUp test server", () => {
  const base = {
    mode: "test",
    baseUrl: "https://api.testpayup.co.kr",
    merchantId: "test-mid",
    apiKey: API_KEY,
    apiCertKey: "",
    liveCallsEnabled: true,
    fixedIpRegistered: false,
    vpcConnector: "",
    fixedEgressIp: "",
    authReturnUrl: "",
    successReturnUrl: "",
    failureReturnUrl: "",
    orderPiiEncryptionKey: "",
  };
  assert.deepEqual(runtime.runtimeBlockers({ ...base, environment: "test" }), []);
  const productionBlockers = runtime.runtimeBlockers({
    ...base,
    environment: "production",
    mode: "production",
    baseUrl: "https://api.payup.co.kr",
  });
  assert.equal(productionBlockers.some((item) => item.includes("PAYUP_VPC_CONNECTOR")), true);
  assert.equal(productionBlockers.some((item) => item.includes("PAYUP_FIXED_EGRESS_IP")), true);
  assert.equal(productionBlockers.some((item) => item.includes("공인 IP")), true);
});

test("provider health blocks stale verified state on authentication and transport failures", () => {
  assert.equal(providerHealth.payupCartProviderStatus("0000"), "READY");
  assert.equal(providerHealth.payupCartProviderStatus("7001"), "AUTH_BLOCKED");
  assert.equal(providerHealth.payupCartProviderStatus("HTTP_502"), "UNAVAILABLE");
  assert.equal(providerHealth.payupCartProviderStatus("9108"), "API_BLOCKED");
  assert.deepEqual(
    providerHealth.payupCartProviderPatch({
      responseCode: "7001",
      responseMsg: "인증키를 확인해주세요.",
    }),
    {
      status: "AUTH_BLOCKED",
      checkoutBlocked: true,
      responseCode: "7001",
      responseMsg: "인증키를 확인해주세요.",
      subMerchantId: "",
      matched: false,
    },
  );
});

test("A5S source material is registration-ready but central storage remains masked", () => {
  const material = a5sSync.normalizeA5sSubmerchantMaterial({
    sourceProjectId: "a5s-mall",
    businessNumber: "2158159188",
    environment: "test",
    partner: {
      status: "active",
      applicationStatus: "approved",
      businessName: "(주)해성청과",
      ownerName: "대표자",
      phone: "01012345678",
      businessScale: "일반",
      payupTestSubMerchantId: "wc2158159188",
      partnerId: "partner-2158159188",
    },
    finance: {
      bankName: "국민은행",
      accountNo: "123-456-789012",
      accountHolder: "(주)해성청과",
    },
  });
  assert.equal(material.subMerchantId, "wc2158159188");
  assert.equal(material.accountNumber, "123456789012");
  const prepared = a5sSync.preparedCentralSubmerchant(material, {
    merchantId: "withcommerce_test",
    actorUid: "test-operator",
  });
  assert.equal(prepared.status, "PENDING_VERIFICATION");
  assert.equal(prepared.payup_sync_status, "PREPARED");
  assert.equal(prepared.registration_payload_ready, true);
  assert.equal(prepared.source_values_persisted, false);
  assert.equal(prepared.account_number, undefined);
  assert.equal(prepared.phone_number, undefined);
  assert.equal(prepared.account_number_masked, "123-****-012");
  assert.equal(prepared.phone_number_masked, "010****5678");
});

test("A5S test registration learns businessScale from PayUp and production requires an explicit ID", () => {
  const basePartner = {
    status: "active",
    applicationStatus: "approved",
    businessName: "merchant",
    ownerName: "owner",
    phone: "01012345678",
  };
  const finance = {
    bankName: "bank",
    accountNo: "1234567890",
    accountHolder: "owner",
  };
  const testMaterial = a5sSync.normalizeA5sSubmerchantMaterial({
    sourceProjectId: "a5s-mall",
    businessNumber: "2158159188",
    environment: "test",
    partner: basePartner,
    finance,
  });
  assert.equal(testMaterial.subMerchantId, "wc2158159188");
  assert.equal(testMaterial.businessScale, "");

  expectCode(
    () => a5sSync.normalizeA5sSubmerchantMaterial({
      sourceProjectId: "a5s-mall",
      businessNumber: "2158159188",
      environment: "production",
      partner: basePartner,
      finance,
    }),
    "A5S_SUBMERCHANT_SOURCE_INCOMPLETE",
  );
});

test("A5S sync rejects inactive or incomplete partner data", () => {
  expectCode(
    () => a5sSync.normalizeA5sSubmerchantMaterial({
      sourceProjectId: "a5s-mall",
      businessNumber: "2871103274",
      environment: "test",
      partner: {
        status: "pending",
        applicationStatus: "approved",
      },
      finance: {},
    }),
    "A5S_PARTNER_NOT_APPROVED",
  );
});

test("PayUp test fixtures cover 1004, 2008, 6504 and the current A5S 2038 price contract", () => {
  assert.deepEqual(testFixtures.assertPayupTestFixtureContracts(), {
    productCount: 4,
    scenarioCount: 5,
  });
  const scenarios = new Map(testFixtures.payupTestScenarios.map((scenario) => [scenario.id, scenario]));
  assert.equal(scenarios.get("two_company_cart_2008").expectedTotal, 2008);
  assert.equal(scenarios.get("shipping_split_6504").expectedTotal, 6504);
  assert.equal(scenarios.get("a5s_pricing_contract_2038").expectedTotal, 2038);
  assert.deepEqual(
    scenarios.get("shipping_split_6504").expectedCartPayList,
    [
      { subMerchantId: "wc2158159188", amount: 1800 },
      { subMerchantId: "wc2871103274", amount: 4704 },
    ],
  );
});
