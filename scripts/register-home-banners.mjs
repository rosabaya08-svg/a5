import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = raw.replace(/^['"]|['"]$/g, "");
    }
  }
}

loadLocalEnv();

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "a5-closed-mall",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "a5-closed-mall.firebasestorage.app",
};

const downloadBannerFiles = [
  "C:\\Users\\djfhl\\Downloads\\ChatGPT Image 2026년 6월 26일 오후 06_10_36 (1).png",
  "C:\\Users\\djfhl\\Downloads\\ChatGPT Image 2026년 6월 26일 오후 06_10_36 (2).png",
  "C:\\Users\\djfhl\\Downloads\\ChatGPT Image 2026년 6월 26일 오후 06_10_36 (3).png",
  "C:\\Users\\djfhl\\Downloads\\ChatGPT Image 2026년 6월 26일 오후 06_10_36 (4).png",
  "C:\\Users\\djfhl\\Downloads\\ChatGPT Image 2026년 6월 26일 오후 06_10_36 (5).png",
];

const mainCarouselSlots = [
  {
    id: "home-main-carousel-1",
    slotId: "main-carousel-1",
    label: "메인 배너 1",
    title: "브랜드 본사 직거래 혜택",
    subtitle: "공식 브랜드 상품을 합리적인 가격으로 만나보세요.",
    href: "/tablet/products/",
  },
  {
    id: "home-main-carousel-2",
    slotId: "main-carousel-2",
    label: "메인 배너 2",
    title: "객실에서 바로 주문",
    subtitle: "태블릿으로 상품을 고르고 QR로 간편하게 결제하세요.",
    href: "/tablet/products/",
  },
  {
    id: "home-main-carousel-3",
    slotId: "main-carousel-3",
    label: "메인 배너 3",
    title: "산후조리원 특별 혜택",
    subtitle: "엄마용품과 유아용품을 한곳에서 만나보세요.",
    href: "/tablet/products/",
  },
  {
    id: "home-main-carousel-4",
    slotId: "main-carousel-4",
    label: "메인 배너 4",
    title: "엄마를 위한 회복 케어",
    subtitle: "산후 회복에 필요한 상품을 전용 혜택으로 준비했습니다.",
    href: "/tablet/products/",
  },
  {
    id: "home-main-carousel-5",
    slotId: "main-carousel-5",
    label: "메인 배너 5",
    title: "아기를 위한 첫 준비",
    subtitle: "신생아 필수 유아용품을 한눈에 확인하세요.",
    href: "/tablet/products/",
  },
];

const legacyHeroSlot = {
  id: "home-hero-hansan-sanho",
  slotId: "hero-hansan-sanho",
  label: "기존 메인 배너",
  title: "한국산후조리원연합회 공식 후원사 몰",
  subtitle: "산후조리원 전용 멤버십 혜택",
  href: "/tablet/products/",
};

const promoSlots = [
  {
    id: "home-promo-clearance-80",
    slotId: "promo-clearance-80",
    label: "할인 배너 1",
    title: "51% 이상 할인",
    subtitle: "입점사가 등록한 상품 자동 구간",
    href: "/tablet/products/deals/discount-51/",
  },
  {
    id: "home-promo-baby-50",
    slotId: "promo-baby-50",
    label: "할인 배너 2",
    title: "36% 이상 할인",
    subtitle: "입점사가 등록한 상품 자동 구간",
    href: "/tablet/products/deals/discount-36-50/",
  },
  {
    id: "home-promo-sanmo-35",
    slotId: "promo-sanmo-35",
    label: "할인 배너 3",
    title: "26% 이상 할인",
    subtitle: "입점사가 등록한 상품 자동 구간",
    href: "/tablet/products/deals/discount-26-35/",
  },
  {
    id: "home-promo-new-20",
    slotId: "promo-new-20",
    label: "할인 배너 4",
    title: "10% 이상 할인",
    subtitle: "입점사가 등록한 상품 자동 구간",
    href: "/tablet/products/deals/discount-10-25/",
  },
];

function firebaseToolsAuthModule() {
  const require = createRequire(import.meta.url);
  const searchPaths = [process.cwd()];

  if (process.env.APPDATA) {
    searchPaths.push(join(process.env.APPDATA, "npm", "node_modules"));
  }

  const modulePath = require.resolve("firebase-tools/lib/auth.js", { paths: searchPaths });
  return require(modulePath);
}

async function getFirebaseAccessToken() {
  const authModule = firebaseToolsAuthModule();
  const account =
    authModule.getProjectDefaultAccount?.(process.cwd()) ||
    authModule.getGlobalDefaultAccount?.() ||
    authModule.getAllAccounts?.()[0];

  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI 로그인 계정을 찾지 못했습니다.");
  }

  const tokenResult = await authModule.getAccessToken(account.tokens.refresh_token, [
    "email",
    "openid",
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);

  const accessToken = typeof tokenResult === "string" ? tokenResult : tokenResult?.access_token;
  if (!accessToken) throw new Error("Firebase CLI access token 발급에 실패했습니다.");

  return accessToken;
}

function firestoreValue(value) {
  if (value === undefined || value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } };
  }

  return { mapValue: { fields: firestoreFields(value) } };
}

function firestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, firestoreValue(value)]),
  );
}

async function uploadStorageObject(accessToken, slot, filePath, index) {
  if (!existsSync(filePath)) return null;

  const token = randomUUID();
  const objectPath = `public/storefront/home_sections/${slot.id}/${Date.now()}-${index + 1}-${basename(filePath)}`;
  const metadata = {
    name: objectPath,
    contentType: "image/png",
    metadata: {
      firebaseStorageDownloadTokens: token,
      source: "a5-main-carousel-seed",
      slotId: slot.slotId,
    },
  };

  const delimiter = `a5-${randomUUID()}`;
  const bodyPrefix =
    `--${delimiter}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${delimiter}\r\n` +
    "Content-Type: image/png\r\n\r\n";
  const bodySuffix = `\r\n--${delimiter}--`;
  const fileBuffer = readFileSync(filePath);
  const body = Buffer.concat([Buffer.from(bodyPrefix), fileBuffer, Buffer.from(bodySuffix)]);

  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${firebaseConfig.storageBucket}/o?uploadType=multipart`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${delimiter}`,
      },
      body,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Storage upload failed for ${slot.id}: ${response.status} ${errorText}`);
  }

  const encodedPath = encodeURIComponent(objectPath);
  return {
    asset_url: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodedPath}?alt=media&token=${token}`,
    asset_path: objectPath,
    asset_type: "image",
    asset_original_name: basename(filePath),
    asset_storage_mode: "firebase_storage",
  };
}

function makeHomeRecord(slot, displayOrder, assetPatch = {}) {
  const hasImage = Boolean(assetPatch.asset_url);

  return {
    id: slot.id,
    section_type: slot.id.includes("promo") ? "promo_banner" : "hero_banner",
    slot_id: slot.slotId,
    source_banner_id: slot.slotId,
    placement: slot.id.includes("main-carousel") ? "tablet_home_carousel" : slot.id.includes("promo") ? "tablet_home_promo" : "tablet_home_hero",
    title: slot.title,
    eyebrow: slot.label,
    subtitle: slot.subtitle,
    href: slot.href,
    click_target: slot.href,
    display_order: displayOrder,
    status: "live",
    approval_status: "live",
    source: "cms_beta",
    source_app: "admin",
    demo_read_enabled: true,
    guest_write_enabled: true,
    overlay_enabled: !hasImage,
    text_overlay_enabled: !hasImage,
    badge_enabled: slot.id.includes("promo") && !hasImage,
    auto_discount_copy_enabled: slot.id.includes("promo") && !hasImage,
    updated_at: new Date().toISOString(),
    ...assetPatch,
  };
}

async function commitFirestore(accessToken, records) {
  const writes = records.map((record) => {
    const { collection, id, data } = record;
    return {
      update: {
        name: `projects/${firebaseConfig.projectId}/databases/(default)/documents/${collection}/${id}`,
        fields: firestoreFields(data),
      },
    };
  });

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST commit failed: ${response.status} ${errorText}`);
  }
}

async function main() {
  const accessToken = await getFirebaseAccessToken();
  const records = [];

  const legacyAssetPatch = await uploadStorageObject(accessToken, legacyHeroSlot, downloadBannerFiles[0], 0);
  records.push({
    collection: "home_sections",
    id: legacyHeroSlot.id,
    data: makeHomeRecord(legacyHeroSlot, 1, legacyAssetPatch ?? {}),
  });

  for (const [index, slot] of mainCarouselSlots.entries()) {
    const assetPatch = await uploadStorageObject(accessToken, slot, downloadBannerFiles[index], index);
    records.push({
      collection: "home_sections",
      id: slot.id,
      data: makeHomeRecord(slot, index + 2, assetPatch ?? {}),
    });

    if (assetPatch?.asset_url) {
      records.push({
        collection: "media_assets",
        id: `asset-${slot.id}`,
        data: {
          title: slot.title,
          source_collection: "home_sections",
          source_record_id: slot.id,
          owner_type: "admin",
          status: "live",
          approval_status: "live",
          demo_read_enabled: true,
          guest_write_enabled: true,
          source: "cms_beta",
          updated_at: new Date().toISOString(),
          ...assetPatch,
        },
      });
    }
  }

  for (const [index, slot] of promoSlots.entries()) {
    records.push({
      collection: "home_sections",
      id: slot.id,
      data: makeHomeRecord(slot, index + 20),
    });
  }

  records.push({
    collection: "tablet_home_configs",
    id: "storefront-home",
    data: {
      status: "live",
      official_brand_count: 8,
      demo_read_enabled: true,
      guest_write_enabled: true,
      source: "cms_beta",
      source_app: "admin",
      updated_at: new Date().toISOString(),
    },
  });

  await commitFirestore(accessToken, records);

  for (const record of records) {
    console.log(`registered ${record.collection}/${record.id}`);
  }
  console.log(`registered ${mainCarouselSlots.length} main carousel banners`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
