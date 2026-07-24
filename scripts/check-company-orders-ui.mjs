import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const businessNo = String(process.env.A5_TEST_COMPANY_BUSINESS_NO || "").trim();
const password = String(process.env.A5_TEST_COMPANY_PASSWORD || "").trim();
if (!businessNo || !password) throw new Error("Test company credentials are required in environment variables.");

const baseUrl = "https://signage-ai-a5.co.kr";
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function waitForOrderLoad(page) {
  await page.waitForFunction(() => {
    const text = document.body?.innerText || "";
    return /주문 \d+건, 상품 \d+건, 클레임 \d+건을 불러왔습니다/.test(text)
      || text.includes("주문 데이터를 불러오지 못했습니다")
      || text.includes("Company admin permission is required")
      || text.includes("로그인이 필요합니다");
  }, { timeout: 30000 });
}

async function login(page) {
  await page.goto(`${baseUrl}/company/login/?inspect=1`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(1500);
  const passwordInput = page.locator('input[type="password"]').first();
  const businessInput = page.locator('input[name="businessRegistrationNumber"]').first();
  await businessInput.fill(businessNo);
  await passwordInput.fill(password);
  const loginButton = page.getByRole("button", { name: /로그인|입장/ }).last();
  await loginButton.click();
  await page.waitForTimeout(8000);
  if (new URL(page.url()).pathname.includes("/company/login")) {
    const alert = await page.locator("form p.bg-blue-50").textContent().catch(() => "") || "";
    const reason = alert.includes("계정을 찾을 수 없습니다")
      ? "account_not_found"
      : alert.includes("비밀번호")
        ? "password_mismatch"
        : alert.includes("토큰")
          ? "token_issue"
          : alert.includes("Firebase") || alert.includes("auth/")
            ? "firebase_auth"
            : alert.includes("권한")
            ? "permission"
            : "unknown";
    throw new Error(`Company test login did not reach the dashboard: ${reason}.`);
  }
  return page;
}

async function inspectViewport(label, viewport) {
  const page = await browser.newPage({ viewport });
  await login(page);
  let transientLoginRequired = false;
  let transientPermissionError = false;
  let observationActive = true;
  const observe = async () => {
    while (observationActive) {
      const text = await page.locator("body").innerText().catch(() => "");
      if (text.includes("로그인이 필요합니다")) transientLoginRequired = true;
      if (text.includes("Company admin permission is required")) transientPermissionError = true;
      await page.waitForTimeout(40);
    }
  };
  const observer = observe();

  await page.goto(`${baseUrl}/company/orders/?ui-check=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await waitForOrderLoad(page);
  const orderBody = await page.locator("body").innerText();

  await page.goto(`${baseUrl}/company/deliveries/?ui-check=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(1200);
  await page.goto(`${baseUrl}/company/orders/?ui-check=${Date.now() + 1}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await waitForOrderLoad(page);
  const secondOrderBody = await page.locator("body").innerText();

  observationActive = false;
  await observer;

  const loadMatch = orderBody.match(/주문 (\d+)건, 상품 (\d+)건, 클레임 (\d+)건을 불러왔습니다/);
  const dailySummaryCount = (orderBody.match(/주문 \d+건 · 상품 \d+건 · ₩?[\d,]+/g) || []).length;
  const receiverCount = (orderBody.match(/수령인:/g) || []).length;
  const sellerCount = (orderBody.match(/판매업체 /g) || []).length;
  const customerServiceCount = (orderBody.match(/고객센터 /g) || []).length;
  const deliveryStatusCount = (orderBody.match(/송장 대기|배송 준비|배송 중|배송 완료/g) || []).length;

  const result = {
    label,
    viewport,
    loginSucceeded: !page.url().includes("/company/login"),
    orderLoadSucceeded: Boolean(loadMatch),
    orderCount: loadMatch ? Number(loadMatch[1]) : 0,
    itemCount: loadMatch ? Number(loadMatch[2]) : 0,
    claimCount: loadMatch ? Number(loadMatch[3]) : 0,
    dailySummaryCount,
    receiverCount,
    sellerCount,
    customerServiceCount,
    deliveryStatusCount,
    sellerNameFallbackVisible: orderBody.includes("업체명 확인 전"),
    publicContactFallbackVisible: orderBody.includes("고객센터 확인 전"),
    loadErrorVisible: orderBody.includes("주문 데이터를 불러오지 못했습니다"),
    transientLoginRequired,
    transientPermissionError,
    secondNavigationLoaded: /주문 \d+건, 상품 \d+건, 클레임 \d+건을 불러왔습니다/.test(secondOrderBody),
    credentialsPrinted: 0,
    personalDataPrinted: 0,
  };
  await page.close();
  return result;
}

try {
  const desktop = await inspectViewport("PC", { width: 1440, height: 1000 });
  const mobile = await inspectViewport("MOBILE", { width: 390, height: 844 });
  const passed = [desktop, mobile].every((result) => (
    result.loginSucceeded
    && result.orderLoadSucceeded
    && result.itemCount > 0
    && result.dailySummaryCount > 0
    && result.receiverCount > 0
    && result.sellerCount > 0
    && result.customerServiceCount > 0
    && result.deliveryStatusCount > 0
    && !result.loadErrorVisible
    && !result.transientLoginRequired
    && !result.transientPermissionError
    && result.secondNavigationLoaded
  ));
  console.log(JSON.stringify({
    production: true,
    passed,
    desktop,
    mobile,
  }, null, 2));
  if (!passed) process.exitCode = 2;
} finally {
  await browser.close();
}
