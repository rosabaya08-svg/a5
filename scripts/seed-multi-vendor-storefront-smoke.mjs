import { createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const root = process.cwd();
const firebaseToolsRoot = join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools");
const auth = require(join(firebaseToolsRoot, "lib", "auth.js"));
const scopes = require(join(firebaseToolsRoot, "lib", "scopes.js"));

const batchId = "multi-vendor-smoke-20260627";
const allowWrites = process.env.A5_SEED_MULTI_VENDOR_SMOKE === "1";
const verifyOnly = process.env.A5_VERIFY_MULTI_VENDOR_SMOKE === "1";
const storefrontBaseUrl = trimSlash(process.env.A5_STOREFRONT_BASE_URL || "https://signage-ai-a5.co.kr");
const functionBaseUrl = trimSlash(
  process.env.A5_FUNCTIONS_BASE_URL ||
    process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ||
    process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ||
    readDotenv(".env.local").NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ||
    readDotenv(".env.local").NEXT_PUBLIC_PAYMENT_API_BASE_URL ||
    "https://asia-northeast3-a5-closed-mall.cloudfunctions.net",
);

const nowIso = new Date().toISOString();
const projectId = readProjectId();

const vendors = [
  {
    businessNo: "9200000001",
    companyId: "company-smoke-9200000001",
    name: "검증입점사 1",
    managerEmail: "vendor9200000001@example.com",
    categoryId: "baby-goods",
    categoryLabel: "유아용품",
    brandLogo: "https://signage-ai-a5.co.kr/file.svg",
    products: [
      { suffix: "01", name: "검증 유아용품 1", listPrice: 50000, platformLowestPrice: 36000, closedMallPrice: 24500, stock: 21 },
      { suffix: "02", name: "검증 유아용품 2", listPrice: 42000, platformLowestPrice: 33000, closedMallPrice: 26800, stock: 18 },
    ],
  },
  {
    businessNo: "9200000002",
    companyId: "company-smoke-9200000002",
    name: "검증입점사 2",
    managerEmail: "vendor9200000002@example.com",
    categoryId: "electronics",
    categoryLabel: "전자제품",
    brandLogo: "https://signage-ai-a5.co.kr/file.svg",
    products: [
      { suffix: "01", name: "검증 전자제품 1", listPrice: 89000, platformLowestPrice: 73000, closedMallPrice: 54000, stock: 16 },
      { suffix: "02", name: "검증 전자제품 2", listPrice: 76000, platformLowestPrice: 68000, closedMallPrice: 59500, stock: 12 },
    ],
  },
  {
    businessNo: "9200000003",
    companyId: "company-smoke-9200000003",
    name: "검증입점사 3",
    managerEmail: "vendor9200000003@example.com",
    categoryId: "women-cosmetics",
    categoryLabel: "여성화장품",
    brandLogo: "https://signage-ai-a5.co.kr/file.svg",
    products: [
      { suffix: "01", name: "검증 여성화장품 1", listPrice: 36000, platformLowestPrice: 31000, closedMallPrice: 28600, stock: 24 },
      { suffix: "02", name: "검증 여성화장품 2", listPrice: 62000, platformLowestPrice: 47000, closedMallPrice: 39200, stock: 15 },
    ],
  },
  {
    businessNo: "9200000004",
    companyId: "company-smoke-9200000004",
    name: "검증입점사 4",
    managerEmail: "vendor9200000004@example.com",
    categoryId: "health-food",
    categoryLabel: "건강식품",
    brandLogo: "https://signage-ai-a5.co.kr/file.svg",
    products: [
      { suffix: "01", name: "검증 건강식품 1", listPrice: 48000, platformLowestPrice: 42000, closedMallPrice: 38500, stock: 30 },
      { suffix: "02", name: "검증 건강식품 2", listPrice: 54000, platformLowestPrice: 41000, closedMallPrice: 33500, stock: 22 },
    ],
  },
];

const expectedProducts = vendors.flatMap((vendor) => vendor.products.map((product) => productIdFor(vendor.businessNo, product.suffix)));
const obsoleteSmokeBusinessNos = ["9100000001", "9100000002", "9100000003", "9100000004"];
const results = [];

if (!allowWrites && !verifyOnly) {
  printPlan();
  console.log("\nDry run only. Set A5_SEED_MULTI_VENDOR_SMOKE=1 to create live verification data.");
  process.exit(0);
}

const oauthToken = await getFirebaseCliAccessToken();

if (allowWrites) {
  await step("archive_obsolete_910_smoke_documents", async () => {
    const archived = [];

    for (const businessNo of obsoleteSmokeBusinessNos) {
      const companyId = `company-smoke-${businessNo}`;
      await patchIfExists("companies", companyId, archiveFields("business_number_collision"));
      archived.push(`companies/${companyId}`);
      await patchIfExists("company_signup_requests", `request-smoke-${businessNo}`, archiveFields("business_number_collision"));
      await patchIfExists("company_onboarding", companyId, archiveFields("business_number_collision"));
      await patchIfExists("company_pg_credentials", companyId, archiveFields("business_number_collision"));
      await patchIfExists("company_brand_pages", `brand-smoke-${businessNo}`, archiveFields("business_number_collision"));
      await patchIfExists("brands", `brand-smoke-${businessNo}`, archiveFields("business_number_collision"));

      for (const suffix of ["01", "02"]) {
        await patchIfExists("products", productIdFor(businessNo, suffix), archiveProductFields("business_number_collision"));
        await patchIfExists("product_detail_pages", productIdFor(businessNo, suffix), archiveProductFields("business_number_collision"));
        await patchIfExists("product_options", optionIdFor(businessNo, suffix), archiveFields("business_number_collision"));
      }
    }

    return { ok: true, archivedBusinessNos: obsoleteSmokeBusinessNos, archivedRootCount: archived.length };
  });

  await step("write_vendor_companies", async () => {
    for (const vendor of vendors) {
      await patchFirestoreDocument("company_signup_requests", `request-smoke-${vendor.businessNo}`, buildSignupRequest(vendor));
      await patchFirestoreDocument("companies", vendor.companyId, buildCompany(vendor));
      await patchFirestoreDocument("company_onboarding", vendor.companyId, buildCompanyOnboarding(vendor));
      await patchFirestoreDocument("company_pg_credentials", vendor.companyId, buildCompanyPgCredential(vendor));
      await patchFirestoreDocument("company_brand_pages", `brand-smoke-${vendor.businessNo}`, buildBrandPage(vendor));
      await patchFirestoreDocument("brands", `brand-smoke-${vendor.businessNo}`, buildBrand(vendor));
    }

    return { ok: true, companyCount: vendors.length };
  });

  await step("write_vendor_products", async () => {
    for (const vendor of vendors) {
      for (const product of vendor.products) {
        await patchFirestoreDocument("product_detail_pages", productIdFor(vendor.businessNo, product.suffix), buildProductDetail(vendor, product));
        await patchFirestoreDocument("products", productIdFor(vendor.businessNo, product.suffix), buildProduct(vendor, product));
        await patchFirestoreDocument("product_options", optionIdFor(vendor.businessNo, product.suffix), buildProductOption(vendor, product));
      }
    }

    return { ok: true, productCount: expectedProducts.length };
  });

  await step("write_runtime_snapshot", async () => {
    const snapshot = await buildRuntimeSnapshot();
    await patchFirestoreDocument("storefront_runtime_snapshots", "latest", {
      ...snapshot,
      reason: `multi_vendor_smoke_seed:${batchId}`,
      updated_at: nowIso,
    });

    await patchFirestoreDocument("audit_logs", `storefront-runtime-snapshot-${snapshot.version}`, {
      type: "storefront_runtime_snapshot",
      action: "publish",
      reason: `multi_vendor_smoke_seed:${batchId}`,
      snapshot_id: "latest",
      version: snapshot.version,
      product_count: snapshot.products.length,
      source_collections: snapshot.sourceCollections,
      created_at: nowIso,
    });

    return { ok: true, productCount: snapshot.products.length, version: snapshot.version };
  });
}

await step("verify_companies_written", async () => {
  const verified = [];

  for (const vendor of vendors) {
    const company = await getFirestoreDocument("companies", vendor.companyId);
    assert(company.exists, `companies/${vendor.companyId} missing`);
    assert(company.fields.business_registration_number_normalized === vendor.businessNo, `${vendor.companyId} business number mismatch`);
    verified.push({
      companyId: vendor.companyId,
      businessNo: vendor.businessNo,
      status: company.fields.status,
      productRegistrationEnabled: company.fields.product_registration_enabled,
    });
  }

  return { ok: true, companies: verified };
});

await step("verify_company_login_tokens", async () => {
  const logins = [];

  for (const vendor of vendors) {
    const body = await postJson(`${functionBaseUrl}/companyBetaAuthToken`, {
      businessNo: vendor.businessNo,
      password: "1111",
    });

    assert(body.ok === true, `${vendor.businessNo} login did not return ok`);
    assert(body.companyId === vendor.companyId, `${vendor.businessNo} login companyId mismatch`);
    logins.push({ businessNo: vendor.businessNo, companyId: body.companyId, customToken: Boolean(body.customToken) });
  }

  return { ok: true, logins };
});

await step("verify_products_written", async () => {
  const verified = [];

  for (const vendor of vendors) {
    for (const product of vendor.products) {
      const productId = productIdFor(vendor.businessNo, product.suffix);
      const optionId = optionIdFor(vendor.businessNo, product.suffix);
      const productDoc = await getFirestoreDocument("products", productId);
      const optionDoc = await getFirestoreDocument("product_options", optionId);
      const detailDoc = await getFirestoreDocument("product_detail_pages", productId);

      assert(productDoc.exists, `products/${productId} missing`);
      assert(optionDoc.exists, `product_options/${optionId} missing`);
      assert(detailDoc.exists, `product_detail_pages/${productId} missing`);
      assert(productDoc.fields.company_id === vendor.companyId, `${productId} company_id mismatch`);
      assert(productDoc.fields.seller_business_no_normalized === vendor.businessNo, `${productId} seller business mismatch`);
      assert(productDoc.fields.tablet_path === `/tablet/products/${encodeURIComponent(productId)}/`, `${productId} tablet path mismatch`);
      assert(productDoc.fields.mobile_path === `/m/shop/product/${encodeURIComponent(productId)}/`, `${productId} mobile path mismatch`);
      assert(productDoc.fields.business_brand_path === `/a5mall/${encodeURIComponent(vendor.businessNo)}/`, `${productId} business brand path mismatch`);
      assert(productDoc.fields.business_product_path === `/a5mall/${encodeURIComponent(vendor.businessNo)}/${encodeURIComponent(productId)}/`, `${productId} business product path mismatch`);
      assert(productDoc.fields.a5mall_brand_path === productDoc.fields.business_brand_path, `${productId} a5mall brand path mismatch`);
      assert(productDoc.fields.a5mall_product_path === productDoc.fields.business_product_path, `${productId} a5mall product path mismatch`);
      assert(productDoc.fields.url_version === 2, `${productId} url_version mismatch`);

      verified.push({
        productId,
        companyId: productDoc.fields.company_id,
        businessNo: productDoc.fields.seller_business_no_normalized,
        price: productDoc.fields.closed_mall_price,
        discountRate: productDoc.fields.normal_discount_rate,
      });
    }
  }

  return { ok: true, products: verified };
});

await step("verify_runtime_snapshot_contains_products", async () => {
  const snapshot = await getFirestoreDocument("storefront_runtime_snapshots", "latest");
  assert(snapshot.exists, "storefront_runtime_snapshots/latest missing");
  const products = Array.isArray(snapshot.fields.products) ? snapshot.fields.products : [];
  const ids = new Set(products.map((item) => item.id || item.product_id));
  const missing = expectedProducts.filter((productId) => !ids.has(productId));
  assert(missing.length === 0, `snapshot missing products: ${missing.join(", ")}`);

  return { ok: true, expectedProductCount: expectedProducts.length, snapshotProductCount: products.length };
});

await step("verify_storefront_pages", async () => {
  const checks = [];
  const mainPage = await fetchText(`${storefrontBaseUrl}/tablet/products/`);
  const mobilePage = await fetchText(`${storefrontBaseUrl}/m/shop/`);
  checks.push({ url: `${storefrontBaseUrl}/tablet/products/`, status: mainPage.status, bytes: mainPage.text.length });
  checks.push({ url: `${storefrontBaseUrl}/m/shop/`, status: mobilePage.status, bytes: mobilePage.text.length });

  for (const vendor of vendors) {
    const brandUrl = `${storefrontBaseUrl}/a5mall/${encodeURIComponent(vendor.businessNo)}/`;
    const brand = await fetchText(brandUrl);
    assert(brand.status < 500, `${brandUrl} did not return a storefront page`);
    checks.push({ url: brandUrl, status: brand.status, bytes: brand.text.length });
  }

  for (const productId of expectedProducts) {
    const businessNo = productId.match(/^product-smoke-(\d+)-/)?.[1] ?? "";
    const tabletUrl = `${storefrontBaseUrl}/tablet/products/${encodeURIComponent(productId)}/`;
    const mobileUrl = `${storefrontBaseUrl}/m/shop/product/${encodeURIComponent(productId)}/`;
    const businessUrl = `${storefrontBaseUrl}/a5mall/${encodeURIComponent(businessNo)}/${encodeURIComponent(productId)}/`;
    const tablet = await fetchText(tabletUrl);
    const mobile = await fetchText(mobileUrl);
    const business = await fetchText(businessUrl);
    assert(business.status < 500, `${businessUrl} did not return a storefront page`);
    assert(tablet.text.includes(productId) || tablet.text.includes("검증"), `${tabletUrl} did not mention verification product`);
    assert(mobile.text.includes(productId) || mobile.text.includes("검증"), `${mobileUrl} did not mention verification product`);
    checks.push({ url: tabletUrl, status: tablet.status, bytes: tablet.text.length });
    checks.push({ url: mobileUrl, status: mobile.status, bytes: mobile.text.length });
    checks.push({ url: businessUrl, status: business.status, bytes: business.text.length });
  }

  return { ok: true, checks };
});

printSummary();

function printPlan() {
  console.log("Multi-vendor storefront smoke test plan");
  console.log(`Project: ${projectId}`);
  console.log(`Batch: ${batchId}`);
  console.log(`Storefront: ${storefrontBaseUrl}`);
  console.table(
    vendors.map((vendor) => ({
      businessNo: vendor.businessNo,
      loginPassword: "1111",
      companyId: vendor.companyId,
      name: vendor.name,
      productCount: vendor.products.length,
    })),
  );
}

function buildSignupRequest(vendor) {
  return {
    id: `request-smoke-${vendor.businessNo}`,
    companyName: vendor.name,
    company_name: vendor.name,
    businessRegistrationNumber: vendor.businessNo,
    business_registration_number: vendor.businessNo,
    business_registration_number_normalized: vendor.businessNo,
    representativeName: `${vendor.name} 대표`,
    representative_name: `${vendor.name} 대표`,
    managerName: `${vendor.name} 담당자`,
    manager_name: `${vendor.name} 담당자`,
    managerPhone: `010-${vendor.businessNo.slice(-4)}-1111`,
    manager_phone: `010-${vendor.businessNo.slice(-4)}-1111`,
    managerEmail: vendor.managerEmail,
    manager_email: vendor.managerEmail,
    commerceLicenseNo: `SMOKE-${vendor.businessNo}`,
    commerce_license_no: `SMOKE-${vendor.businessNo}`,
    csPhone: `010-${vendor.businessNo.slice(-4)}-2222`,
    cs_phone: `010-${vendor.businessNo.slice(-4)}-2222`,
    returnAddress: "검증 반품지",
    return_address: "검증 반품지",
    approvedCompanyId: vendor.companyId,
    approved_company_id: vendor.companyId,
    status: "active",
    approval_status: "approved",
    account_status: "active",
    product_registration_enabled: true,
    source: "multi_vendor_live_smoke",
    source_app: "company",
    source_channel: "multi_vendor_live_smoke",
    is_test_vendor: true,
    test_batch_id: batchId,
    createdAt: nowIso,
    updatedAt: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildCompany(vendor) {
  return {
    company_id: vendor.companyId,
    companyId: vendor.companyId,
    name: vendor.name,
    company_name: vendor.name,
    display_name: vendor.name,
    brand_name: vendor.name,
    business_registration_number: vendor.businessNo,
    businessRegistrationNumber: vendor.businessNo,
    business_registration_number_normalized: vendor.businessNo,
    manager_name: `${vendor.name} 담당자`,
    manager_phone: `010-${vendor.businessNo.slice(-4)}-1111`,
    manager_email: vendor.managerEmail,
    company_login_password_hash: hashCompanyPassword("1111"),
    company_login_password: "1111",
    login_password: "1111",
    default_password: "1111",
    account_status: "active",
    approval_status: "approved",
    status: "active",
    product_registration_status: "approved",
    product_registration_enabled: true,
    pg_provider: "payup",
    pg_merchant_status: "test_ready",
    guest_write_enabled: true,
    demo_read_enabled: false,
    source: "multi_vendor_live_smoke",
    source_app: "company",
    source_channel: "multi_vendor_live_smoke",
    is_test_vendor: true,
    test_batch_id: batchId,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildCompanyOnboarding(vendor) {
  return {
    company_id: vendor.companyId,
    companyId: vendor.companyId,
    business_registration_number: vendor.businessNo,
    business_registration_number_normalized: vendor.businessNo,
    status: "approved",
    product_registration_enabled: true,
    pg_provider: "payup",
    source: "multi_vendor_live_smoke",
    is_test_vendor: true,
    test_batch_id: batchId,
    updated_at: nowIso,
  };
}

function buildCompanyPgCredential(vendor) {
  return {
    id: vendor.companyId,
    company_id: vendor.companyId,
    companyId: vendor.companyId,
    business_registration_number: vendor.businessNo,
    business_registration_number_normalized: vendor.businessNo,
    provider: "payup",
    pg_provider: "payup",
    merchant_id: "standard_test",
    merchantId: "standard_test",
    credential_status: "test_ready",
    status: "test_ready",
    pg_merchant_status: "test_ready",
    settlement_owner: "payup_direct_company_contract",
    platform_commission_only: true,
    source: "multi_vendor_live_smoke",
    is_test_vendor: true,
    test_batch_id: batchId,
    updated_at: nowIso,
  };
}

function buildBrandPage(vendor) {
  return {
    id: `brand-smoke-${vendor.businessNo}`,
    company_id: vendor.companyId,
    companyId: vendor.companyId,
    business_registration_number: vendor.businessNo,
    business_registration_number_normalized: vendor.businessNo,
    brand_id: `brand-smoke-${vendor.businessNo}`,
    brand_name: vendor.name,
    name: vendor.name,
    title: vendor.name,
    logo_url: vendor.brandLogo,
    brand_logo_url: vendor.brandLogo,
    status: "active",
    approval_status: "approved",
    sections: [],
    source: "multi_vendor_live_smoke",
    is_test_vendor: true,
    test_batch_id: batchId,
    updated_at: nowIso,
  };
}

function buildBrand(vendor) {
  return {
    id: `brand-smoke-${vendor.businessNo}`,
    company_id: vendor.companyId,
    companyId: vendor.companyId,
    name: vendor.name,
    title: vendor.name,
    logo_url: vendor.brandLogo,
    brand_logo_url: vendor.brandLogo,
    status: "active",
    approval_status: "approved",
    source: "multi_vendor_live_smoke",
    is_test_vendor: true,
    test_batch_id: batchId,
    updated_at: nowIso,
  };
}

function buildProduct(vendor, product) {
  const productId = productIdFor(vendor.businessNo, product.suffix);
  const optionId = optionIdFor(vendor.businessNo, product.suffix);
  const comparison = buildComparison(product);

  return {
    id: productId,
    product_id: productId,
    productId,
    company_id: vendor.companyId,
    companyId: vendor.companyId,
    seller_company_id: vendor.companyId,
    sellerCompanyId: vendor.companyId,
    pg_owner_company_id: vendor.companyId,
    seller_company_name: vendor.name,
    sellerCompanyName: vendor.name,
    company_name: vendor.name,
    seller_business_no: vendor.businessNo,
    sellerBusinessNo: vendor.businessNo,
    company_business_no: vendor.businessNo,
    companyBusinessNo: vendor.businessNo,
    business_registration_number: vendor.businessNo,
    seller_business_no_normalized: vendor.businessNo,
    sellerBusinessNoNormalized: vendor.businessNo,
    company_business_no_normalized: vendor.businessNo,
    companyBusinessNoNormalized: vendor.businessNo,
    business_registration_number_normalized: vendor.businessNo,
    title: product.name,
    name: product.name,
    brand: vendor.name,
    subtitle: `${vendor.name} 검증 상품`,
    category: vendor.categoryLabel,
    category_id: vendor.categoryId,
    category_code: vendor.categoryId.toUpperCase().replace(/-/g, "_"),
    subcategory: vendor.categoryLabel,
    status: "active",
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    moderation_status: "registered",
    visibility: "visible",
    is_visible: true,
    price: product.closedMallPrice,
    closed_mall_price: product.closedMallPrice,
    platform_lowest_price: product.platformLowestPrice,
    list_price: product.listPrice,
    normal_discount_amount: comparison.normalDiscountAmount,
    platform_discount_amount: comparison.platformDiscountAmount,
    normal_discount_rate: comparison.normalDiscountRate,
    platform_discount_rate: comparison.platformDiscountRate,
    comparison,
    inventory: product.stock,
    stock: product.stock,
    option_ids: [optionId],
    optionIds: [optionId],
    ...buildProductUrlFields(productId, vendor.businessNo),
    image_url: "/file.svg",
    gallery: ["/file.svg"],
    detail_images: [],
    detail_sections: [
      {
        id: "summary",
        type: "text",
        title: "상품 소개",
        body: `${product.name} 상세 설명 검증 데이터입니다.`,
        sort_order: 1,
      },
    ],
    delivery_available: true,
    pickup_available: true,
    shipping_fee_policy: {
      mode: "free",
      baseFee: 0,
      freeThreshold: 0,
      remoteAreaEnabled: true,
      remoteAreaFee: 3000,
      islandAreaEnabled: true,
      islandAreaFee: 5000,
    },
    shippingFeePolicy: {
      mode: "free",
      baseFee: 0,
      freeThreshold: 0,
      remoteAreaEnabled: true,
      remoteAreaFee: 3000,
      islandAreaEnabled: true,
      islandAreaFee: 5000,
    },
    source_app: "company",
    source_channel: "multi_vendor_live_smoke",
    source: "multi_vendor_live_smoke",
    is_test_vendor: true,
    test_batch_id: batchId,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildProductDetail(vendor, product) {
  const productId = productIdFor(vendor.businessNo, product.suffix);
  const comparison = buildComparison(product);

  return {
    ...buildProduct(vendor, product),
    id: productId,
    product_name: product.name,
    sale_status: "판매 가능",
    summary: `${vendor.name} 검증 상품`,
    detail_description: `${product.name} 상세 설명 검증 데이터입니다.`,
    pricing: {
      listPrice: product.listPrice,
      platformLowestPrice: product.platformLowestPrice,
      closedMallPrice: product.closedMallPrice,
      normalDiscountAmount: comparison.normalDiscountAmount,
      platformDiscountAmount: comparison.platformDiscountAmount,
      normalDiscountRate: comparison.normalDiscountRate,
      platformDiscountRate: comparison.platformDiscountRate,
      platformPriceInvalid: false,
      exposeBlocked: false,
    },
    media: [
      {
        role: "representative",
        fileName: "file.svg",
        fileType: "image/svg+xml",
        fileSize: 0,
        url: "/file.svg",
        path: "/file.svg",
      },
    ],
    variants: [
      {
        id: "basic",
        optionPath: "기본",
        optionName: "기본",
        sku: `${vendor.businessNo}-${product.suffix}`,
        normalPrice: String(product.listPrice),
        platformLowestPrice: String(product.platformLowestPrice),
        baseClosedMallPrice: String(product.closedMallPrice),
        additionalPrice: "0",
        finalSalePrice: String(product.closedMallPrice),
        closedMallPrice: String(product.closedMallPrice),
        stock: String(product.stock),
        status: "판매가능",
      },
    ],
  };
}

function buildProductOption(vendor, product) {
  const productId = productIdFor(vendor.businessNo, product.suffix);
  const optionId = optionIdFor(vendor.businessNo, product.suffix);

  return {
    id: optionId,
    option_id: optionId,
    optionId,
    product_id: productId,
    productId,
    company_id: vendor.companyId,
    companyId: vendor.companyId,
    seller_business_no: vendor.businessNo,
    seller_business_no_normalized: vendor.businessNo,
    name: "기본",
    option_name: "기본",
    price_delta: 0,
    stock: product.stock,
    inventory: product.stock,
    status: "active",
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    sku: `${vendor.businessNo}-${product.suffix}`,
    source_app: "company",
    source_channel: "multi_vendor_live_smoke",
    source: "multi_vendor_live_smoke",
    is_test_vendor: true,
    test_batch_id: batchId,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildComparison(product) {
  const normalDiscountAmount = Math.max(product.listPrice - product.closedMallPrice, 0);
  const platformDiscountAmount = Math.max(product.platformLowestPrice - product.closedMallPrice, 0);

  return {
    listPrice: product.listPrice,
    platformLowestPrice: product.platformLowestPrice,
    closedMallPrice: product.closedMallPrice,
    normalDiscountAmount,
    platformDiscountAmount,
    normalDiscountRate: Math.round((normalDiscountAmount / Math.max(product.listPrice, 1)) * 100),
    platformDiscountRate: Math.round((platformDiscountAmount / Math.max(product.platformLowestPrice, 1)) * 100),
  };
}

async function buildRuntimeSnapshot() {
  const [products, homeSections, marketingBanners, marketingVideos, brands, brandPages, detailPages] = await Promise.all([
    readCollection("products", 1000),
    readCollection("home_sections", 200),
    readCollection("marketing_banners", 200),
    readCollection("marketing_videos", 200),
    readCollection("brands", 200),
    readCollection("company_brand_pages", 500),
    readCollection("product_detail_pages", 1000),
  ]);
  const version = Date.now();

  return {
    id: "latest",
    version,
    generatedAt: nowIso,
    sourceCollections: ["products", "home_sections", "marketing_banners", "marketing_videos", "brands", "company_brand_pages", "product_detail_pages"],
    products: products.filter((doc) => visibleProduct(doc.data)).map((doc) => ({ id: doc.id, ...doc.data })),
    content: {
      homeSections: homeSections.filter((doc) => visibleCms(doc.data)).map((doc) => ({ id: doc.id, ...doc.data })),
      marketingBanners: marketingBanners.filter((doc) => visibleCms(doc.data)).map((doc) => ({ id: doc.id, ...doc.data })),
      marketingVideos: marketingVideos.filter((doc) => visibleCms(doc.data)).map((doc) => ({ id: doc.id, ...doc.data })),
      brands: brands.filter((doc) => visibleCms(doc.data)).map((doc) => ({ id: doc.id, ...doc.data })),
      brandPages: brandPages.filter((doc) => visibleCms(doc.data)).map((doc) => ({ id: doc.id, ...doc.data })),
      detailPages: detailPages.filter((doc) => visibleCms(doc.data)).map((doc) => ({ id: doc.id, ...doc.data })),
    },
  };
}

function visibleCms(data) {
  const status = text(data.status ?? data.approval_status, "active").toLowerCase();
  const approval = text(data.approval_status ?? data.approvalStatus, status).toLowerCase();
  return ["active", "approved", "published", "live"].includes(status) || ["approved", "published", "live"].includes(approval);
}

function visibleProduct(data) {
  const status = text(data.status, "active").toLowerCase();
  const approval = text(data.approval_status ?? data.approvalStatus, "").toLowerCase();
  const productApproval = text(data.product_approval_status ?? data.productApprovalStatus ?? approval, approval).toLowerCase();
  const companyApproval = text(data.company_approval_status ?? data.companyApprovalStatus ?? approval, approval).toLowerCase();
  return ["active", "approved"].includes(status) && ["approved", "published", "live", ""].includes(productApproval) && ["approved", "published", "live", ""].includes(companyApproval);
}

function buildProductUrlFields(productId, businessNo = "") {
  const encodedProductId = encodeURIComponent(productId);
  const normalizedBusinessNo = String(businessNo || "").replace(/\D/g, "");
  const encodedBusinessNo = encodeURIComponent(normalizedBusinessNo);
  const tabletPath = `/tablet/products/${encodedProductId}/`;
  const mobilePath = `/m/shop/product/${encodedProductId}/`;
  const businessBrandPath = normalizedBusinessNo ? `/a5mall/${encodedBusinessNo}/` : "";
  const businessProductPath = normalizedBusinessNo ? `/a5mall/${encodedBusinessNo}/${encodedProductId}/` : "";
  const origin = "https://signage-ai-a5.co.kr";

  return {
    public_path: tabletPath,
    tablet_path: tabletPath,
    mobile_path: mobilePath,
    canonical_url: `${origin}${tabletPath}`,
    product_url: `${origin}${tabletPath}`,
    ad_target_path: tabletPath,
    mobile_ad_target_path: mobilePath,
    ...(normalizedBusinessNo
      ? {
          business_brand_path: businessBrandPath,
          businessBrandPath: businessBrandPath,
          business_product_path: businessProductPath,
          businessProductPath: businessProductPath,
          business_brand_url: `${origin}${businessBrandPath}`,
          businessBrandUrl: `${origin}${businessBrandPath}`,
          business_product_url: `${origin}${businessProductPath}`,
          businessProductUrl: `${origin}${businessProductPath}`,
          a5mall_brand_path: businessBrandPath,
          a5mall_product_path: businessProductPath,
        }
      : {}),
    url_version: normalizedBusinessNo ? 2 : 1,
  };
}

function productIdFor(businessNo, suffix) {
  return `product-smoke-${businessNo}-${suffix}`;
}

function optionIdFor(businessNo, suffix) {
  return `opt-smoke-${businessNo}-${suffix}-basic`;
}

function hashCompanyPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("base64url");
  return `pbkdf2_sha256$210000$${salt}$${hash}`;
}

async function step(name, action) {
  try {
    const result = await action();
    results.push({ name, status: "ok", result });
    console.log(`[ok] ${name}`);
    return result;
  } catch (error) {
    const normalized = normalizeError(error);
    results.push({ name, status: "failed", error: normalized });
    console.error(`[failed] ${name}: ${normalized.message}`);
    printSummary();
    process.exitCode = 1;
    throw error;
  }
}

async function getFirebaseCliAccessToken() {
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI login account was not found. Run firebase login first.");
  }
  const token = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  return token.access_token;
}

async function getFirestoreDocument(collection, id) {
  const response = await fetch(firestoreDocumentUrl(collection, id), {
    headers: { Authorization: `Bearer ${oauthToken}` },
  });

  if (response.status === 404) return { exists: false, id, fields: {} };

  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) throw new Error(`${collection}/${id} read failed: ${response.status} ${JSON.stringify(body).slice(0, 500)}`);

  return {
    exists: true,
    id,
    name: body.name,
    fields: decodeFirestoreFields(body.fields || {}),
  };
}

async function patchFirestoreDocument(collection, id, data) {
  const query = Object.keys(data).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const response = await fetch(`${firestoreDocumentUrl(collection, id)}?${query}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) throw new Error(`${collection}/${id} write failed: ${response.status} ${JSON.stringify(body).slice(0, 500)}`);
  return body;
}

async function patchIfExists(collection, id, data) {
  const document = await getFirestoreDocument(collection, id);
  if (!document.exists) return false;
  await patchFirestoreDocument(collection, id, data);
  return true;
}

function archiveFields(reason) {
  return {
    status: "archived",
    approval_status: "archived",
    visibility: "hidden",
    is_visible: false,
    archived_at: nowIso,
    archived_reason: reason,
    updated_at: nowIso,
  };
}

function archiveProductFields(reason) {
  return {
    ...archiveFields(reason),
    product_approval_status: "archived",
    company_approval_status: "archived",
    moderation_status: "archived",
  };
}

async function readCollection(collection, limit = 500) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        limit,
      },
    }),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) throw new Error(`${collection} read failed: ${response.status} ${JSON.stringify(body).slice(0, 500)}`);

  return (Array.isArray(body) ? body : [])
    .filter((item) => item.document)
    .map((item) => ({
      id: String(item.document.name || "").split("/").pop(),
      data: decodeFirestoreFields(item.document.fields || {}),
    }));
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) throw new Error(`${url} failed: ${response.status} ${JSON.stringify(result).slice(0, 500)}`);
  return result;
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  const textValue = await response.text().catch(() => "");
  if (!response.ok) throw new Error(`${url} failed: ${response.status} ${textValue.slice(0, 300)}`);
  return { status: response.status, text: textValue, finalUrl: response.url };
}

function firestoreDocumentUrl(collection, id) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
}

function encodeFirestoreFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeFirestoreValue(value)]));
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function readProjectId() {
  try {
    const rc = JSON.parse(readFileSync(join(root, ".firebaserc"), "utf8"));
    return rc.projects?.default || "a5-closed-mall";
  } catch {
    return "a5-closed-mall";
  }
}

function readDotenv(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return {};
  const result = {};

  for (const line of readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }

  return result;
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeError(error) {
  return {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
}

function printSummary() {
  console.log("\nMulti-vendor storefront smoke result");
  console.table(results.map((item) => ({ step: item.name, status: item.status })));
  console.log(JSON.stringify({ batchId, projectId, storefrontBaseUrl, expectedProducts, results }, null, 2));
}
