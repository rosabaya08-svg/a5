import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

const repoRoot = resolve(process.argv[2] || process.cwd());
const assetRoot = resolve(process.argv[3] || join(repoRoot, "tmp", "company-brand-assets-20260713"));
const serviceAccountPath = resolve(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.A5_FIREBASE_SERVICE_ACCOUNT_PATH ||
    "C:\\코덱스\\secure\\a5-closed-mall-service-account.json",
);
const dryRun = process.argv.includes("--dry-run");

const requireFromFunctions = createRequire(join(repoRoot, "functions", "package.json"));
const { cert, getApps, initializeApp } = requireFromFunctions("firebase-admin/app");
const { FieldValue, getFirestore } = requireFromFunctions("firebase-admin/firestore");
const { getStorage } = requireFromFunctions("firebase-admin/storage");

const brandDefinitions = [
  {
    slug: "jandiro",
    companyId: "business-5583300453",
    businessNo: "5583300453",
    brandName: "잔디로",
    category: "프리미엄 식품·라이프스타일",
    title: "잔디로",
    subtitle: "정성스럽게 고른 식품과 일상 선물을 한곳에서 만나보세요.",
    logoFile: "jandiro-logo.png",
    bannerFile: "jandiro-banner.png",
    displayOrder: 1,
  },
  {
    slug: "cleanlab",
    companyId: "business-5118701868",
    businessNo: "5118701868",
    brandName: "크린랩",
    category: "생활·주방 위생",
    title: "크린랩",
    subtitle: "가족의 일상을 더 깨끗하고 편리하게 만드는 생활 위생 솔루션입니다.",
    logoFile: "cleanlab-logo.png",
    bannerFile: "cleanlab-banner.png",
    displayOrder: 2,
  },
  {
    slug: "healingcamp",
    companyId: "business-6068110358",
    businessNo: "6068110358",
    brandName: "힐링캠프",
    category: "회복·웰니스",
    title: "힐링캠프",
    subtitle: "산모의 편안한 회복과 건강한 일상을 위한 웰니스 셀렉션입니다.",
    logoFile: "healingcamp-logo.png",
    bannerFile: "healingcamp-banner.png",
    displayOrder: 3,
  },
  {
    slug: "hansy",
    companyId: "business-7608603326",
    businessNo: "7608603326",
    brandName: "한국산후조리원연합회",
    category: "산후조리원 공식 브랜드",
    title: "한국산후조리원연합회",
    subtitle: "산모와 아기를 위한 믿을 수 있는 공식 브랜드를 소개합니다.",
    logoFile: "hansy-logo.png",
    bannerFile: "hansy-banner.png",
    displayOrder: 4,
  },
];

function assertInputs() {
  if (!existsSync(repoRoot)) throw new Error("A5 저장소를 찾을 수 없습니다.");
  if (!existsSync(serviceAccountPath)) throw new Error("Firebase 서비스 계정 파일을 찾을 수 없습니다.");
  for (const brand of brandDefinitions) {
    for (const file of [brand.logoFile, brand.bannerFile]) {
      const filePath = join(assetRoot, file);
      if (!existsSync(filePath)) throw new Error(`브랜드 이미지가 없습니다: ${file}`);
    }
  }
}

function serializable(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(serializable);
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializable(item)]));
  }
  return value;
}

function selectedCompanyBrandFields(data = {}) {
  const keys = [
    "brand_name",
    "brand_logo_url",
    "logo_url",
    "brand_banner_url",
    "business_brand_path",
    "business_brand_url",
  ];
  return Object.fromEntries(keys.filter((key) => data[key] !== undefined).map((key) => [key, serializable(data[key])]));
}

function publicDownloadUrl(bucketName, objectPath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

async function uploadBrandAsset(bucket, brand, role, fileName) {
  const sourcePath = join(assetRoot, fileName);
  const objectPath = `companies/${brand.companyId}/brand-pages/${brand.slug}/${role}-${basename(fileName)}`;
  const token = randomUUID();
  const contentType = fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  await bucket.upload(sourcePath, {
    destination: objectPath,
    resumable: false,
    metadata: {
      contentType,
      cacheControl: "public,max-age=31536000,immutable",
      metadata: {
        firebaseStorageDownloadTokens: token,
        companyId: brand.companyId,
        businessNo: brand.businessNo,
        role,
        source: "a5-company-brand-rollout-20260713",
      },
    },
  });

  return {
    path: objectPath,
    url: publicDownloadUrl(bucket.name, objectPath, token),
  };
}

async function productIdsForCompany(db, companyId) {
  const snapshot = await db.collection("products").where("company_id", "==", companyId).limit(24).get();
  return snapshot.docs.map((document) => document.id);
}

function brandPageData(brand, logo, banner, productIds, existingData) {
  const now = new Date().toISOString();
  const brandPath = `/a5mall/${brand.businessNo}/`;
  const sections = [
    {
      id: "brand-intro",
      type: "intro",
      title: brand.title,
      body: brand.subtitle,
      layout: "wide",
      productIds: [],
    },
    {
      id: "brand-products",
      type: "product_grid",
      title: "브랜드 상품",
      body: "",
      layout: "grid",
      productIds,
    },
  ];

  return {
    brand_id: `brand-business-${brand.businessNo}`,
    brand_name: brand.brandName,
    name: brand.brandName,
    company_id: brand.companyId,
    companyId: brand.companyId,
    business_registration_number: brand.businessNo,
    business_registration_number_normalized: brand.businessNo,
    businessRegistrationNumber: brand.businessNo,
    businessRegistrationNumberNormalized: brand.businessNo,
    title: brand.title,
    subtitle: brand.subtitle,
    category: brand.category,
    logo_url: logo.url,
    logo_asset_path: logo.path,
    asset_url: banner.url,
    asset_path: banner.path,
    banner_image_url: banner.url,
    banner_asset_path: banner.path,
    template: "editorial-storefront",
    status: "live",
    approval_status: "live",
    display_order: brand.displayOrder,
    business_brand_path: brandPath,
    business_brand_url: `https://signage-ai-a5.co.kr${brandPath}`,
    sections,
    published_snapshot: {
      title: brand.title,
      subtitle: brand.subtitle,
      sections,
      productIds,
      publishedAt: now,
    },
    source: "a5-company-brand-rollout-20260713",
    source_app: "admin",
    version: Number(existingData?.version || 0) + 1,
    created_at: existingData?.created_at || FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
}

async function main() {
  assertInputs();
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  const projectId = serviceAccount.project_id || "a5-closed-mall";
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "a5-closed-mall.firebasestorage.app";
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId, storageBucket });
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(storageBucket);
  const backup = { createdAt: new Date().toISOString(), projectId, brands: [] };

  for (const brand of brandDefinitions) {
    const pageId = `${brand.companyId}__${brand.slug}`;
    const [pageSnapshot, companySnapshot, productIds] = await Promise.all([
      db.collection("company_brand_pages").doc(pageId).get(),
      db.collection("companies").doc(brand.companyId).get(),
      productIdsForCompany(db, brand.companyId),
    ]);

    backup.brands.push({
      companyId: brand.companyId,
      businessNo: brand.businessNo,
      pageId,
      pageExisted: pageSnapshot.exists,
      previousPage: pageSnapshot.exists ? serializable(pageSnapshot.data()) : null,
      previousCompanyBrandFields: selectedCompanyBrandFields(companySnapshot.data()),
    });

    if (dryRun) {
      console.log(`[dry-run] ${brand.brandName}: 상품 ${productIds.length}개, 문서 ${pageSnapshot.exists ? "갱신" : "신규"}`);
      continue;
    }

    if (!companySnapshot.exists) throw new Error(`등록 기업 문서를 찾을 수 없습니다: ${brand.companyId}`);

    const [logo, banner] = await Promise.all([
      uploadBrandAsset(bucket, brand, "logo", brand.logoFile),
      uploadBrandAsset(bucket, brand, "banner", brand.bannerFile),
    ]);
    const pageData = brandPageData(brand, logo, banner, productIds, pageSnapshot.data());
    const companyPatch = {
      brand_name: brand.brandName,
      brand_logo_url: logo.url,
      brand_banner_url: banner.url,
      business_brand_path: `/a5mall/${brand.businessNo}/`,
      business_brand_url: `https://signage-ai-a5.co.kr/a5mall/${brand.businessNo}/`,
      brand_assets_updated_at: FieldValue.serverTimestamp(),
    };
    if (!companySnapshot.data()?.logo_url) companyPatch.logo_url = logo.url;

    const batch = db.batch();
    batch.set(db.collection("company_brand_pages").doc(pageId), pageData, { merge: true });
    batch.set(db.collection("companies").doc(brand.companyId), companyPatch, { merge: true });
    batch.set(db.collection("audit_logs").doc(`company-brand-rollout-${brand.businessNo}-${Date.now()}`), {
      type: "company_brand_rollout",
      action: pageSnapshot.exists ? "update" : "create",
      company_id: brand.companyId,
      business_registration_number_normalized: brand.businessNo,
      brand_page_id: pageId,
      product_count: productIds.length,
      source: "a5-company-brand-rollout-20260713",
      created_at: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    console.log(`${brand.brandName}: 로고·배너·브랜드관 등록 완료 (${productIds.length}개 상품 연결)`);
  }

  const backupDir = join(repoRoot, "tmp", "brand-rollout-backup-20260713", "firebase");
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, `company-brand-pages-${Date.now()}.json`), JSON.stringify(backup, null, 2), "utf8");

  if (!dryRun) {
    const { publishStorefrontRuntimeSnapshot } = requireFromFunctions("./lib/commerce/storefrontSnapshot.js");
    const snapshot = await publishStorefrontRuntimeSnapshot(db, "company_brand_rollout:20260713");
    console.log(`폐쇄몰 스냅샷 발행 완료: 상품 ${snapshot.products.length}개`);
  }

  console.log(dryRun ? "브랜드 등록 사전 점검 완료" : "브랜드 등록 및 스냅샷 검증 완료");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
