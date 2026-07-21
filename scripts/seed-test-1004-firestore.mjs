import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const firebaseToolsRoot = join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools");
const auth = require(join(firebaseToolsRoot, "lib", "auth.js"));
const scopes = require(join(firebaseToolsRoot, "lib", "scopes.js"));

const businessNo = "7592901311";
const companyId = "company-test-1004";
const productId = "product-test-1004";
const optionId = "opt-test-1004-basic";
const qrSessionId = "qr-TEST1004";
const shortCode = "TEST1004";
const brandName = businessNo;
const productName = "테스트 1004";
const companyAdminEmail = "test1004@example.com";
const companyAdminLocalId = "company-test-1004-admin";
const companyAdminDisplayName = `${brandName} 관리자`;
const now = new Date();
const nowIso = now.toISOString();
const expiresIso = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

function projectIdFromRc() {
  try {
    const rc = JSON.parse(readFileSync(".firebaserc", "utf8"));
    return rc.projects?.default ?? "a5-closed-mall";
  } catch {
    return "a5-closed-mall";
  }
}

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])),
      },
    };
  }
  return { stringValue: String(value) };
}

function firestoreFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, firestoreValue(value)]));
}

async function getToken() {
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI login account was not found. Run firebase login first.");
  }
  const token = await auth.getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM]);
  return token.access_token;
}

async function patchDocument({ projectId, token, collection, id, data }) {
  const query = Object.keys(data)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/` +
    `${encodeURIComponent(collection)}/${encodeURIComponent(id)}?${query}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: firestoreFields(data) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${collection}/${id} write failed: ${response.status} ${body}`);
  }
}

async function postJson(url, token, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof body?.error?.message === "string" ? body.error.message : JSON.stringify(body);
    throw new Error(`${url} failed: ${response.status} ${message}`);
  }

  return body;
}

async function lookupAuthUser(projectId, token, email) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`;
  const body = await postJson(url, token, { email: [email] });
  return Array.isArray(body.users) && body.users.length ? body.users[0] : null;
}

async function ensureCompanyAdminAuthUser(projectId, token) {
  const claims = JSON.stringify({ role: "COMPANY_ADMIN", company_id: companyId });
  let user = await lookupAuthUser(projectId, token, companyAdminEmail);

  if (!user) {
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchCreate`;
    const body = await postJson(url, token, {
      hashAlgorithm: "BCRYPT",
      users: [
        {
          localId: companyAdminLocalId,
          email: companyAdminEmail,
          displayName: companyAdminDisplayName,
          emailVerified: true,
          disabled: false,
          customAttributes: claims,
        },
      ],
    });

    const failed = Array.isArray(body.error) && body.error.length ? body.error[0] : null;
    if (failed) {
      throw new Error(`Firebase Auth company admin create failed: ${JSON.stringify(failed)}`);
    }

    user = await lookupAuthUser(projectId, token, companyAdminEmail);
  }

  if (!user?.localId) {
    throw new Error("Firebase Auth company admin lookup failed after create.");
  }

  const updateUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`;
  await postJson(updateUrl, token, {
    localId: user.localId,
    displayName: companyAdminDisplayName,
    emailVerified: true,
    disableUser: false,
    customAttributes: claims,
    returnSecureToken: false,
  });

  return user.localId;
}

const common = {
  source: "manual_test_1004_seed",
  demo_read_enabled: true,
  guest_write_enabled: true,
  updated_at: nowIso,
};
const taxableMerchantPolicy = {
  taxation_type: "taxable",
  tax_type: "taxable",
  pg_taxation_type: "taxable",
  tax_free_enabled: false,
  is_tax_free_merchant: false,
  tax_free_amt: 0,
  duty_free_amt: 0,
};

const documents = [
  {
    collection: "company_signup_requests",
    id: "company-request-7592901311-test",
    data: {
      id: "company-request-7592901311-test",
      companyName: brandName,
      company_name: brandName,
      businessRegistrationNumber: businessNo,
      business_registration_number: businessNo,
      representativeName: "테스트 대표",
      representative_name: "테스트 대표",
      managerName: "테스트 담당자",
      manager_name: "테스트 담당자",
      managerPhone: "010-1004-1004",
      manager_phone: "010-1004-1004",
      managerEmail: companyAdminEmail,
      manager_email: companyAdminEmail,
      commerceLicenseNo: "TEST-1004",
      commerce_license_no: "TEST-1004",
      csPhone: "010-1004-1004",
      cs_phone: "010-1004-1004",
      returnAddress: "서울 테스트 반품지",
      return_address: "서울 테스트 반품지",
      documentNames: ["테스트 사업자등록증"],
      document_names: ["테스트 사업자등록증"],
      documentUploads: [],
      document_uploads: [],
      documentUploadIds: [],
      document_upload_ids: [],
      documentStoragePaths: [],
      document_storage_paths: [],
      gmailDeliveryStatus: "not_requested",
      gmail_delivery_status: "not_requested",
      documentUploadStatus: "not_uploaded",
      document_upload_status: "not_uploaded",
      status: "approved",
      infinyTransferStatus: "approved",
      infiny_transfer_status: "approved",
      pg_provider: "infiny",
      pgMerchantId: "testpay01m",
      pg_merchant_id: "testpay01m",
      pgModuleKey: "",
      pg_module_key: "",
      pgMerchantStatus: "active",
      pg_merchant_status: "active",
      ...taxableMerchantPolicy,
      approvedCompanyId: companyId,
      approved_company_id: companyId,
      reviewMemo: "테스트 1004 결제 검증용 승인 데이터",
      review_memo: "테스트 1004 결제 검증용 승인 데이터",
      createdAt: nowIso,
      created_at: nowIso,
      ...common,
    },
  },
  {
    collection: "companies",
    id: companyId,
    data: {
      company_id: companyId,
      companyId,
      name: brandName,
      display_name: brandName,
      brand_name: brandName,
      status: "active",
      approval_status: "approved",
      business_registration_number: businessNo,
      businessRegistrationNumber: businessNo,
      business_registration_no: businessNo,
      business_registration_number_normalized: businessNo,
      representative_name: "테스트 대표",
      manager_name: "테스트 담당자",
      manager_phone: "010-1004-1004",
      manager_email: companyAdminEmail,
      commerce_license_no: "TEST-1004",
      cs_phone: "010-1004-1004",
      return_address: "서울 테스트 반품지",
      commission_rate: 12,
      product_count: 1,
      pending_product_count: 0,
      settlement_blocked: false,
      pg_provider: "infiny",
      pg_merchant_id: "testpay01m",
      infiny_mid: "testpay01m",
      pg_merchant_status: "active",
      infiny_mid_status: "active",
      ...taxableMerchantPolicy,
      pg_profile: {
        provider: "infiny",
        providerLabel: "인피니 PG",
        merchantId: "testpay01m",
        merchantStatus: "active",
        taxationType: "taxable",
        taxFreeEnabled: false,
        adminManaged: true,
        companyEditable: false,
        settlementOwner: "infiny",
        settlementExecutionBlocked: true,
      },
      created_at: nowIso,
      ...common,
    },
  },
  {
    collection: "product_options",
    id: optionId,
    data: {
      option_id: optionId,
      optionId,
      product_id: productId,
      productId,
      company_id: companyId,
      name: "기본",
      option_name: "기본",
      status: "active",
      approval_status: "approved",
      product_approval_status: "approved",
      company_approval_status: "approved",
      price_delta: 0,
      stock: 1004,
      reserved_stock: 0,
      created_at: nowIso,
      ...common,
    },
  },
  {
    collection: "products",
    id: productId,
    data: {
      product_id: productId,
      productId,
      company_id: companyId,
      companyId,
      nursery_id: "all",
      title: productName,
      name: productName,
      legacy_name: "1004 제품",
      brand: brandName,
      subtitle: "인피니 PG 결제 테스트용 1004원 상품",
      category: "유아용품",
      status: "active",
      approval_status: "approved",
      product_approval_status: "approved",
      company_approval_status: "approved",
      approved_by_role: "SUPER_ADMIN",
      approved_at: nowIso,
      reviewed_at: nowIso,
      price: 1004,
      closed_mall_price: 1004,
      list_price: 1004,
      platform_lowest_price: 1004,
      inventory: 1004,
      stock: 1004,
      option_ids: [optionId],
      optionIds: [optionId],
      delivery_available: true,
      pickup_available: true,
      image_url: "/file.svg",
      tags: ["PG", "1004", "유아용품", businessNo],
      search_keywords: ["테스트 1004", "1004 제품", businessNo],
      badges: ["PG 테스트"],
      created_at: nowIso,
      ...common,
    },
  },
  {
    collection: "qr_payment_sessions",
    id: qrSessionId,
    data: {
      id: qrSessionId,
      qr_session_id: qrSessionId,
      short_code: shortCode,
      shortCode,
      type: "purchase",
      status: "active",
      nursery_id: "nursery-test-1004",
      nurseryId: "nursery-test-1004",
      room_id: "room-701",
      roomId: "room-701",
      tablet_id: "tablet-701-a",
      tabletId: "tablet-701-a",
      cart_id: "cart-test-1004",
      delivery_method: "pickup",
      total_amount_snapshot: 1004,
      totalAmount: 1004,
      currency: "KRW",
      items_snapshot: [
        {
          product_id: productId,
          productId,
          option_id: optionId,
          optionId,
          product_name: productName,
          productName,
          option_name: "기본",
          optionName: "기본",
          unit_price: 1004,
          unitPrice: 1004,
          quantity: 1,
          company_id: companyId,
          companyId,
          line_amount: 1004,
        },
      ],
      pickup_location: {
        nurseryName: "A5 테스트 산후조리원",
        nursery_name: "A5 테스트 산후조리원",
        nurseryAddress: "서울 테스트 조리원",
        nursery_address: "서울 테스트 조리원",
        roomId: "room-701",
        room_id: "room-701",
        roomName: "701호",
        room_name: "701호",
      },
      expires_at: expiresIso,
      created_at: nowIso,
      guest_read_enabled: true,
      ...common,
    },
  },
  {
    collection: "nurseries",
    id: "nursery-test-1004",
    data: {
      nursery_id: "nursery-test-1004",
      name: "A5 테스트 산후조리원",
      status: "active",
      approval_status: "approved",
      business_registration_no: businessNo,
      businessRegistrationNo: businessNo,
      business_registration_no_normalized: businessNo,
      businessRegistrationNoNormalized: businessNo,
      room_count: 1,
      tablet_count: 1,
      created_at: nowIso,
      ...common,
    },
  },
  {
    collection: "rooms",
    id: "room-701",
    data: {
      room_id: "room-701",
      nursery_id: "nursery-test-1004",
      room_number: "701",
      name: "701호",
      status: "active",
      pickup_enabled: true,
      created_at: nowIso,
      ...common,
    },
  },
  {
    collection: "tablets",
    id: "tablet-701-a",
    data: {
      tablet_id: "tablet-701-a",
      nursery_id: "nursery-test-1004",
      room_id: "room-701",
      label: "701-A",
      status: "active",
      created_at: nowIso,
      ...common,
    },
  },
  {
    collection: "nursery_auto_signup_profiles",
    id: "nursery-auto-7592901311",
    data: {
      id: "nursery-auto-7592901311",
      nurseryId: "nursery-test-1004",
      nursery_id: "nursery-test-1004",
      nurseryName: "A5 테스트 산후조리원",
      nursery_name: "A5 테스트 산후조리원",
      businessRegistrationNo: businessNo,
      business_registration_no: businessNo,
      businessRegistrationNoNormalized: businessNo,
      business_registration_no_normalized: businessNo,
      defaultPassword: "1004",
      default_password: "1004",
      roomIds: ["room-701"],
      room_ids: ["room-701"],
      tabletIds: ["tablet-701-a"],
      tablet_ids: ["tablet-701-a"],
      status: "active",
      createdAt: nowIso,
      created_at: nowIso,
      ...common,
    },
  },
  {
    collection: "product_detail_pages",
    id: "product-detail-test-1004",
    data: {
      id: "product-detail-test-1004",
      title: productName,
      product_name: productName,
      product_id: productId,
      company_id: companyId,
      brand: brandName,
      status: "approved",
      approval_status: "approved",
      source_app: "admin",
      sale_status: "판매 가능",
      fulfillment: "both",
      summary: "인피니 PG 결제 테스트용 1004원 상품",
      detail_description: "테스트 계정 결제 흐름 확인을 위한 폐쇄몰 승인 상품입니다.",
      pricing: {
        listPrice: 1004,
        platformLowestPrice: 1004,
        closedMallPrice: 1004,
        normalDiscountRate: 0,
        platformDiscountRate: 0,
        platformPriceInvalid: false,
        exposeBlocked: false,
      },
      variants: [
        {
          id: "variant-1",
          optionPath: "기본",
          optionName: "기본",
          sku: "TEST-1004-BASIC",
          normalPrice: "1004",
          platformLowestPrice: "1004",
          baseClosedMallPrice: "1004",
          additionalPrice: "0",
          finalSalePrice: "1004",
          closedMallPrice: "1004",
          stock: "1004",
          status: "판매가능",
        },
      ],
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
      reviewed_at: nowIso,
      review_memo: "최고관리자 승인 완료 및 폐쇄몰 업로드 완료",
      created_at: nowIso,
      ...common,
    },
  },
  {
    collection: "company_auth_provisioning",
    id: companyId,
    data: {
      company_id: companyId,
      status: "claims_set",
      email: companyAdminEmail,
      role: "COMPANY_ADMIN",
      company_id_claim: companyId,
      display_name: companyAdminDisplayName,
      resetLinkCreated: false,
      actorEmail: "rosabaya08@gmail.com",
      updated_at: nowIso,
      ...common,
    },
  },
];

const projectId = projectIdFromRc();
const token = await getToken();

for (const document of documents) {
  await patchDocument({ projectId, token, ...document });
  console.log(`Seeded ${document.collection}/${document.id}`);
}

const authUid = await ensureCompanyAdminAuthUser(projectId, token);
await patchDocument({
  projectId,
  token,
  collection: "companies",
  id: companyId,
  data: {
    auth_uid: authUid,
    auth_email: companyAdminEmail,
    auth_claims_ready: true,
    updated_at: nowIso,
  },
});
await patchDocument({
  projectId,
  token,
  collection: "company_auth_provisioning",
  id: companyId,
  data: {
    uid: authUid,
    status: "claims_set",
    updated_at: nowIso,
  },
});
console.log(`Firebase Auth company admin ready: ${companyAdminEmail} / ${authUid}`);

console.log(`Test seed complete: ${brandName} / ${productName} / ${businessNo} / QR ${shortCode}`);
