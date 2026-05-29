import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCVZXG1uM3NS09AeQf08UQNOw-SZ_a5RYE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "a5-closed-mall.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "a5-closed-mall",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "a5-closed-mall.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "954291596226",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:954291596226:web:1307d2c2f8fa25229d845b",
};

function svgUrl(title, subtitle, startColor, endColor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="620" viewBox="0 0 1600 620">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="${startColor}" />
        <stop offset="1" stop-color="${endColor}" />
      </linearGradient>
    </defs>
    <rect width="1600" height="620" rx="28" fill="url(#g)" />
    <circle cx="1320" cy="140" r="170" fill="rgba(255,255,255,.16)" />
    <circle cx="180" cy="520" r="220" fill="rgba(255,255,255,.10)" />
    <text x="92" y="120" fill="white" font-family="Arial, sans-serif" font-size="34" font-weight="800" letter-spacing="8">WITH.COMMERCE</text>
    <text x="92" y="285" fill="white" font-family="Arial, sans-serif" font-size="82" font-weight="900">${title}</text>
    <text x="96" y="365" fill="rgba(255,255,255,.86)" font-family="Arial, sans-serif" font-size="36" font-weight="700">${subtitle}</text>
    <rect x="96" y="450" width="260" height="66" rx="33" fill="white" />
    <text x="132" y="494" fill="#0f172a" font-family="Arial, sans-serif" font-size="26" font-weight="900">바로 보기</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const slots = [
  {
    id: "home-hero-hansan-sanho",
    slotId: "hero-hansan-sanho",
    sectionType: "hero_banner",
    placement: "tablet_home_hero",
    label: "메인 배너",
    title: "산후조리원 전용 혜택",
    subtitle: "공식 입점 브랜드 특가 모음",
    href: "/tablet/products/",
    displayOrder: 1,
    startColor: "#0f172a",
    endColor: "#e11d48",
  },
  {
    id: "home-promo-clearance-80",
    slotId: "promo-clearance-80",
    sectionType: "promo_banner",
    placement: "tablet_home_promo",
    label: "특가 배너 1",
    title: "객실 전용 특가",
    subtitle: "최대 할인 상품",
    href: "/tablet/products/deals/clearance-80/",
    displayOrder: 2,
    startColor: "#111827",
    endColor: "#2563eb",
  },
  {
    id: "home-promo-baby-50",
    slotId: "promo-baby-50",
    sectionType: "promo_banner",
    placement: "tablet_home_promo",
    label: "특가 배너 2",
    title: "베이비 베스트 혜택",
    subtitle: "베이비 케어",
    href: "/tablet/products/deals/baby-50/",
    displayOrder: 3,
    startColor: "#be123c",
    endColor: "#f59e0b",
  },
  {
    id: "home-promo-sanmo-35",
    slotId: "promo-sanmo-35",
    sectionType: "promo_banner",
    placement: "tablet_home_promo",
    label: "특가 배너 3",
    title: "산모 회복 추천",
    subtitle: "산모 케어",
    href: "/tablet/products/deals/sanmo-35/",
    displayOrder: 4,
    startColor: "#0f766e",
    endColor: "#84cc16",
  },
  {
    id: "home-promo-new-20",
    slotId: "promo-new-20",
    sectionType: "promo_banner",
    placement: "tablet_home_promo",
    label: "특가 배너 4",
    title: "새 브랜드 할인",
    subtitle: "신규 입점",
    href: "/tablet/products/deals/new-20/",
    displayOrder: 5,
    startColor: "#4338ca",
    endColor: "#ec4899",
  },
];

function makeRecords(updatedAt) {
  const baseRecord = {
    guest_write_enabled: true,
    demo_read_enabled: true,
    source: "cms_beta",
    source_app: "admin",
    status: "live",
    approval_status: "live",
  };

  const records = [];

  for (const slot of slots) {
    const assetUrl = svgUrl(slot.title, slot.subtitle, slot.startColor, slot.endColor);

    records.push({
      collection: "home_sections",
      id: slot.id,
      data: {
        ...baseRecord,
        section_type: slot.sectionType,
        slot_id: slot.slotId,
        source_banner_id: slot.slotId,
        placement: slot.placement,
        title: slot.title,
        eyebrow: slot.label,
        subtitle: slot.subtitle,
        href: slot.href,
        click_target: slot.href,
        display_order: slot.displayOrder,
        asset_url: assetUrl,
        asset_type: "image",
        asset_width: 1600,
        asset_height: 620,
        asset_original_name: `${slot.id}.svg`,
        asset_optimized_name: `${slot.id}.svg`,
        updated_at: updatedAt,
      },
    });

    records.push({
      collection: "media_assets",
      id: `asset-${slot.id}`,
      data: {
        ...baseRecord,
        title: slot.id,
        source_collection: "home_sections",
        source_record_id: slot.id,
        asset_type: "image",
        asset_url: assetUrl,
        external_url: assetUrl,
        owner_type: "admin",
        width: 1600,
        height: 620,
        updated_at: updatedAt,
      },
    });
  }

  records.push({
    collection: "tablet_home_configs",
    id: "storefront-home",
    data: {
      guest_write_enabled: true,
      demo_read_enabled: true,
      source: "cms_beta",
      source_app: "admin",
      status: "live",
      official_brand_count: 8,
      updated_at: updatedAt,
    },
  });

  return records;
}

async function writeWithFirebaseClient() {
  if (!process.env.FIREBASE_SEED_EMAIL || !process.env.FIREBASE_SEED_PASSWORD) {
    return false;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInWithEmailAndPassword(auth, process.env.FIREBASE_SEED_EMAIL, process.env.FIREBASE_SEED_PASSWORD);
  console.log("signed in with Firebase seed account");

  for (const record of makeRecords(serverTimestamp())) {
    await setDoc(doc(db, record.collection, record.id), record.data, { merge: true });
    console.log(`registered ${record.collection}/${record.id}`);
  }

  return true;
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

function firebaseToolsAuthModule() {
  const require = createRequire(import.meta.url);
  const searchPaths = [process.cwd()];

  if (process.env.APPDATA) {
    searchPaths.push(join(process.env.APPDATA, "npm", "node_modules"));
  }

  const modulePath = require.resolve("firebase-tools/lib/auth.js", { paths: searchPaths });
  return require(modulePath);
}

async function writeWithFirebaseCliRest() {
  const authModule = firebaseToolsAuthModule();
  const account = authModule.getProjectDefaultAccount?.(process.cwd()) ||
    authModule.getGlobalDefaultAccount?.() ||
    authModule.getAllAccounts?.()[0];

  if (!account?.tokens?.refresh_token) {
    throw new Error("Firebase CLI 로그인 계정을 찾지 못했습니다.");
  }

  const tokenResult = await authModule.getAccessToken(account.tokens.refresh_token, [
    "email",
    "openid",
    "https://www.googleapis.com/auth/cloudplatformprojects.readonly",
    "https://www.googleapis.com/auth/firebase",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);
  const accessToken = typeof tokenResult === "string" ? tokenResult : tokenResult?.access_token;

  if (!accessToken) {
    throw new Error("Firebase CLI access token 발급에 실패했습니다.");
  }

  const records = makeRecords(new Date().toISOString());
  const writes = records.map((record) => ({
    update: {
      name: `projects/${firebaseConfig.projectId}/databases/(default)/documents/${encodeURIComponent(record.collection)}/${encodeURIComponent(record.id)}`,
      fields: firestoreFields(record.data),
    },
  }));

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

  await response.json();

  for (const record of records) {
    console.log(`registered ${record.collection}/${record.id}`);
  }
}

try {
  const usedClient = await writeWithFirebaseClient();

  if (!usedClient) {
    console.log("FIREBASE_SEED_EMAIL/PASSWORD missing. Using Firebase CLI admin token.");
    await writeWithFirebaseCliRest();
  }

  console.log(`registered ${slots.length} home banners and storefront-home config`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
