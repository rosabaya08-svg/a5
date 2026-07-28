import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { join } from "node:path";

const root = process.cwd();
const defaultFunctionBaseUrl = "https://asia-northeast3-a5-closed-mall.cloudfunctions.net";
const defaultStorefrontBaseUrl = "http://localhost:5002";

class HttpError extends Error {
  constructor(status, body, message) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const projectId = readProjectId();
const dotenv = readDotenv(".env.local");
const functionsDotenv = readDotenv("functions/.env");
const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  dotenv.NEXT_PUBLIC_FIREBASE_API_KEY ||
  dotenv.FIREBASE_API_KEY ||
  "";
const firebaseProjectNumber =
  process.env.A5_IDENTITY_TOOLKIT_TARGET_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  process.env.FIREBASE_MESSAGING_SENDER_ID ||
  dotenv.A5_IDENTITY_TOOLKIT_TARGET_PROJECT_ID ||
  dotenv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  dotenv.FIREBASE_MESSAGING_SENDER_ID ||
  "";
const functionBaseUrl = trimSlash(
  process.env.A5_FUNCTIONS_BASE_URL ||
    process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ||
    process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ||
    dotenv.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ||
    dotenv.NEXT_PUBLIC_PAYMENT_API_BASE_URL ||
    defaultFunctionBaseUrl,
);
const storefrontBaseUrl = trimSlash(
  process.env.A5_STOREFRONT_BASE_URL ||
    process.env.A5_LOCAL_BASE_URL ||
    dotenv.A5_STOREFRONT_BASE_URL ||
    dotenv.A5_LOCAL_BASE_URL ||
    defaultStorefrontBaseUrl,
);

const allowWrites = process.env.A5_RUN_LIVE_WRITE_E2E === "1";
const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const businessNoUnderTest = String(process.env.A5_E2E_BUSINESS_NO || "").replace(/\D/g, "");
const signupRequestId = `e2e-signup-${businessNoUnderTest}-${stamp}`;
const signupCompanyId = `company-e2e-${businessNoUnderTest}-${stamp}`;
const draftId = `e2e-product-draft-${businessNoUnderTest}-${stamp}`;
const approvedProductId = `e2e-product-${businessNoUnderTest}-${stamp}`;
const draftVariantId = "variant-1";
const approvedOptionId = `${approvedProductId}-${draftVariantId}`;
const directProductId = `e2e-product-direct-${businessNoUnderTest}-${stamp}`;
const directOptionId = `${directProductId}-${draftVariantId}`;
const directProductName = `E2E Direct Product ${businessNoUnderTest}`;
const directProductPrice = 1400;
const directProductStock = 13;
const productEditRequestId = `e2e-product-edit-${businessNoUnderTest}-${stamp}`;
const productEditDetailId = approvedProductId;
const editedProductName = `E2E Product Edited ${businessNoUnderTest}`;
const editedProductPrice = 1300;
const editedProductStock = 11;
const e2eHomeHeroId = `000-e2e-home-hero-${businessNoUnderTest}-${stamp}`;
const e2eHomePromoId = `000-e2e-home-promo-${businessNoUnderTest}-${stamp}`;
const e2eMarketingVideoId = `000-e2e-marketing-video-${businessNoUnderTest}-${stamp}`;
const e2eBrandPageId = `000-e2e-brand-page-${businessNoUnderTest}-${stamp}`;
const e2eBrandId = `brand-e2e-${businessNoUnderTest}-${stamp}`;
const e2eHomeHeroTitle = `E2E Home Hero ${businessNoUnderTest}`;
const e2eHomePromoTitle = `E2E Home Promo ${businessNoUnderTest}`;
const e2eMarketingVideoTitle = `E2E Video Hotdeal ${businessNoUnderTest}`;
const e2eBrandName = `E2E Brand Hall ${businessNoUnderTest}`;
const preservedCompanyId = "company-test-1004";
const preservedBusinessNo = "7592901311";
const preservedProductId = "product-test-1004";
const preservedOptionId = "opt-test-1004-basic";
const preservedAmount = 1004;
const preservedPassword = "1004";
const e2eShortCode = `E2E${stamp.slice(-8)}`;
const requiredPaymentProvider = normalizeProvider(process.env.A5_REQUIRED_PAYMENT_PROVIDER || "payup");
const requireAdminE2e = process.env.A5_REQUIRE_ADMIN_E2E === "1";
const requireStorefrontE2e = process.env.A5_REQUIRE_STOREFRONT_E2E === "1";
const testLegacyProductApproval = process.env.A5_TEST_LEGACY_PRODUCT_APPROVAL === "1";
const keepE2eArtifacts = process.env.A5_KEEP_E2E_ARTIFACTS === "1";
const allowTemporaryAdmin = process.env.A5_ALLOW_TEMP_ADMIN_TOKEN !== "0";
const signupVerificationId = `e2e-email-signup-${businessNoUnderTest}-${stamp}`;
const signupVerificationToken = `e2e-signup-token-${businessNoUnderTest}-${stamp}`;
const emailVerificationPepper =
  process.env.A5_E2E_EMAIL_VERIFICATION_PEPPER ||
  process.env.A5_EMAIL_VERIFICATION_SECRET ||
  process.env.A5_COMMERCE_LIVE_READ_TOKEN ||
  functionsDotenv.A5_EMAIL_VERIFICATION_SECRET ||
  functionsDotenv.A5_COMMERCE_LIVE_READ_TOKEN ||
  dotenv.A5_EMAIL_VERIFICATION_SECRET ||
  dotenv.A5_COMMERCE_LIVE_READ_TOKEN ||
  "a5-company-email-verification";
const adminEmail =
  process.env.A5_ADMIN_EMAIL ||
  process.env.A5_SUPER_ADMIN_EMAIL ||
  dotenv.A5_ADMIN_EMAIL ||
  dotenv.A5_SUPER_ADMIN_EMAIL ||
  "";
const adminPassword =
  process.env.A5_ADMIN_PASSWORD ||
  process.env.A5_SUPER_ADMIN_PASSWORD ||
  dotenv.A5_ADMIN_PASSWORD ||
  dotenv.A5_SUPER_ADMIN_PASSWORD ||
  "";

const results = [];
const context = {
  projectId,
  functionBaseUrl,
  signupRequestId,
  signupCompanyId,
  draftId,
  approvedProductId,
  approvedOptionId,
  directProductId,
  directOptionId,
  e2eShortCode,
  signupVerificationId,
  e2eHomeHeroId,
  e2eHomePromoId,
  e2eMarketingVideoId,
  e2eBrandPageId,
  e2eBrandId,
  requiredPaymentProvider,
  requireAdminE2e,
  requireStorefrontE2e,
  keepE2eArtifacts,
  allowTemporaryAdmin,
  identityToolkitTargetProjectId: firebaseProjectNumber || projectId,
  storefrontBaseUrl: storefrontBaseUrl || null,
};

if (!allowWrites) {
  console.error("Refusing to run live write E2E without A5_RUN_LIVE_WRITE_E2E=1.");
  console.error("This script creates controlled E2E documents in live Firebase.");
  process.exit(2);
}

if (!businessNoUnderTest) {
  console.error("A5_E2E_BUSINESS_NO is required for live write E2E.");
  console.error("Do not use a real preserved company unless an explicit override is added for that case.");
  process.exit(2);
}

if (businessNoUnderTest === "3123600654" && process.env.A5_ALLOW_MAIN_3123600654_E2E !== "1") {
  console.error("Refusing to run live write E2E against preserved company business number 3123600654.");
  console.error("Set A5_ALLOW_MAIN_3123600654_E2E=1 only for a deliberate one-off test.");
  process.exit(2);
}

if (!apiKey) {
  console.error("NEXT_PUBLIC_FIREBASE_API_KEY is required for Firebase Auth token exchange.");
  process.exit(2);
}

let oauthToken = "";
let adminIdToken = String(process.env.A5_ADMIN_ID_TOKEN || "").trim();
let companyIdToken = "";
let productApprovalVerified = false;
let directProductVerified = false;
let guestShopSessionResponse = null;
let temporaryAdminUser = null;
let e2eCompanyAuthUid = "";

await runStep("firebase_cli_oauth_token", true, async () => {
  oauthToken = await getFirebaseCliAccessToken();
  return { ok: true, source: "firebase_cli", tokenPresent: Boolean(oauthToken) };
});

if (adminIdToken) {
  const suppliedAdminIdToken = adminIdToken;
  adminIdToken = "";
  await runStep("super_admin_id_token_env", false, async () => {
    const body = await postFunction("authBootstrap", { action: "status" }, { idToken: suppliedAdminIdToken });
    adminIdToken = suppliedAdminIdToken;
    return {
      ok: body.ok === true,
      source: body.source,
      actorEmail: body.actor?.email,
      tokenSource: "A5_ADMIN_ID_TOKEN",
    };
  });
} else if (adminEmail && adminPassword) {
  await runStep("super_admin_email_password_sign_in", false, async () => {
    const exchange = await exchangeEmailPasswordForFirebaseIdToken(adminEmail, adminPassword);
    const body = await postFunction("authBootstrap", { action: "status" }, { idToken: exchange.idToken });
    adminIdToken = exchange.idToken;
    return {
      ok: body.ok === true,
      source: body.source,
      actorEmail: body.actor?.email,
      tokenSource: "A5_ADMIN_EMAIL/A5_ADMIN_PASSWORD",
      localId: exchange.localId,
    };
  });
} else if (allowTemporaryAdmin) {
  await runStep("super_admin_temporary_user_token", requireAdminE2e, async () => {
    temporaryAdminUser = await createTemporarySuperAdminUser();
    const exchange = await exchangeEmailPasswordForFirebaseIdToken(temporaryAdminUser.email, temporaryAdminUser.password);
    const body = await postFunction("authBootstrap", { action: "status" }, { idToken: exchange.idToken });
    adminIdToken = exchange.idToken;
    return {
      ok: body.ok === true,
      source: body.source,
      actorEmail: body.actor?.email,
      tokenSource: "temporary_identity_toolkit_admin",
      localId: exchange.localId,
    };
  });
} else {
  await runStep("super_admin_id_token_exchange", false, async () => {
    const exchange = await exchangeGoogleAccessTokenForFirebaseIdToken(oauthToken);
    adminIdToken = exchange.idToken;
    return {
      ok: true,
      email: exchange.email,
      localId: exchange.localId,
      masterEmailMatched: String(exchange.email || "").toLowerCase() === "rosabaya08@gmail.com",
    };
  });
}

let signupEmailVerification = null;
await runStep("seed_signup_email_verification_e2e_company", true, async () => {
  const signup = buildSignupRequest();
  const email = String(signup.managerEmail || "").trim().toLowerCase();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await patchFirestoreDocument("company_email_verifications", signupVerificationId, {
    id: signupVerificationId,
    purpose: "signup",
    email,
    company_id: signupCompanyId,
    business_no_normalized: businessNoUnderTest,
    attempts: 0,
    max_attempts: 5,
    status: "verified",
    email_status: "e2e_seeded",
    verification_token_hash: hashVerificationSecret(signupVerificationToken, signupVerificationId, email, "signup", "token"),
    verified_at: new Date().toISOString(),
    token_expires_at: expiresAt,
    expires_at: expiresAt,
    source: "live_write_e2e",
    updated_at: new Date().toISOString(),
  });

  signupEmailVerification = {
    verificationId: signupVerificationId,
    verificationToken: signupVerificationToken,
    email,
  };

  return {
    ok: true,
    verificationId: signupVerificationId,
    email,
    tokenSeeded: true,
  };
});

await runStep("company_signup_submit_e2e_company", true, async () => {
  const body = await postFunction("companySignupSubmit", {
    request: buildSignupRequest(),
    companyId: signupCompanyId,
    loginPassword: `E2E-${businessNoUnderTest}-${stamp}`,
    emailVerification: signupEmailVerification,
  });
  return { ok: body.ok === true, requestId: body.requestId, companyId: body.companyId, documentCount: body.documentCount };
});

await runStep("verify_signup_submit_firestore", true, async () => {
  const request = await getFirestoreDocument("company_signup_requests", signupRequestId);
  const company = await getFirestoreDocument("companies", signupCompanyId);
  assertExists(request, `company_signup_requests/${signupRequestId}`);
  assertExists(company, `companies/${signupCompanyId}`);
  return {
    ok: true,
    requestStatus: request.fields?.status,
    companyStatus: company.fields?.status,
    businessNo: company.fields?.business_registration_number,
  };
});

if (adminIdToken) {
  await runStep("company_signup_review_approve_e2e_company", requireAdminE2e, async () => {
    const body = await postFunction(
      "companySignupReview",
      {
        requestId: signupRequestId,
        action: "approve",
        companyId: signupCompanyId,
        merchantId: `payup-e2e-${businessNoUnderTest}`,
        merchantStatus: "mid_issued",
        reviewMemo: "Live E2E approval gate test. Payup credential is intentionally not activated.",
      },
      { idToken: adminIdToken },
    );
    e2eCompanyAuthUid = body.authProvisioning?.uid || "";
    return { ok: body.ok === true, requestId: body.requestId, companyId: body.companyId, authProvisioning: body.authProvisioning };
  });

  await runStep("verify_signup_review_firestore", requireAdminE2e, async () => {
    const request = await getFirestoreDocument("company_signup_requests", signupRequestId);
    const company = await getFirestoreDocument("companies", signupCompanyId);
    const pg = await getFirestoreDocument("company_pg_credentials", signupCompanyId);
    const onboarding = await getFirestoreDocument("company_onboarding", signupCompanyId);
    assertExists(request, `company_signup_requests/${signupRequestId}`);
    assertExists(company, `companies/${signupCompanyId}`);
    assertExists(pg, `company_pg_credentials/${signupCompanyId}`);
    assertExists(onboarding, `company_onboarding/${signupCompanyId}`);
    assertEqual(request.fields?.status, "approved", "company signup request status");
    assertEqual(company.fields?.status, "approved", "company status");
    assertEqual(company.fields?.approval_status, "approved", "company approval_status");
    assertEqual(company.fields?.product_registration_enabled, true, "company product_registration_enabled");
    const pgProvider = pg.fields?.provider || pg.fields?.pg_provider;
    const merchantStatus = pg.fields?.status || pg.fields?.credential_status || pg.fields?.pg_merchant_status;
    assertEqual(pgProvider, "payup", "company_pg_credentials provider");
    assertEqual(merchantStatus, "mid_issued", "company_pg_credentials merchant status");
    return {
      ok: true,
      requestStatus: request.fields?.status,
      companyStatus: company.fields?.status,
      pgProvider,
      merchantStatus,
      productRegistrationEnabled: company.fields?.product_registration_enabled,
    };
  });

  await runStep("company_direct_product_publish_seed_e2e_company", requireAdminE2e, async () => {
    await patchFirestoreDocument("product_detail_pages", directProductId, buildDirectProductDetailRecord());
    await patchFirestoreDocument("products", directProductId, buildDirectProductRecord());
    await patchFirestoreDocument("product_options", directOptionId, buildDirectProductOptionRecord());

    const product = await getFirestoreDocument("products", directProductId);
    const option = await getFirestoreDocument("product_options", directOptionId);
    const detail = await getFirestoreDocument("product_detail_pages", directProductId);
    assertExists(product, `products/${directProductId}`);
    assertExists(option, `product_options/${directOptionId}`);
    assertExists(detail, `product_detail_pages/${directProductId}`);
    assertEqual(product.fields?.status, "active", "direct product status");
    assertEqual(product.fields?.moderation_status, "registered", "direct product moderation_status");
    assertEqual(option.fields?.status, "active", "direct option status");
    assertProductUrlFields(product.fields, directProductId);
    directProductVerified = true;

    return {
      ok: true,
      productId: directProductId,
      optionId: directOptionId,
      detailId: directProductId,
      name: product.fields?.name,
      price: product.fields?.closed_mall_price,
      stock: product.fields?.stock,
      tabletPath: product.fields?.tablet_path,
      mobilePath: product.fields?.mobile_path,
    };
  });

  await runStep("publish_storefront_snapshot_after_direct_product_publish", requireAdminE2e, async () => {
    const body = await postFunction(
      "adminStorefrontSnapshotPublish",
      { reason: `live_write_e2e_direct_product_publish:${directProductId}` },
      { idToken: adminIdToken },
    );
    return {
      ok: body.ok === true,
      productCount: body.snapshot?.productCount,
      version: body.snapshot?.version,
      reason: body.snapshot?.reason,
    };
  });

  if (testLegacyProductApproval) {
  await runStep("seed_product_draft_e2e_company", requireAdminE2e, async () => {
    await patchFirestoreDocument("product_detail_pages", draftId, buildProductDraft());
    const draft = await getFirestoreDocument("product_detail_pages", draftId);
    assertExists(draft, `product_detail_pages/${draftId}`);
    return {
      ok: true,
      draftId,
      productId: draft.fields?.product_id,
      companyId: draft.fields?.company_id,
      status: draft.fields?.status,
    };
  });

  await runStep("admin_product_review_approve_e2e_company", requireAdminE2e, async () => {
    const body = await postFunction(
      "adminProductReview",
      {
        draftId,
        status: "approved",
        reviewMemo: "Live E2E product approval gate test.",
      },
      { idToken: adminIdToken },
    );
    return {
      ok: body.ok === true,
      productId: body.productId,
      draftId: body.draftId,
      companyId: body.companyId,
      optionCount: body.optionCount,
      writtenCollections: body.writtenCollections,
    };
  });

  await runStep("verify_product_approval_firestore", requireAdminE2e, async () => {
    const product = await getFirestoreDocument("products", approvedProductId);
    const option = await getFirestoreDocument("product_options", approvedOptionId);
    const detail = await getFirestoreDocument("product_detail_pages", draftId);
    assertExists(product, `products/${approvedProductId}`);
    assertExists(option, `product_options/${approvedOptionId}`);
    assertExists(detail, `product_detail_pages/${draftId}`);
    assertEqual(product.fields?.status, "active", "approved product status");
    assertEqual(product.fields?.approval_status, "approved", "approved product approval_status");
    assertEqual(product.fields?.product_approval_status, "approved", "approved product product_approval_status");
    assertEqual(product.fields?.company_approval_status, "approved", "approved product company_approval_status");
    assertEqual(option.fields?.status, "active", "approved option status");
    assertEqual(option.fields?.product_id, approvedProductId, "approved option product_id");
    assertProductUrlFields(product.fields, approvedProductId);
    productApprovalVerified = true;
    return {
      ok: true,
      productStatus: product.fields?.status,
      approvalStatus: product.fields?.approval_status,
      optionStatus: option.fields?.status,
      closedMallPrice: product.fields?.closed_mall_price,
      tabletPath: product.fields?.tablet_path,
      mobilePath: product.fields?.mobile_path,
      productUrl: product.fields?.product_url,
    };
  });

  await runStep("seed_product_edit_request_e2e_company", requireAdminE2e, async () => {
    await patchFirestoreDocument("company_product_edit_requests", productEditRequestId, buildProductEditRequest());
    const request = await getFirestoreDocument("company_product_edit_requests", productEditRequestId);
    assertExists(request, `company_product_edit_requests/${productEditRequestId}`);
    assertEqual(request.fields?.status, "pending_approval", "product edit request status");
    assertEqual(request.fields?.product_id, approvedProductId, "product edit request product_id");
    return {
      ok: true,
      editRequestId: productEditRequestId,
      productId: request.fields?.product_id,
      status: request.fields?.status,
      requestedName: request.fields?.requested?.name,
      requestedPrice: request.fields?.requested?.price,
    };
  });

  await runStep("admin_product_edit_review_approve_e2e_company", requireAdminE2e, async () => {
    const body = await postFunction(
      "adminProductReview",
      {
        draftId: productEditRequestId,
        status: "approved",
        reviewMemo: "Live E2E product edit approval gate test.",
      },
      { idToken: adminIdToken },
    );
    return {
      ok: body.ok === true,
      productId: body.productId,
      draftId: body.draftId,
      companyId: body.companyId,
      editRequest: body.editRequest,
      optionCount: body.optionCount,
      writtenCollections: body.writtenCollections,
    };
  });

  await runStep("verify_product_edit_approval_firestore", requireAdminE2e, async () => {
    const request = await getFirestoreDocument("company_product_edit_requests", productEditRequestId);
    const product = await getFirestoreDocument("products", approvedProductId);
    const option = await getFirestoreDocument("product_options", approvedOptionId);
    const detail = await getFirestoreDocument("product_detail_pages", productEditDetailId);
    assertExists(request, `company_product_edit_requests/${productEditRequestId}`);
    assertExists(product, `products/${approvedProductId}`);
    assertExists(option, `product_options/${approvedOptionId}`);
    assertExists(detail, `product_detail_pages/${productEditDetailId}`);
    assertEqual(request.fields?.status, "approved", "product edit request status");
    assertEqual(product.fields?.name, editedProductName, "edited product name");
    assertEqual(product.fields?.title, editedProductName, "edited product title");
    assertEqual(product.fields?.closed_mall_price, editedProductPrice, "edited product closed_mall_price");
    assertEqual(product.fields?.price, editedProductPrice, "edited product price");
    assertEqual(product.fields?.stock, editedProductStock, "edited product stock");
    assertEqual(option.fields?.stock, editedProductStock, "edited option stock");
    assertEqual(detail.fields?.product_id, approvedProductId, "edited product detail product_id");
    assertEqual(detail.fields?.title, editedProductName, "edited product detail title");
    assertProductUrlFields(product.fields, approvedProductId);
    return {
      ok: true,
      editRequestStatus: request.fields?.status,
      productName: product.fields?.name,
      productPrice: product.fields?.price,
      productStock: product.fields?.stock,
      optionStock: option.fields?.stock,
      detailId: productEditDetailId,
    };
  });

  }

  await runStep("admin_product_moderation_suspend_e2e_company", requireAdminE2e, async () => {
    const body = await postFunction(
      "adminProductModeration",
      {
        productId: directProductId,
        action: "suspend",
        reason: "Live E2E product moderation suspend gate test.",
      },
      { idToken: adminIdToken },
    );
    return {
      ok: body.ok === true,
      productId: body.productId,
      status: body.status,
      moderationStatus: body.moderationStatus,
      optionCount: body.optionCount,
      snapshotPublish: body.snapshotPublish,
    };
  });

  await runStep("verify_product_moderation_suspend_firestore", requireAdminE2e, async () => {
    const product = await getFirestoreDocument("products", directProductId);
    const option = await getFirestoreDocument("product_options", directOptionId);
    assertExists(product, `products/${directProductId}`);
    assertExists(option, `product_options/${directOptionId}`);
    assertEqual(product.fields?.status, "suspended", "suspended product status");
    assertEqual(product.fields?.moderation_status, "restricted", "suspended product moderation_status");
    assertEqual(option.fields?.status, "suspended", "suspended option status");
    assertEqual(option.fields?.moderation_status, "restricted", "suspended option moderation_status");
    return {
      ok: true,
      productStatus: product.fields?.status,
      productModerationStatus: product.fields?.moderation_status,
      optionStatus: option.fields?.status,
      optionModerationStatus: option.fields?.moderation_status,
    };
  });

  await runStep("admin_product_moderation_restore_e2e_company", requireAdminE2e, async () => {
    const body = await postFunction(
      "adminProductModeration",
      {
        productId: directProductId,
        action: "restore",
        reason: "Live E2E product moderation restore gate test.",
      },
      { idToken: adminIdToken },
    );
    return {
      ok: body.ok === true,
      productId: body.productId,
      status: body.status,
      moderationStatus: body.moderationStatus,
      optionCount: body.optionCount,
      snapshotPublish: body.snapshotPublish,
    };
  });

  await runStep("verify_product_moderation_restore_firestore", requireAdminE2e, async () => {
    const product = await getFirestoreDocument("products", directProductId);
    const option = await getFirestoreDocument("product_options", directOptionId);
    assertExists(product, `products/${directProductId}`);
    assertExists(option, `product_options/${directOptionId}`);
    assertEqual(product.fields?.status, "active", "restored product status");
    assertEqual(product.fields?.moderation_status, "registered", "restored product moderation_status");
    assertEqual(option.fields?.status, "active", "restored option status");
    assertEqual(option.fields?.moderation_status, "registered", "restored option moderation_status");
    return {
      ok: true,
      productStatus: product.fields?.status,
      productModerationStatus: product.fields?.moderation_status,
      optionStatus: option.fields?.status,
      optionModerationStatus: option.fields?.moderation_status,
    };
  });
} else {
  results.push({
    name: "admin_write_phases",
    required: requireAdminE2e,
    ok: false,
    skipped: true,
    error: {
      code: "SUPER_ADMIN_ID_TOKEN_UNAVAILABLE",
      message: "Could not exchange Firebase CLI Google OAuth into a Firebase ID token, so admin approval/product approval were not executed.",
    },
  });
}

await runStep("company_1004_custom_token", true, async () => {
  const body = await postFunction("companyBetaAuthToken", {
    businessNo: preservedBusinessNo,
    password: preservedPassword,
  });
  if (!body.customToken) throw new Error("companyBetaAuthToken did not return customToken.");
  const exchange = await exchangeCustomTokenForIdToken(body.customToken);
  companyIdToken = exchange.idToken;
  return { ok: true, companyId: body.companyId, businessNo: body.businessNo, localId: exchange.localId };
});

let qrResponse = null;
await runStep("qr_create_1004", true, async () => {
  qrResponse = await postFunction("qrCreate", buildQrCreateRequest());
  return {
    ok: qrResponse.ok === true,
    qrSessionId: qrResponse.qrSessionId,
    shortCode: qrResponse.shortCode,
    totalAmount: qrResponse.totalAmount,
    scopeRepaired: qrResponse.scopeRepaired,
  };
});

if (qrResponse?.ok) {
  await runStep("guest_shop_claim_1004_session", true, async () => {
    guestShopSessionResponse = await postFunction("guestShopClaim", {
      qrSessionId: qrResponse.qrSessionId,
      shortCode: qrResponse.shortCode,
      source: "live_write_e2e",
    });
    return {
      ok: guestShopSessionResponse.ok === true,
      guestShopSessionId: guestShopSessionResponse.guestShopSessionId,
      qrSessionId: guestShopSessionResponse.qrSessionId,
      shortCode: guestShopSessionResponse.shortCode,
      entryTokenPresent: Boolean(guestShopSessionResponse.entryToken),
      shopUrlPresent: Boolean(guestShopSessionResponse.shopUrl),
    };
  });
}

if ((productApprovalVerified || directProductVerified) && guestShopSessionResponse?.ok) {
  if (testLegacyProductApproval && productApprovalVerified) {
  await runStep("guest_shop_products_include_e2e_product", requireAdminE2e, async () => {
    const body = await getFunction("guestShopProducts", {
      sessionId: guestShopSessionResponse.guestShopSessionId,
      entryToken: guestShopSessionResponse.entryToken,
    });
    const products = Array.isArray(body.products) ? body.products : [];
    const product = products.find((item) => item?.id === approvedProductId);
    if (!product) {
      throw new Error(`Approved product ${approvedProductId} was not returned by guestShopProducts.`);
    }
    assertEqual(product.name, editedProductName, "guestShopProducts edited product name");
    assertEqual(product.price, editedProductPrice, "guestShopProducts edited product price");

    return {
      ok: body.ok === true,
      productCount: products.length,
      productId: product.id,
      companyId: product.companyId,
      price: product.price,
      name: product.name,
      source: body.source,
    };
  });

  await runStep("guest_shop_product_detail_e2e_product", requireAdminE2e, async () => {
    const body = await getFunction("guestShopProductDetail", {
      sessionId: guestShopSessionResponse.guestShopSessionId,
      entryToken: guestShopSessionResponse.entryToken,
      productId: approvedProductId,
    });
    const product = body.product || {};
    const options = Array.isArray(body.options) ? body.options : [];
    assertEqual(product.id, approvedProductId, "guestShopProductDetail product.id");
    assertEqual(product.name, editedProductName, "guestShopProductDetail edited product name");
    assertEqual(product.price, editedProductPrice, "guestShopProductDetail edited product price");
    if (!options.some((option) => option?.id === approvedOptionId || option?.productId === approvedProductId)) {
      throw new Error(`Approved option ${approvedOptionId} was not returned by guestShopProductDetail.`);
    }

    return {
      ok: body.ok === true,
      productId: product.id,
      companyId: product.companyId,
      name: product.name,
      price: product.price,
      optionCount: options.length,
      source: body.source,
    };
  });

  }

  await runStep("guest_shop_products_include_direct_publish_product", requireAdminE2e, async () => {
    const body = await getFunction("guestShopProducts", {
      sessionId: guestShopSessionResponse.guestShopSessionId,
      entryToken: guestShopSessionResponse.entryToken,
    });
    const products = Array.isArray(body.products) ? body.products : [];
    const product = products.find((item) => item?.id === directProductId);
    if (!product) {
      throw new Error(`Direct publish product ${directProductId} was not returned by guestShopProducts.`);
    }
    assertEqual(product.name, directProductName, "guestShopProducts direct product name");
    assertEqual(product.price, directProductPrice, "guestShopProducts direct product price");

    return {
      ok: body.ok === true,
      productCount: products.length,
      productId: product.id,
      companyId: product.companyId,
      price: product.price,
      name: product.name,
      source: body.source,
    };
  });

  if (testLegacyProductApproval && productApprovalVerified) {
  await runStep("storefront_routes_expose_e2e_product", requireStorefrontE2e, async () => {
    if (!storefrontBaseUrl) {
      throw new Error("A5_STOREFRONT_BASE_URL or A5_LOCAL_BASE_URL is required for storefront route E2E.");
    }

    const tabletList = await fetchStorefrontPath("/tablet/products/");
    const tabletDetail = await fetchStorefrontPath(`/tablet/products/${encodeURIComponent(approvedProductId)}/`);
    const mobileList = await fetchStorefrontPath("/m/shop/");
    const mobileDetail = await fetchStorefrontPath(`/m/shop/product/${encodeURIComponent(approvedProductId)}/`);

    assertPageMentionsProduct(tabletDetail, approvedProductId, "tablet product detail");
    assertPageMentionsProduct(mobileDetail, approvedProductId, "mobile product detail");

    return {
      ok: true,
      storefrontBaseUrl,
      tabletList: summarizePageFetch(tabletList),
      tabletDetail: summarizePageFetch(tabletDetail),
      mobileList: summarizePageFetch(mobileList),
      mobileDetail: summarizePageFetch(mobileDetail),
    };
  });

  }

  await runStep("storefront_routes_expose_direct_publish_product", requireStorefrontE2e, async () => {
    if (!storefrontBaseUrl) {
      throw new Error("A5_STOREFRONT_BASE_URL or A5_LOCAL_BASE_URL is required for storefront route E2E.");
    }

    const tabletDetail = await fetchStorefrontPath(`/tablet/products/${encodeURIComponent(directProductId)}/`);
    const mobileDetail = await fetchStorefrontPath(`/m/shop/product/${encodeURIComponent(directProductId)}/`);

    assertPageContains(tabletDetail, directProductName, "tablet direct publish product detail");
    assertPageContains(mobileDetail, directProductName, "mobile direct publish product detail");

    return {
      ok: true,
      storefrontBaseUrl,
      directProductId,
      tabletDetail: summarizePageFetch(tabletDetail),
      mobileDetail: summarizePageFetch(mobileDetail),
    };
  });
} else if (requireAdminE2e || requireStorefrontE2e) {
  results.push({
    name: "storefront_product_exposure_phases",
    required: requireAdminE2e || requireStorefrontE2e,
    ok: false,
    skipped: true,
    error: {
      code: "APPROVED_PRODUCT_OR_GUEST_SESSION_UNAVAILABLE",
      message: "Approved product exposure could not be tested because admin product approval or guest shop session setup did not complete.",
    },
  });
}

if (productApprovalVerified && adminIdToken) {
  await runStep("seed_storefront_cms_e2e_content", requireAdminE2e, async () => {
    await patchFirestoreDocument("home_sections", e2eHomeHeroId, buildHomeHeroRecord());
    await patchFirestoreDocument("home_sections", e2eHomePromoId, buildHomePromoRecord());
    await patchFirestoreDocument("marketing_videos", e2eMarketingVideoId, buildMarketingVideoRecord());
    await patchFirestoreDocument("company_brand_pages", e2eBrandPageId, buildCompanyBrandPageRecord());

    return {
      ok: true,
      homeHeroId: e2eHomeHeroId,
      homePromoId: e2eHomePromoId,
      marketingVideoId: e2eMarketingVideoId,
      brandPageId: e2eBrandPageId,
      brandId: e2eBrandId,
    };
  });

  await runStep("verify_storefront_cms_firestore", requireAdminE2e, async () => {
    const hero = await getFirestoreDocument("home_sections", e2eHomeHeroId);
    const promo = await getFirestoreDocument("home_sections", e2eHomePromoId);
    const video = await getFirestoreDocument("marketing_videos", e2eMarketingVideoId);
    const brand = await getFirestoreDocument("company_brand_pages", e2eBrandPageId);
    assertExists(hero, `home_sections/${e2eHomeHeroId}`);
    assertExists(promo, `home_sections/${e2eHomePromoId}`);
    assertExists(video, `marketing_videos/${e2eMarketingVideoId}`);
    assertExists(brand, `company_brand_pages/${e2eBrandPageId}`);
    assertEqual(hero.fields?.title, e2eHomeHeroTitle, "home hero title");
    assertEqual(promo.fields?.title, e2eHomePromoTitle, "home promo title");
    assertEqual(video.fields?.video_action_type, "hotdeal", "marketing video action type");
    assertEqual(brand.fields?.brand_id, e2eBrandId, "company brand page brand_id");

    return {
      ok: true,
      heroTitle: hero.fields?.title,
      promoTitle: promo.fields?.title,
      videoTitle: video.fields?.title,
      brandName: brand.fields?.brand_name,
    };
  });

  await runStep("commerce_live_read_includes_storefront_cms_e2e_content", requireAdminE2e, async () => {
    const body = await postFunction(
      "commerceLiveRead",
      { repository: "content", method: "getStorefrontContent", args: [] },
      { idToken: adminIdToken },
    );
    const content = body.data || {};
    const promoBanners = Array.isArray(content.promoBanners) ? content.promoBanners : [];
    const brands = Array.isArray(content.brands) ? content.brands : [];
    const marketingSlots = Array.isArray(content.marketingSlots) ? content.marketingSlots : [];
    const hero = content.heroBanner || {};
    const promo = promoBanners.find((item) => item?.id === e2eHomePromoId || item?.title === e2eHomePromoTitle);
    const videoSlot = marketingSlots.find((item) => item?.id === e2eMarketingVideoId);
    const brand = brands.find((item) => item?.id === e2eBrandId || item?.name === e2eBrandName);

    assertEqual(hero.title, e2eHomeHeroTitle, "commerce live read hero title");
    if (!promo) throw new Error(`commerce live read did not include promo banner ${e2eHomePromoId}.`);
    if (!videoSlot) throw new Error(`commerce live read did not include marketing video ${e2eMarketingVideoId}.`);
    if (!brand) throw new Error(`commerce live read did not include brand page ${e2eBrandId}.`);

    return {
      ok: body.ok === true,
      source: body.source,
      heroTitle: hero.title,
      promoCount: promoBanners.length,
      marketingSlotCount: marketingSlots.length,
      brandCount: brands.length,
      brandName: brand.name,
    };
  });

  await runStep("storefront_routes_expose_cms_e2e_content", requireStorefrontE2e, async () => {
    const tabletHome = await fetchStorefrontPath(`/tablet/products/?e2e=${encodeURIComponent(stamp)}`);
    const brandPage = await fetchStorefrontPath(`/tablet/products/brands/${encodeURIComponent(e2eBrandId)}/?e2e=${encodeURIComponent(stamp)}`);

    assertPageContains(tabletHome, e2eHomeHeroTitle, "tablet home hero");
    assertPageContains(tabletHome, e2eMarketingVideoTitle, "tablet home video");
    assertPageContains(brandPage, e2eBrandName, "tablet brand page");

    return {
      ok: true,
      storefrontBaseUrl,
      tabletHome: summarizePageFetch(tabletHome),
      brandPage: summarizePageFetch(brandPage),
    };
  });
} else if (requireAdminE2e || requireStorefrontE2e) {
  results.push({
    name: "storefront_cms_e2e_phases",
    required: requireAdminE2e || requireStorefrontE2e,
    ok: false,
    skipped: true,
    error: {
      code: "APPROVED_PRODUCT_OR_ADMIN_TOKEN_UNAVAILABLE",
      message: "Storefront CMS E2E could not run because approved product setup or super-admin token setup did not complete.",
    },
  });
}

let paymentReadyResponse = null;
let paymentProviderPolicyOk = false;
if (qrResponse?.ok) {
  await runStep("payments_ready_1004", true, async () => {
    paymentReadyResponse = await postFunction("paymentsReady", buildPaymentReadyRequest(qrResponse.qrSessionId, qrResponse.shortCode));
    return {
      ok: paymentReadyResponse.ok === true,
      provider: paymentReadyResponse.provider,
      pgReady: paymentReadyResponse.pgReady,
      checkoutWindowReady: paymentReadyResponse.checkoutWindowReady,
      checkoutWindowBlockers: paymentReadyResponse.checkoutWindowBlockers,
      paymentIntentId: paymentReadyResponse.paymentIntentId,
      orderNoCandidate: paymentReadyResponse.orderNoCandidate,
      recalculatedAmount: paymentReadyResponse.recalculatedAmount,
      merchantStatus: paymentReadyResponse.merchantProfile?.merchantStatus,
      merchantPaymentReady: paymentReadyResponse.merchantProfile?.paymentReady,
    };
  });

  if (paymentReadyResponse?.ok) {
    await runStep("payments_ready_1004_provider_policy", true, async () => {
      const actualProvider = normalizeProvider(paymentReadyResponse.provider);
      if (actualProvider !== requiredPaymentProvider) {
        throw new Error(`PAYMENT_PROVIDER_POLICY_FAILED: actual=${actualProvider || "missing"} expected=${requiredPaymentProvider}`);
      }

      paymentProviderPolicyOk = true;
      return {
        ok: true,
        actualProvider,
        requiredPaymentProvider,
      };
    });
  }
}

let paymentConfirmResponse = null;
if (paymentReadyResponse?.ok && paymentProviderPolicyOk && companyIdToken) {
  await runStep("payments_confirm_1004_mock", true, async () => {
    paymentConfirmResponse = await postFunction(
      "paymentsConfirm",
      {
        ...buildPaymentReadyRequest(paymentReadyResponse.qrSessionId, qrResponse.shortCode),
        paymentIntentId: paymentReadyResponse.paymentIntentId,
        orderNoCandidate: paymentReadyResponse.orderNoCandidate,
        mockApprovalRequested: true,
        customerName: "E2E 1004",
        customerPhone: "01000001004",
        deliveryMethod: "pickup",
      },
      { idToken: companyIdToken },
    );
    return {
      ok: paymentConfirmResponse.ok === true,
      provider: paymentConfirmResponse.provider,
      orderNo: paymentConfirmResponse.orderNo,
      recalculatedAmount: paymentConfirmResponse.recalculatedAmount,
      orderLookupUrlPresent: Boolean(paymentConfirmResponse.orderLookupUrl),
    };
  });
}

let orderItemId = "";
let deliveryUpdateStatus = "";
let cancelRequestId = "";
let adminReviewedOrderStatus = "";
if (paymentConfirmResponse?.ok) {
  await runStep("verify_order_and_order_item_firestore", true, async () => {
    const order = await getFirestoreDocument("orders", paymentConfirmResponse.orderNo);
    assertExists(order, `orders/${paymentConfirmResponse.orderNo}`);
    const item = await firstFirestoreQueryDocument("order_items", "order_no", paymentConfirmResponse.orderNo);
    if (!item) throw new Error(`No order_items record found for order_no ${paymentConfirmResponse.orderNo}.`);
    orderItemId = item.id;
    return {
      ok: true,
      orderNo: paymentConfirmResponse.orderNo,
      orderStatus: order.fields?.status,
      orderItemId,
      orderItemCompanyId: item.fields?.company_id,
      orderItemDeliveryStatus: item.fields?.delivery_status,
    };
  });

  if (orderItemId) {
    await runStep("company_delivery_update_1004", true, async () => {
      const body = await postFunction(
        "companyOrderDeliveryUpdate",
        {
          companyId: preservedCompanyId,
          orderItemId,
          orderNo: paymentConfirmResponse.orderNo,
          deliveryStatus: "invoice_entered",
          carrierCode: "E2E",
          invoiceNumber: `E2E${stamp}`,
        },
        { idToken: companyIdToken },
      );
      deliveryUpdateStatus = body.deliveryStatus || "";
      return {
        ok: body.ok === true,
        companyId: body.companyId,
        orderItemId: body.orderItemId,
        orderNo: body.orderNo,
        deliveryStatus: body.deliveryStatus,
      };
    });

    await runStep("verify_delivery_update_firestore_1004", true, async () => {
      const order = await getFirestoreDocument("orders", paymentConfirmResponse.orderNo);
      const item = await getFirestoreDocument("order_items", orderItemId);
      assertExists(order, `orders/${paymentConfirmResponse.orderNo}`);
      assertExists(item, `order_items/${orderItemId}`);
      const expectedOrderStatus = expectedOrderStatusForDelivery(deliveryUpdateStatus);
      const orderStatus = String(order.fields?.status ?? "");
      const itemDeliveryStatus = String(item.fields?.delivery_status ?? item.fields?.deliveryStatus ?? "");

      if (expectedOrderStatus && orderStatus !== expectedOrderStatus) {
        throw new Error(`Order status mismatch after delivery update: expected=${expectedOrderStatus} actual=${orderStatus}`);
      }

      if (deliveryUpdateStatus && itemDeliveryStatus !== deliveryUpdateStatus) {
        throw new Error(`Order item delivery status mismatch: expected=${deliveryUpdateStatus} actual=${itemDeliveryStatus}`);
      }

      return {
        ok: true,
        orderNo: paymentConfirmResponse.orderNo,
        orderStatus,
        orderItemId,
        orderItemDeliveryStatus: itemDeliveryStatus,
      };
    });
  }

  await runStep("company_cancel_request_1004", true, async () => {
    const body = await postFunction(
      "paymentsCancel",
      {
        orderNo: paymentConfirmResponse.orderNo,
        amount: preservedAmount,
        reason: "Live E2E company cancel/refund request.",
        requestedBy: "COMPANY_ADMIN",
        companyId: preservedCompanyId,
        items: [buildPreserved1004Item()],
      },
      { idToken: companyIdToken },
    );
    return {
      ok: body.ok === true,
      orderNo: body.orderNo,
      status: body.status,
      pgCancelCalled: body.pgCancelCalled,
      companyAdminProviderCancelBlocked: body.payupRuntime?.companyAdminProviderCancelBlocked,
    };
  });

  await runStep("verify_company_cancel_request_firestore", true, async () => {
    const request = await firstFirestoreQueryDocument("cancel_requests", "order_no", paymentConfirmResponse.orderNo);
    if (!request) throw new Error(`No cancel_requests record found for order_no ${paymentConfirmResponse.orderNo}.`);
    cancelRequestId = request.id;
    return {
      ok: true,
      cancelRequestId,
      orderNo: request.fields?.order_no,
      requestedBy: request.fields?.requested_by,
      status: request.fields?.status,
      companyAdminProviderCancelBlocked: request.fields?.company_admin_provider_cancel_blocked,
    };
  });

  if (adminIdToken && cancelRequestId) {
    await runStep("admin_cancel_request_manual_approve_1004", requireAdminE2e, async () => {
      const body = await postFunction(
        "adminCancelRequestReview",
        {
          requestId: cancelRequestId,
          action: "approve_manual",
          reviewMemo: "Live E2E manual cancel/refund approval.",
        },
        { idToken: adminIdToken },
      );
      adminReviewedOrderStatus = "refund_reviewed";
      return {
        ok: body.ok === true,
        requestId: body.requestId,
        orderNo: body.orderNo,
        status: body.status,
        pgCancelCalled: body.pgCancelCalled,
      };
    });
  }

  await runStep("guest_order_lookup_1004", true, async () => {
    const urlToken = readLookupToken(paymentConfirmResponse.orderLookupUrl);
    const lookup = await getFunction(
      "guestOrderLookup",
      urlToken
        ? { orderNo: paymentConfirmResponse.orderNo, token: urlToken }
        : { orderNo: paymentConfirmResponse.orderNo, phoneLast4: "1004" },
    );
    const order = lookup.order || lookup.orders?.[0] || {};
    const expectedOrderStatus = adminReviewedOrderStatus || expectedOrderStatusForDelivery(deliveryUpdateStatus);

    if (expectedOrderStatus && order.status !== expectedOrderStatus) {
      throw new Error(`Guest order lookup status mismatch after delivery update: expected=${expectedOrderStatus} actual=${order.status || "missing"}`);
    }

    return {
      ok: lookup.ok === true,
      orderCount: Array.isArray(lookup.orders) ? lookup.orders.length : 0,
      orderNo: order.orderNo || order.order_no || paymentConfirmResponse.orderNo,
      orderStatus: order.status || "",
      expectedOrderStatus,
      cancelRequestStatus: order.cancelRequest?.status || "",
      cancelRequestId: order.cancelRequest?.id || "",
      source: lookup.source,
    };
  });
}

if (productApprovalVerified && !keepE2eArtifacts) {
  await runStep("archive_e2e_approved_product_artifacts", true, async () => {
    await archiveE2eProductArtifacts({
      productId: approvedProductId,
      optionId: approvedOptionId,
      detailId: draftId,
      extraDetailIds: [productEditDetailId],
    });
    await archiveE2eProductArtifacts({
      productId: directProductId,
      optionId: directOptionId,
      detailId: directProductId,
    });

    const product = await getFirestoreDocument("products", approvedProductId);
    const option = await getFirestoreDocument("product_options", approvedOptionId);
    const detail = await getFirestoreDocument("product_detail_pages", draftId);
    const editDetail = await getFirestoreDocument("product_detail_pages", productEditDetailId);
    const directProduct = await getFirestoreDocument("products", directProductId);
    const directOption = await getFirestoreDocument("product_options", directOptionId);
    const directDetail = await getFirestoreDocument("product_detail_pages", directProductId);
    assertExists(product, `products/${approvedProductId}`);
    assertExists(option, `product_options/${approvedOptionId}`);
    assertExists(detail, `product_detail_pages/${draftId}`);
    assertExists(editDetail, `product_detail_pages/${productEditDetailId}`);
    assertExists(directProduct, `products/${directProductId}`);
    assertExists(directOption, `product_options/${directOptionId}`);
    assertExists(directDetail, `product_detail_pages/${directProductId}`);
    assertEqual(product.fields?.status, "archived", "archived product status");
    assertEqual(option.fields?.status, "archived", "archived option status");
    assertEqual(detail.fields?.status, "archived", "archived product detail status");
    assertEqual(editDetail.fields?.status, "archived", "archived edited product detail status");
    assertEqual(directProduct.fields?.status, "archived", "archived direct product status");
    assertEqual(directOption.fields?.status, "archived", "archived direct option status");
    assertEqual(directDetail.fields?.status, "archived", "archived direct product detail status");

    return {
      ok: true,
      productId: approvedProductId,
      optionId: approvedOptionId,
      detailId: draftId,
      editDetailId: productEditDetailId,
      directProductId,
      directOptionId,
      productStatus: product.fields?.status,
      optionStatus: option.fields?.status,
      detailStatus: detail.fields?.status,
      editDetailStatus: editDetail.fields?.status,
      directProductStatus: directProduct.fields?.status,
      directOptionStatus: directOption.fields?.status,
      directDetailStatus: directDetail.fields?.status,
    };
  });
}

if (!keepE2eArtifacts) {
  await runStep("archive_e2e_runtime_artifacts", true, async () => {
    const result = await archiveE2eRuntimeArtifacts();
    return { ok: true, ...result };
  });
}

if (temporaryAdminUser?.localId) {
  await runStep("super_admin_temporary_user_delete", true, async () => {
    await deleteTemporarySuperAdminUser(temporaryAdminUser.localId);
    return {
      ok: true,
      localId: temporaryAdminUser.localId,
      temporaryAdminDeleted: true,
    };
  });
}

const requiredResults = results.filter((item) => item.required);
const passedRequired = requiredResults.filter((item) => item.ok).length;
const failedRequired = requiredResults.length - passedRequired;
const passedAll = results.filter((item) => item.ok).length;

const summary = {
  ok: failedRequired === 0,
  projectId,
  functionBaseUrl,
  context,
  totals: {
    steps: results.length,
    passed: passedAll,
    required: requiredResults.length,
    requiredPassed: passedRequired,
    requiredFailed: failedRequired,
    successRatePercent: Math.round((passedAll / Math.max(results.length, 1)) * 100),
    requiredSuccessRatePercent: Math.round((passedRequired / Math.max(requiredResults.length, 1)) * 100),
  },
  results,
};

console.log("LIVE_WRITE_E2E_RESULT_START");
console.log(JSON.stringify(summary, null, 2));
console.log("LIVE_WRITE_E2E_RESULT_END");

if (!summary.ok) process.exit(1);

async function runStep(name, required, action) {
  const startedAt = Date.now();
  try {
    const result = await action();
    results.push({
      name,
      required,
      ok: result?.ok !== false,
      durationMs: Date.now() - startedAt,
      result,
    });
  } catch (error) {
    results.push({
      name,
      required,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: normalizeError(error),
    });
  }
}

function buildSignupRequest() {
  return {
    id: signupRequestId,
    companyName: `E2E Company ${businessNoUnderTest}`,
    businessRegistrationNumber: businessNoUnderTest,
    representativeName: "E2E Representative",
    representativeBirthDate: "1990-01-01",
    representativeNationality: "KR",
    representativeGender: "N",
    managerName: "E2E Manager",
    managerPhone: "010-3123-0654",
    managerEmail: `e2e-${businessNoUnderTest}-${stamp}@example.com`,
    commerceLicenseNo: `E2E-COMMERCE-${stamp}`,
    csPhone: "010-3123-0654",
    returnAddress: "E2E Return Address",
    documentNames: [],
    documentUploads: [],
    createdAt: new Date().toISOString(),
  };
}

function buildProductDraft() {
  const nowIso = new Date().toISOString();
  return {
    id: draftId,
    product_id: approvedProductId,
    company_id: signupCompanyId,
    companyId: signupCompanyId,
    title: `E2E Product ${businessNoUnderTest}`,
    name: `E2E Product ${businessNoUnderTest}`,
    brand: `E2E Brand ${businessNoUnderTest}`,
    summary: "Controlled live write E2E product draft.",
    category: "E2E",
    category_label: "E2E",
    category_id: "e2e",
    category_code: "e2e",
    subcategory: "E2E",
    fulfillment: "delivery",
    pricing: {
      listPrice: 2000,
      platformLowestPrice: 1500,
      closedMallPrice: 1200,
    },
    variants: [
      {
        id: draftVariantId,
        optionName: "Default",
        normalPrice: 2000,
        platformLowestPrice: 1500,
        baseClosedMallPrice: 1200,
        closedMallPrice: 1200,
        finalSalePrice: 1200,
        additionalPrice: 0,
        stock: 7,
        status: "active",
        sku: `E2E-SKU-${stamp}`,
      },
    ],
    media: [
      {
        role: "representative",
        url: "https://via.placeholder.com/640x640.png?text=E2E",
      },
    ],
    status: "pending_approval",
    approval_status: "pending_approval",
    source: "live_write_e2e",
    source_app: "company",
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildDirectProductRecord() {
  const nowIso = new Date().toISOString();
  return {
    id: directProductId,
    product_id: directProductId,
    company_id: signupCompanyId,
    companyId: signupCompanyId,
    title: directProductName,
    name: directProductName,
    brand: `E2E Direct Brand ${businessNoUnderTest}`,
    subtitle: "Controlled live write E2E direct publish product.",
    category: "E2E Direct",
    category_id: "e2e-direct",
    category_code: "e2e-direct",
    subcategory: "E2E Direct",
    status: "active",
    sale_status: "active",
    visibility: "visible",
    is_visible: true,
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    moderation_status: "registered",
    price: directProductPrice,
    closed_mall_price: directProductPrice,
    platform_lowest_price: 1700,
    list_price: 2300,
    normal_discount_amount: 900,
    platform_discount_amount: 300,
    normal_discount_rate: 39,
    platform_discount_rate: 18,
    inventory: directProductStock,
    stock: directProductStock,
    option_ids: [directOptionId],
    ...buildE2eProductUrlFields(directProductId),
    external_product_code: directProductId,
    image_url: "https://via.placeholder.com/640x640.png?text=E2E+Direct",
    gallery: ["https://via.placeholder.com/640x640.png?text=E2E+Direct"],
    delivery_available: true,
    pickup_available: true,
    detail_sections: [{ title: "Direct publish detail", body: "Controlled direct product publish detail." }],
    source_app: "company",
    source_channel: "company_product_direct_publish",
    source: "live_write_e2e",
    published_at: nowIso,
    approved_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    updated_at_iso: nowIso,
  };
}

function buildDirectProductDetailRecord() {
  const nowIso = new Date().toISOString();
  return {
    id: directProductId,
    product_id: directProductId,
    company_id: signupCompanyId,
    companyId: signupCompanyId,
    title: directProductName,
    name: directProductName,
    product_name: directProductName,
    brand: `E2E Direct Brand ${businessNoUnderTest}`,
    summary: "Controlled live write E2E direct publish product detail.",
    category: "E2E Direct",
    category_label: "E2E Direct",
    category_id: "e2e-direct",
    category_code: "e2e-direct",
    subcategory: "E2E Direct",
    detail_sections: [{ title: "Direct publish detail", body: "Controlled direct product publish detail." }],
    media: [
      {
        role: "representative",
        url: "https://via.placeholder.com/640x640.png?text=E2E+Direct",
      },
    ],
    pricing: {
      listPrice: 2300,
      platformLowestPrice: 1700,
      closedMallPrice: directProductPrice,
    },
    variants: [
      {
        id: draftVariantId,
        optionName: "Default Direct",
        normalPrice: 2300,
        platformLowestPrice: 1700,
        baseClosedMallPrice: directProductPrice,
        closedMallPrice: directProductPrice,
        finalSalePrice: directProductPrice,
        additionalPrice: 0,
        stock: directProductStock,
        status: "active",
        sku: `E2E-DIRECT-SKU-${stamp}`,
      },
    ],
    status: "approved",
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    moderation_status: "registered",
    source_app: "company",
    source_channel: "company_product_direct_publish",
    source: "live_write_e2e",
    published_at: nowIso,
    approved_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildDirectProductOptionRecord() {
  const nowIso = new Date().toISOString();
  return {
    id: directOptionId,
    option_id: directOptionId,
    product_id: directProductId,
    company_id: signupCompanyId,
    companyId: signupCompanyId,
    name: "Default Direct",
    option_name: "Default Direct",
    price_delta: 0,
    stock: directProductStock,
    inventory: directProductStock,
    status: "active",
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    moderation_status: "registered",
    sku: `E2E-DIRECT-SKU-${stamp}`,
    source_app: "company",
    source_channel: "company_product_direct_publish",
    source: "live_write_e2e",
    published_at: nowIso,
    approved_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildProductEditRequest() {
  const nowIso = new Date().toISOString();
  const productRecord = {
    id: approvedProductId,
    product_id: approvedProductId,
    company_id: signupCompanyId,
    companyId: signupCompanyId,
    title: editedProductName,
    name: editedProductName,
    brand: `E2E Brand ${businessNoUnderTest}`,
    subtitle: "Controlled live write E2E product edit.",
    category: "E2E Edited",
    category_id: "e2e-edited",
    category_code: "e2e-edited",
    subcategory: "E2E Edited",
    status: "active",
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    price: editedProductPrice,
    closed_mall_price: editedProductPrice,
    platform_lowest_price: 1500,
    list_price: 2000,
    stock: editedProductStock,
    inventory: editedProductStock,
    option_ids: [approvedOptionId],
    image_url: "https://via.placeholder.com/640x640.png?text=E2E+Edited",
    gallery: ["https://via.placeholder.com/640x640.png?text=E2E+Edited"],
    delivery_available: true,
    pickup_available: false,
    detail_sections: [{ title: "Edited E2E detail", body: "Controlled edit detail." }],
    source_app: "company",
    source_channel: "company_product_edit_request",
    source: "live_write_e2e",
  };
  const detailRecord = {
    id: productEditDetailId,
    product_id: approvedProductId,
    company_id: signupCompanyId,
    companyId: signupCompanyId,
    title: editedProductName,
    name: editedProductName,
    product_name: editedProductName,
    brand: `E2E Brand ${businessNoUnderTest}`,
    summary: "Controlled live write E2E product edit.",
    category: "E2E Edited",
    category_label: "E2E Edited",
    category_id: "e2e-edited",
    category_code: "e2e-edited",
    subcategory: "E2E Edited",
    detail_sections: [{ title: "Edited E2E detail", body: "Controlled edit detail." }],
    media: [
      {
        role: "representative",
        url: "https://via.placeholder.com/640x640.png?text=E2E+Edited",
      },
    ],
    status: "pending_approval",
    approval_status: "pending_approval",
    source_app: "company",
    source_channel: "company_product_edit_request",
    edit_mode: true,
  };
  const optionRecord = {
    id: approvedOptionId,
    option_id: approvedOptionId,
    product_id: approvedProductId,
    company_id: signupCompanyId,
    companyId: signupCompanyId,
    name: "Default Edited",
    option_name: "Default Edited",
    price_delta: 0,
    stock: editedProductStock,
    inventory: editedProductStock,
    status: "active",
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    sku: `E2E-EDIT-SKU-${stamp}`,
    source_app: "company",
    source_channel: "company_product_edit_request",
    source: "live_write_e2e",
  };

  return {
    id: productEditRequestId,
    title: editedProductName,
    company_id: signupCompanyId,
    companyId: signupCompanyId,
    product_id: approvedProductId,
    productId: approvedProductId,
    status: "pending_approval",
    approval_status: "pending_approval",
    source_app: "company",
    source_channel: "company_product_edit",
    edit_mode: true,
    requested_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    requested: {
      status: productRecord.status,
      title: productRecord.title,
      name: productRecord.name,
      category: productRecord.category,
      summary: productRecord.subtitle,
      price: productRecord.price,
      closed_mall_price: productRecord.closed_mall_price,
      list_price: productRecord.list_price,
      platform_lowest_price: productRecord.platform_lowest_price,
      stock: productRecord.stock,
      inventory: productRecord.inventory,
      image_url: productRecord.image_url,
      gallery: productRecord.gallery,
      product_record: productRecord,
      detail_record: detailRecord,
      option_records: [optionRecord],
      suspended_option_records: [],
    },
    original: {
      product_id: approvedProductId,
      title: `E2E Product ${businessNoUnderTest}`,
      status: "active",
      price: 1200,
      stock: 7,
      option_ids: [approvedOptionId],
      detail_id: draftId,
    },
    changed_fields: ["product", "product_detail_pages", "product_options", "price", "stock", "media"],
  };
}

function buildQrCreateRequest() {
  return {
    cartId: `e2e-cart-${stamp}`,
    shortCode: e2eShortCode,
    nurseryId: "nursery-test-1004",
    roomId: "room-701",
    tabletId: "tablet-701-a",
    deliveryMethod: "pickup",
    pickupLocation: {
      nurseryName: "A5 Test Nursery",
      nurseryAddress: "A5 Test Address",
      roomId: "room-701",
      roomName: "701",
    },
    expiresInMinutes: 30,
    clientAmount: preservedAmount,
    currency: "KRW",
    items: [buildPreserved1004Item()],
  };
}

function buildPaymentReadyRequest(qrSessionId, shortCode) {
  return {
    qrSessionId,
    shortCode,
    cartId: `e2e-cart-${stamp}`,
    nurseryId: "nursery-test-1004",
    roomId: "room-701",
    tabletId: "tablet-701-a",
    clientAmount: preservedAmount,
    currency: "KRW",
    items: [buildPreserved1004Item()],
  };
}

function buildPreserved1004Item() {
  return {
    productId: preservedProductId,
    optionId: preservedOptionId,
    productName: "1004",
    optionName: "Basic",
    unitPrice: preservedAmount,
    quantity: 1,
    companyId: preservedCompanyId,
  };
}

function buildHomeHeroRecord() {
  const nowIso = new Date().toISOString();
  return {
    id: e2eHomeHeroId,
    section_type: "hero_banner",
    slot_id: "hero-hansan-sanho",
    source_banner_id: "e2e-home-hero",
    placement: "tablet_home_hero",
    title: e2eHomeHeroTitle,
    eyebrow: "E2E",
    subtitle: "Controlled storefront home hero live write E2E.",
    href: `/tablet/products/${approvedProductId}/`,
    click_target: `/tablet/products/${approvedProductId}/`,
    display_order: 0,
    asset_url: `https://placehold.co/1600x640/png?text=${encodeURIComponent(e2eHomeHeroTitle)}`,
    asset_type: "image",
    status: "live",
    approval_status: "live",
    source_app: "admin",
    source_channel: "live_write_e2e",
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildHomePromoRecord() {
  const nowIso = new Date().toISOString();
  return {
    id: e2eHomePromoId,
    section_type: "promo_banner",
    slot_id: "promo-clearance-80",
    source_banner_id: "e2e-home-promo",
    placement: "tablet_home_promo",
    title: e2eHomePromoTitle,
    eyebrow: "E2E Promo",
    subtitle: "Controlled storefront home promo live write E2E.",
    href: `/tablet/products/${approvedProductId}/`,
    click_target: `/tablet/products/${approvedProductId}/`,
    display_order: 0,
    asset_url: `https://placehold.co/800x300/png?text=${encodeURIComponent(e2eHomePromoTitle)}`,
    asset_type: "image",
    status: "live",
    approval_status: "live",
    source_app: "admin",
    source_channel: "live_write_e2e",
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildMarketingVideoRecord() {
  const nowIso = new Date().toISOString();
  return {
    id: e2eMarketingVideoId,
    title: e2eMarketingVideoTitle,
    eyebrow: "E2E Video Ad",
    body: "Click animation target is wired to hotdeal during live write E2E.",
    placement: "home_video_strip",
    target: "all_nurseries",
    asset_url: `https://placehold.co/1280x720/png?text=${encodeURIComponent(e2eMarketingVideoTitle)}`,
    asset_type: "image",
    display_order: 0,
    video_action_type: "hotdeal",
    video_action_target: "/tablet/products/deals/clearance-80/",
    action_type: "hotdeal",
    action_target: "/tablet/products/deals/clearance-80/",
    status: "live",
    approval_status: "approved",
    owner_type: "admin",
    company_id: signupCompanyId,
    source_app: "admin",
    source_channel: "live_write_e2e",
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function buildCompanyBrandPageRecord() {
  const nowIso = new Date().toISOString();
  return {
    id: e2eBrandPageId,
    company_id: signupCompanyId,
    companyId: signupCompanyId,
    brand_id: e2eBrandId,
    brand_name: e2eBrandName,
    name: e2eBrandName,
    title: e2eBrandName,
    subtitle: "Controlled brand hall live write E2E.",
    category: "E2E Brand",
    logo_url: `https://placehold.co/320x160/png?text=${encodeURIComponent("E2E Brand")}`,
    asset_url: `https://placehold.co/1280x480/png?text=${encodeURIComponent(e2eBrandName)}`,
    banner_image_url: `https://placehold.co/1280x480/png?text=${encodeURIComponent(e2eBrandName)}`,
    event_title: "E2E Brand Event",
    event_body: "Controlled brand page event live write E2E.",
    event_cta_label: "View product",
    event_cta_href: `/tablet/products/${approvedProductId}/`,
    status: "live",
    approval_status: "approved",
    source_app: "company",
    source_channel: "live_write_e2e",
    created_at: nowIso,
    updated_at: nowIso,
  };
}

async function getFirebaseCliAccessToken() {
  const require = createRequire(import.meta.url);
  const firebaseToolsRoot = join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools");
  const auth = require(join(firebaseToolsRoot, "lib", "auth.js"));
  const scopes = require(join(firebaseToolsRoot, "lib", "scopes.js"));
  const account = auth.getGlobalDefaultAccount();

  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI login account was not found. Run firebase login first.");
  }

  const token = await auth.getAccessToken(account.tokens.refresh_token, [
    scopes.CLOUD_PLATFORM,
    scopes.FIREBASE_PLATFORM,
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
  ]);
  return token.access_token;
}

async function createTemporarySuperAdminUser() {
  const targetProjectId = firebaseProjectNumber || projectId;
  const localId = `a5-live-e2e-admin-${stamp}`;
  const email = `${localId}@example.com`;
  const password = `A5-E2E-${stamp}-Admin!9`;
  const createBody = await identityToolkitAdminJson(`projects/${encodeURIComponent(targetProjectId)}/accounts`, {
    localId,
    email,
    password,
    displayName: "A5 Live E2E Super Admin",
    emailVerified: true,
    disabled: false,
  });
  const createdLocalId = createBody.localId || localId;

  await identityToolkitAdminJson("accounts:update", {
    localId: createdLocalId,
    customAttributes: JSON.stringify({ role: "SUPER_ADMIN" }),
    emailVerified: true,
    returnSecureToken: false,
    targetProjectId: projectId,
  });

  return {
    localId: createdLocalId,
    email,
    password,
  };
}

async function deleteTemporarySuperAdminUser(localId) {
  await deleteIdentityToolkitUser(localId);
}

async function lookupIdentityToolkitUser(localId) {
  const body = await identityToolkitAdminJson("accounts:lookup", {
    localId: [localId],
    targetProjectId: projectId,
  });
  return Array.isArray(body.users) ? body.users[0] : null;
}

async function deleteIdentityToolkitUser(localId) {
  await identityToolkitAdminJson("accounts:delete", {
    localId,
    targetProjectId: projectId,
  });
}

async function identityToolkitAdminJson(path, body) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${path}${separator}key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${oauthToken}`,
        "Content-Type": "application/json",
        "X-Goog-User-Project": projectId,
      },
      body: JSON.stringify(body),
    },
  );
  const result = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));

  if (!response.ok) {
    throw new HttpError(response.status, result, `${path} failed with HTTP ${response.status}`);
  }

  return result;
}

async function exchangeGoogleAccessTokenForFirebaseIdToken(accessToken) {
  const postBody = new URLSearchParams({
    access_token: accessToken,
    providerId: "google.com",
  }).toString();
  const body = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(apiKey)}`,
    {
      postBody,
      requestUri: "http://localhost",
      returnSecureToken: true,
      returnIdpCredential: false,
    },
  );

  if (!body.idToken) throw new Error("Identity Toolkit did not return idToken for Google provider exchange.");

  return {
    idToken: body.idToken,
    email: body.email,
    localId: body.localId,
  };
}

async function exchangeEmailPasswordForFirebaseIdToken(email, password) {
  const body = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      email,
      password,
      returnSecureToken: true,
    },
  );

  if (!body.idToken) throw new Error("Identity Toolkit did not return idToken for email/password sign-in.");

  return {
    idToken: body.idToken,
    email: body.email,
    localId: body.localId,
  };
}

async function exchangeCustomTokenForIdToken(customToken) {
  const body = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      token: customToken,
      returnSecureToken: true,
    },
  );

  if (!body.idToken) throw new Error("Identity Toolkit did not return idToken for custom token exchange.");

  return {
    idToken: body.idToken,
    localId: body.localId,
  };
}

async function postFunction(name, body, options = {}) {
  return postJson(`${functionBaseUrl}/${name}`, body, {
    headers: options.idToken ? { Authorization: `Bearer ${options.idToken}` } : {},
  });
}

async function getFunction(name, query) {
  const url = new URL(`${functionBaseUrl}/${name}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && String(value)) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new HttpError(response.status, body, `${name} failed with HTTP ${response.status}`);
  }
  return body;
}

async function postJson(url, body, options = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));

  if (!response.ok) {
    throw new HttpError(response.status, result, `${url} failed with HTTP ${response.status}`);
  }

  return result;
}

async function getFirestoreDocument(collection, id) {
  const response = await fetch(firestoreDocumentUrl(collection, id), {
    headers: { Authorization: `Bearer ${oauthToken}` },
  });

  if (response.status === 404) return { exists: false, id, fields: {} };

  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new HttpError(response.status, body, `${collection}/${id} read failed with HTTP ${response.status}`);
  }

  return {
    exists: true,
    id,
    name: body.name,
    fields: decodeFirestoreFields(body.fields || {}),
  };
}

async function patchFirestoreDocument(collection, id, data) {
  const query = Object.keys(data)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const url = `${firestoreDocumentUrl(collection, id)}?${query}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new HttpError(response.status, body, `${collection}/${id} patch failed with HTTP ${response.status}`);
  }
  return body;
}

async function firstFirestoreQueryDocument(collection, fieldPath, equalsValue) {
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
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: "EQUAL",
            value: encodeFirestoreValue(equalsValue),
          },
        },
        limit: 1,
      },
    }),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new HttpError(response.status, body, `${collection} query failed with HTTP ${response.status}`);
  }

  const entry = Array.isArray(body) ? body.find((item) => item.document) : null;
  if (!entry?.document) return null;

  return {
    exists: true,
    id: String(entry.document.name || "").split("/").pop(),
    name: entry.document.name,
    fields: decodeFirestoreFields(entry.document.fields || {}),
  };
}

function firestoreDocumentUrl(collection, id) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
}

function assertExists(doc, label) {
  if (!doc?.exists) throw new Error(`${label} was not found.`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected=${String(expected)} actual=${String(actual)}`);
  }
}

function assertProductUrlFields(fields, productId) {
  const encodedProductId = encodeURIComponent(productId);
  const expectedTabletPath = `/tablet/products/${encodedProductId}/`;
  const expectedMobilePath = `/m/shop/product/${encodedProductId}/`;

  assertEqual(fields?.public_path, expectedTabletPath, "product public_path");
  assertEqual(fields?.tablet_path, expectedTabletPath, "product tablet_path");
  assertEqual(fields?.mobile_path, expectedMobilePath, "product mobile_path");
  assertEqual(fields?.ad_target_path, expectedTabletPath, "product ad_target_path");
  assertEqual(fields?.mobile_ad_target_path, expectedMobilePath, "product mobile_ad_target_path");

  const productUrl = String(fields?.product_url || fields?.canonical_url || "");
  if (!productUrl.endsWith(expectedTabletPath)) {
    throw new Error(`product_url/canonical_url mismatch: expected suffix=${expectedTabletPath} actual=${productUrl || "missing"}`);
  }
}

function buildE2eProductUrlFields(productId) {
  const encodedProductId = encodeURIComponent(productId);
  const tabletPath = `/tablet/products/${encodedProductId}/`;
  const mobilePath = `/m/shop/product/${encodedProductId}/`;
  const origin = String(process.env.NEXT_PUBLIC_A5_PUBLIC_ORIGIN || "https://signage-ai-a5.co.kr").replace(/\/+$/, "");

  return {
    public_path: tabletPath,
    tablet_path: tabletPath,
    mobile_path: mobilePath,
    canonical_url: `${origin}${tabletPath}`,
    product_url: `${origin}${tabletPath}`,
    ad_target_path: tabletPath,
    mobile_ad_target_path: mobilePath,
    url_version: 1,
  };
}

async function archiveE2eProductArtifacts({ productId, optionId, detailId, extraDetailIds = [] }) {
  assertE2eId(productId, "e2e-product-", "productId");
  assertE2eId(optionId, `${productId}-`, "optionId");
  assertE2eDetailId(detailId);

  const nowIso = new Date().toISOString();
  const archiveFields = {
    status: "archived",
    visibility: "hidden",
    is_visible: false,
    live_write_e2e_archived: true,
    archived_at: nowIso,
    archived_reason: "live_write_e2e_completed",
    updated_at: nowIso,
  };

  const product = await getFirestoreDocument("products", productId);
  if (product.exists) {
    await patchFirestoreDocument("products", productId, {
      ...archiveFields,
      approval_status: "archived",
      product_approval_status: "archived",
    });
  }

  const option = await getFirestoreDocument("product_options", optionId);
  if (option.exists) {
    await patchFirestoreDocument("product_options", optionId, archiveFields);
  }

  const detailIds = [...new Set([detailId, ...extraDetailIds].filter(Boolean))];
  for (const targetDetailId of detailIds) {
    assertE2eDetailId(targetDetailId);
    const detail = await getFirestoreDocument("product_detail_pages", targetDetailId);
    if (detail.exists) {
      await patchFirestoreDocument("product_detail_pages", targetDetailId, {
        ...archiveFields,
        approval_status: "archived",
      });
    }
  }
}

async function archiveE2eRuntimeArtifacts() {
  const nowIso = new Date().toISOString();
  const baseArchiveFields = {
    live_write_e2e_archived: true,
    archived_at: nowIso,
    archived_reason: "live_write_e2e_completed",
    updated_at: nowIso,
  };
  const archivedCollections = [];

  await patchExistingFirestoreDocument("company_email_verifications", signupVerificationId, {
    ...baseArchiveFields,
    status: "archived",
    email_status: "archived",
  }, archivedCollections);
  await patchExistingFirestoreDocument("company_signup_requests", signupRequestId, {
    ...baseArchiveFields,
    status: "archived",
    approval_status: "archived",
  }, archivedCollections);
  await patchExistingFirestoreDocument("companies", signupCompanyId, {
    ...baseArchiveFields,
    status: "archived",
    approval_status: "archived",
    product_registration_enabled: false,
  }, archivedCollections);
  await patchExistingFirestoreDocument("company_pg_credentials", signupCompanyId, {
    ...baseArchiveFields,
    status: "archived",
    credential_status: "archived",
  }, archivedCollections);
  await patchExistingFirestoreDocument("company_onboarding", signupCompanyId, {
    ...baseArchiveFields,
    status: "archived",
  }, archivedCollections);
  await patchExistingFirestoreDocument("company_product_edit_requests", productEditRequestId, {
    ...baseArchiveFields,
    status: "archived",
    approval_status: "archived",
  }, archivedCollections);
  await patchExistingFirestoreDocument("home_sections", e2eHomeHeroId, {
    ...baseArchiveFields,
    status: "archived",
    approval_status: "archived",
  }, archivedCollections);
  await patchExistingFirestoreDocument("home_sections", e2eHomePromoId, {
    ...baseArchiveFields,
    status: "archived",
    approval_status: "archived",
  }, archivedCollections);
  await patchExistingFirestoreDocument("marketing_videos", e2eMarketingVideoId, {
    ...baseArchiveFields,
    status: "archived",
    approval_status: "archived",
  }, archivedCollections);
  await patchExistingFirestoreDocument("company_brand_pages", e2eBrandPageId, {
    ...baseArchiveFields,
    status: "archived",
    approval_status: "archived",
  }, archivedCollections);

  if (qrResponse?.qrSessionId) {
    await patchExistingFirestoreDocument("qr_payment_sessions", qrResponse.qrSessionId, {
      ...baseArchiveFields,
      status: "archived",
    }, archivedCollections);
  }

  if (guestShopSessionResponse?.guestShopSessionId) {
    await patchExistingFirestoreDocument("guest_shop_sessions", guestShopSessionResponse.guestShopSessionId, {
      ...baseArchiveFields,
      status: "archived",
    }, archivedCollections);
    await patchExistingFirestoreDocument("guest_shop_carts", guestShopSessionResponse.guestShopSessionId, {
      ...baseArchiveFields,
      status: "archived",
    }, archivedCollections);
  }

  if (paymentReadyResponse?.paymentIntentId) {
    await patchExistingFirestoreDocument("payment_intents", paymentReadyResponse.paymentIntentId, {
      ...baseArchiveFields,
      status: "archived",
    }, archivedCollections);
    await patchExistingFirestoreDocument("payments", paymentReadyResponse.paymentIntentId, {
      ...baseArchiveFields,
      status: "archived",
    }, archivedCollections);
    await patchExistingFirestoreDocument("payment_events", `${paymentReadyResponse.paymentIntentId}-approved`, {
      ...baseArchiveFields,
      status: "archived",
    }, archivedCollections);
  }

  if (paymentConfirmResponse?.orderNo) {
    await patchExistingFirestoreDocument("orders", paymentConfirmResponse.orderNo, {
      ...baseArchiveFields,
      status: "archived",
      previous_status: adminReviewedOrderStatus || expectedOrderStatusForDelivery(deliveryUpdateStatus) || "refund_reviewed",
    }, archivedCollections);
    await patchExistingFirestoreDocument("company_notifications", `${paymentConfirmResponse.orderNo}-paid`, {
      ...baseArchiveFields,
      status: "archived",
    }, archivedCollections);
    await patchExistingFirestoreDocument("integration_events", `${paymentConfirmResponse.orderNo}-paid`, {
      ...baseArchiveFields,
      status: "archived",
    }, archivedCollections);
    await patchExistingFirestoreDocument("kakao_order_message_events", `${paymentConfirmResponse.orderNo}-lookup-ready`, {
      ...baseArchiveFields,
      status: "archived",
    }, archivedCollections);
  }

  if (orderItemId) {
    await patchExistingFirestoreDocument("order_items", orderItemId, {
      ...baseArchiveFields,
      status: "archived",
      delivery_status: "archived",
    }, archivedCollections);
  }

  if (cancelRequestId) {
    await patchExistingFirestoreDocument("cancel_requests", cancelRequestId, {
      ...baseArchiveFields,
      status: "archived",
      previous_status: "approved_manual_review",
    }, archivedCollections);
  }

  let e2eCompanyAuthDeleted = false;
  if (e2eCompanyAuthUid) {
    const expectedEmail = buildSignupRequest().managerEmail.toLowerCase();
    const user = await lookupIdentityToolkitUser(e2eCompanyAuthUid);
    const actualEmail = String(user?.email || "").toLowerCase();
    if (actualEmail !== expectedEmail) {
      throw new Error(`Refusing to delete unexpected E2E company auth user: expected=${expectedEmail} actual=${actualEmail || "missing"}`);
    }
    await deleteIdentityToolkitUser(e2eCompanyAuthUid);
    e2eCompanyAuthDeleted = true;
  }

  return {
    archivedCollections,
    e2eCompanyAuthUid: e2eCompanyAuthUid || null,
    e2eCompanyAuthDeleted,
  };
}

async function patchExistingFirestoreDocument(collection, id, data, archivedCollections) {
  if (!id) return false;
  const doc = await getFirestoreDocument(collection, id);
  if (!doc.exists) return false;
  await patchFirestoreDocument(collection, id, data);
  archivedCollections.push(`${collection}/${id}`);
  return true;
}

function assertE2eId(value, expectedPrefix, label) {
  const id = String(value || "");
  if (!id.startsWith(expectedPrefix)) {
    throw new Error(`Refusing to archive non-E2E ${label}: ${id || "missing"}`);
  }
}

function assertE2eDetailId(value) {
  const id = String(value || "");
  if (!id.startsWith("e2e-product-draft-") && !id.startsWith("e2e-product-")) {
    throw new Error(`Refusing to archive non-E2E product detail: ${id || "missing"}`);
  }
}

async function fetchStorefrontPath(path) {
  const url = `${storefrontBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text().catch(() => "");

  if (!response.ok) {
    throw new HttpError(response.status, { url, bodyPreview: text.slice(0, 500) }, `${url} failed with HTTP ${response.status}`);
  }

  return {
    url,
    status: response.status,
    finalUrl: response.url,
    bytes: text.length,
    text,
  };
}

function assertPageMentionsProduct(page, productId, label) {
  const productName = editedProductName;
  if (!page.text.includes(productId) && !page.text.includes(encodeURIComponent(productId)) && !page.text.includes(productName)) {
    throw new Error(`${label} did not include approved product id or name. url=${page.url}`);
  }
}

function assertPageContains(page, needle, label) {
  if (!page.text.includes(needle) && !page.text.includes(encodeURIComponent(needle))) {
    throw new Error(`${label} did not include expected text. expected=${needle} url=${page.url}`);
  }
}

function summarizePageFetch(page) {
  return {
    url: page.url,
    status: page.status,
    finalUrl: page.finalUrl,
    bytes: page.bytes,
  };
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

function readLookupToken(orderLookupUrl) {
  if (!orderLookupUrl) return "";
  try {
    const url = new URL(orderLookupUrl);
    return url.searchParams.get("token") || "";
  } catch {
    return "";
  }
}

function normalizeError(error) {
  if (error instanceof HttpError) {
    return {
      code: readErrorCode(error.body) || "HTTP_ERROR",
      message: readErrorMessage(error.body) || error.message,
      httpStatus: error.status,
      body: sanitizeBody(error.body),
    };
  }

  return {
    code: "ERROR",
    message: error instanceof Error ? error.message : String(error),
  };
}

function readErrorCode(body) {
  return body?.error?.code || body?.code || body?.resultCode || "";
}

function readErrorMessage(body) {
  return body?.error?.message || body?.message || body?.resultMsg || body?.raw || "";
}

function sanitizeBody(value) {
  const serialized = JSON.stringify(value ?? {});
  return JSON.parse(
    serialized.replace(/"idToken":"[^"]+"/g, '"idToken":"[redacted]"').replace(/"customToken":"[^"]+"/g, '"customToken":"[redacted]"'),
  );
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

function normalizeProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (provider === "pg_contract") return "payup";
  return provider;
}

function expectedOrderStatusForDelivery(deliveryStatus) {
  if (deliveryStatus === "picked_up") return "picked_up";
  if (deliveryStatus === "pickup_ready") return "ready_for_pickup";
  if (deliveryStatus === "delivered") return "delivered";
  if (deliveryStatus === "in_transit") return "shipping";
  if (deliveryStatus === "invoice_entered") return "shipping";
  return "";
}

function hashVerificationSecret(value, verificationId, email, purpose, scope) {
  return createHash("sha256")
    .update([emailVerificationPepper, scope, purpose, email, verificationId, value].join("|"))
    .digest("hex");
}
