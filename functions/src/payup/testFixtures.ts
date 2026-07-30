import { AccessHttpError } from "../access/policy";

export type PayupTestDistributionLine = {
  lineType: "PRODUCT_AMOUNT" | "A5S_SYSTEM_FEE" | "PARTNER_MARGIN" | "SHIPPING_FEE";
  subMerchantId: string;
  organizationId: string;
  businessNumber: string;
  amountPerUnit: number;
};

export type PayupTestProductFixture = {
  id: string;
  title: string;
  price: number;
  lines: PayupTestDistributionLine[];
};

export const payupTestProductFixtures: PayupTestProductFixture[] = [
  {
    id: "payup-test-1004-2871103274",
    title: "[결제테스트] 위드커머스 단독 1,004원",
    price: 1004,
    lines: [{
      lineType: "PRODUCT_AMOUNT",
      subMerchantId: "wc2871103274",
      organizationId: "2871103274",
      businessNumber: "2871103274",
      amountPerUnit: 1004,
    }],
  },
  {
    id: "payup-test-1004-2158159188",
    title: "[결제테스트] (주)해성청과 단독 1,004원",
    price: 1004,
    lines: [{
      lineType: "PRODUCT_AMOUNT",
      subMerchantId: "wc2158159188",
      organizationId: "2158159188",
      businessNumber: "2158159188",
      amountPerUnit: 1004,
    }],
  },
  {
    id: "payup-test-6504-shipping-split",
    title: "[결제테스트] 상품·배송비 분배 6,504원",
    price: 6504,
    lines: [
      {
        lineType: "PRODUCT_AMOUNT",
        subMerchantId: "wc2158159188",
        organizationId: "2158159188",
        businessNumber: "2158159188",
        amountPerUnit: 1800,
      },
      {
        lineType: "SHIPPING_FEE",
        subMerchantId: "wc2871103274",
        organizationId: "2871103274",
        businessNumber: "2871103274",
        amountPerUnit: 4704,
      },
    ],
  },
  {
    id: "payup-test-2038-a5s-pricing",
    title: "[결제테스트] A5S 실제 가격계약 2,038원",
    price: 2038,
    lines: [
      {
        lineType: "PRODUCT_AMOUNT",
        subMerchantId: "wc2158159188",
        organizationId: "2158159188",
        businessNumber: "2158159188",
        amountPerUnit: 1004,
      },
      {
        lineType: "PARTNER_MARGIN",
        subMerchantId: "wc2871103274",
        organizationId: "2871103274",
        businessNumber: "2871103274",
        amountPerUnit: 1004,
      },
      {
        lineType: "A5S_SYSTEM_FEE",
        subMerchantId: "wc2871103274",
        organizationId: "2871103274",
        businessNumber: "2871103274",
        amountPerUnit: 30,
      },
    ],
  },
];

export const payupTestScenarios = [
  {
    id: "withcommerce_only_1004",
    productIds: ["payup-test-1004-2871103274"],
    expectedTotal: 1004,
    expectedCartPayList: [{ subMerchantId: "wc2871103274", amount: 1004 }],
  },
  {
    id: "haeseong_only_1004",
    productIds: ["payup-test-1004-2158159188"],
    expectedTotal: 1004,
    expectedCartPayList: [{ subMerchantId: "wc2158159188", amount: 1004 }],
  },
  {
    id: "two_company_cart_2008",
    productIds: ["payup-test-1004-2871103274", "payup-test-1004-2158159188"],
    expectedTotal: 2008,
    expectedCartPayList: [
      { subMerchantId: "wc2871103274", amount: 1004 },
      { subMerchantId: "wc2158159188", amount: 1004 },
    ],
  },
  {
    id: "shipping_split_6504",
    productIds: ["payup-test-6504-shipping-split"],
    expectedTotal: 6504,
    expectedCartPayList: [
      { subMerchantId: "wc2158159188", amount: 1800 },
      { subMerchantId: "wc2871103274", amount: 4704 },
    ],
  },
  {
    id: "a5s_pricing_contract_2038",
    productIds: ["payup-test-2038-a5s-pricing"],
    expectedTotal: 2038,
    expectedCartPayList: [
      { subMerchantId: "wc2158159188", amount: 1004 },
      { subMerchantId: "wc2871103274", amount: 1034 },
    ],
  },
];

export function assertPayupTestFixtureContracts() {
  const products = new Map(payupTestProductFixtures.map((fixture) => [fixture.id, fixture]));
  payupTestProductFixtures.forEach((fixture) => {
    const total = fixture.lines.reduce((sum, line) => sum + line.amountPerUnit, 0);
    if (total !== fixture.price) {
      throw new AccessHttpError(
        409,
        "PAYUP_TEST_FIXTURE_DISTRIBUTION_MISMATCH",
        `${fixture.id} 분배합계 ${total}원이 판매가 ${fixture.price}원과 일치하지 않습니다.`,
      );
    }
  });
  payupTestScenarios.forEach((scenario) => {
    const scenarioProducts = scenario.productIds.map((id) => products.get(id));
    if (scenarioProducts.some((fixture) => !fixture)) {
      throw new AccessHttpError(409, "PAYUP_TEST_FIXTURE_PRODUCT_MISSING", `${scenario.id} 테스트 상품이 없습니다.`);
    }
    const total = scenarioProducts.reduce((sum, fixture) => sum + (fixture?.price ?? 0), 0);
    const cartPayTotal = scenario.expectedCartPayList.reduce((sum, line) => sum + line.amount, 0);
    if (total !== scenario.expectedTotal || cartPayTotal !== scenario.expectedTotal) {
      throw new AccessHttpError(409, "PAYUP_TEST_SCENARIO_TOTAL_MISMATCH", `${scenario.id} 테스트 합계가 일치하지 않습니다.`);
    }
  });
  return {
    productCount: payupTestProductFixtures.length,
    scenarioCount: payupTestScenarios.length,
  };
}
