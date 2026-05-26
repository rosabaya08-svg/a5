import { existsSync, readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

const dryRun = process.argv.includes("--dry-run") || process.env.FIRESTORE_SEED_DRY_RUN === "1";
const timestampMarker = dryRun ? "DRY_RUN_SERVER_TIMESTAMP" : serverTimestamp;

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

function stamp() {
  return typeof timestampMarker === "function" ? timestampMarker() : timestampMarker;
}

const baseFields = {
  demo_read_enabled: true,
  guest_write_enabled: true,
  source: "foundation_seed",
};

function record(collection, id, data) {
  return {
    collection,
    id,
    data: {
      ...baseFields,
      ...data,
      created_at: stamp(),
      updated_at: stamp(),
      seeded_at: stamp(),
    },
  };
}

const records = [
  record("companies", "company-sanho-care", {
    company_id: "company-sanho-care",
    name: "Sanho Care",
    status: "active",
    approval_status: "approved",
    manager_name: "A5 Partner Manager",
    commission_rate: 12,
    cs_phone: "1588-0000",
    cs_email: "partner@example.com",
    business_address: "Seoul",
    bank_account_status: "masked_demo",
  }),
  record("companies", "company-bebe-lux", {
    company_id: "company-bebe-lux",
    name: "Bebe Lux",
    status: "active",
    approval_status: "approved",
    manager_name: "Bebe Partner Manager",
    commission_rate: 15,
    cs_phone: "1588-0001",
    cs_email: "bebe@example.com",
    business_address: "Seoul",
    bank_account_status: "masked_demo",
  }),
  record("companies", "company-momtable", {
    company_id: "company-momtable",
    name: "Mom Table",
    status: "active",
    approval_status: "pending_review",
    manager_name: "Momtable Manager",
    commission_rate: 10,
    cs_phone: "1588-0002",
    cs_email: "momtable@example.com",
    business_address: "Seoul",
    bank_account_status: "masked_demo",
  }),
  record("nurseries", "nursery-gangnam-01", {
    nursery_id: "nursery-gangnam-01",
    name: "Sanho Gangnam Postpartum Care Center",
    status: "active",
    approval_status: "approved",
    region: "Seoul Gangnam",
    business_registration_no_masked: "123-45-****",
    business_address: "Gangnam, Seoul",
    room_count: 12,
    tablet_count: 12,
    external_nursery_id: "a4-nursery-gangnam-01",
  }),
  record("nurseries", "nursery-bundang-01", {
    nursery_id: "nursery-bundang-01",
    name: "Sanho Bundang Postpartum Care Center",
    status: "active",
    approval_status: "approved",
    region: "Gyeonggi Bundang",
    business_registration_no_masked: "234-56-****",
    business_address: "Bundang, Seongnam",
    room_count: 8,
    tablet_count: 8,
    external_nursery_id: "a4-nursery-bundang-01",
  }),
  record("rooms", "room-701", {
    nursery_id: "nursery-gangnam-01",
    room_id: "room-701",
    room_number: "701",
    name: "701",
    status: "active",
    pickup_enabled: true,
    external_room_id: "a4-room-701",
  }),
  record("rooms", "room-702", {
    nursery_id: "nursery-gangnam-01",
    room_id: "room-702",
    room_number: "702",
    name: "702",
    status: "active",
    pickup_enabled: true,
    external_room_id: "a4-room-702",
  }),
  record("rooms", "room-501", {
    nursery_id: "nursery-bundang-01",
    room_id: "room-501",
    room_number: "501",
    name: "501",
    status: "active",
    pickup_enabled: false,
    external_room_id: "a4-room-501",
  }),
  record("tablets", "tablet-701-a", {
    nursery_id: "nursery-gangnam-01",
    room_id: "room-701",
    tablet_id: "tablet-701-a",
    status: "active",
    label: "701-A",
    last_seen_at: "2026-05-20T09:00:00+09:00",
    external_tablet_id: "a4-tablet-701-a",
  }),
  record("tablets", "tablet-702-a", {
    nursery_id: "nursery-gangnam-01",
    room_id: "room-702",
    tablet_id: "tablet-702-a",
    status: "active",
    label: "702-A",
    last_seen_at: "2026-05-20T09:10:00+09:00",
    external_tablet_id: "a4-tablet-702-a",
  }),
  record("tablets", "tablet-501-a", {
    nursery_id: "nursery-bundang-01",
    room_id: "room-501",
    tablet_id: "tablet-501-a",
    status: "active",
    label: "501-A",
    last_seen_at: "2026-05-20T09:20:00+09:00",
    external_tablet_id: "a4-tablet-501-a",
  }),
  record("product_options", "opt-care-s", {
    company_id: "company-sanho-care",
    product_id: "product-care-kit",
    option_id: "opt-care-s",
    name: "Basic set",
    status: "active",
    price_delta: 0,
    stock: 18,
    reserved_stock: 0,
    external_option_code: "EXT-CARE-001-S",
  }),
  record("product_options", "opt-care-l", {
    company_id: "company-sanho-care",
    product_id: "product-care-kit",
    option_id: "opt-care-l",
    name: "Gift package",
    status: "active",
    price_delta: 6000,
    stock: 9,
    reserved_stock: 0,
    external_option_code: "EXT-CARE-001-L",
  }),
  record("product_options", "opt-robe-m", {
    company_id: "company-sanho-care",
    product_id: "product-robe",
    option_id: "opt-robe-m",
    name: "M",
    status: "active",
    price_delta: 0,
    stock: 7,
    reserved_stock: 0,
    external_option_code: "EXT-ROBE-204-M",
  }),
  record("product_options", "opt-bag-cream", {
    company_id: "company-bebe-lux",
    product_id: "product-bag",
    option_id: "opt-bag-cream",
    name: "Cream",
    status: "active",
    price_delta: 0,
    stock: 5,
    reserved_stock: 0,
    external_option_code: "LUX-BAG-88-CREAM",
  }),
  record("product_options", "opt-tea-basic", {
    company_id: "company-momtable",
    product_id: "product-tea",
    option_id: "opt-tea-basic",
    name: "20 pack",
    status: "active",
    price_delta: 0,
    stock: 24,
    reserved_stock: 0,
    external_option_code: "MOM-TEA-17-BASIC",
  }),
  record("qr_payment_sessions", "qr-sanho701", {
    qr_session_id: "qr-sanho701",
    short_code: "SANHO701",
    type: "purchase",
    status: "active",
    nursery_id: "nursery-gangnam-01",
    room_id: "room-701",
    tablet_id: "tablet-701-a",
    cart_id: "cart-701-001",
    delivery_method: "pickup",
    total_amount_snapshot: 147000,
    expires_at: "2026-05-20T18:12:00+09:00",
    items_snapshot: [
      {
        product_id: "product-care-kit",
        option_id: "opt-care-l",
        company_id: "company-sanho-care",
        product_name: "Mom care kit",
        option_name: "Gift package",
        unit_price: 75000,
        quantity: 1,
        line_amount: 75000,
      },
      {
        product_id: "product-tea",
        option_id: "opt-tea-basic",
        company_id: "company-momtable",
        product_name: "Rooibos tea set",
        option_name: "20 pack",
        unit_price: 36000,
        quantity: 2,
        line_amount: 72000,
      },
    ],
  }),
  record("qr_payment_sessions", "qr-askmom88", {
    qr_session_id: "qr-askmom88",
    short_code: "ASKMOM88",
    type: "ask",
    status: "active",
    nursery_id: "nursery-bundang-01",
    room_id: "room-501",
    tablet_id: "tablet-501-a",
    cart_id: "cart-501-001",
    delivery_method: "delivery",
    total_amount_snapshot: 128000,
    expires_at: "2026-05-20T16:30:00+09:00",
    items_snapshot: [
      {
        product_id: "product-bag",
        option_id: "opt-bag-cream",
        company_id: "company-bebe-lux",
        product_name: "Premium diaper bag",
        option_name: "Cream",
        unit_price: 128000,
        quantity: 1,
        line_amount: 128000,
      },
    ],
  }),
  record("marketing_banners", "banner-main-80", {
    company_id: "company-sanho-care",
    title: "Member-only hot deal",
    placement: "tablet_home_top",
    target: "all_nurseries",
    status: "active",
    approval_status: "approved",
    visible_from: "2026-05-01T00:00:00+09:00",
    visible_to: "2026-06-30T23:59:59+09:00",
    display_order: 1,
    click_target: "/tablet/products",
    asset_url: "https://mommy-a5.pages.dev/images/banners/banner-80.jpg",
    media_asset_id: "media-banner-80",
  }),
  record("marketing_banners", "banner-baby-care", {
    company_id: "company-bebe-lux",
    title: "Baby care essentials",
    placement: "shopping_home_mid",
    target: "nursery-gangnam-01",
    status: "active",
    approval_status: "approved",
    visible_from: "2026-05-01T00:00:00+09:00",
    visible_to: "2026-06-30T23:59:59+09:00",
    display_order: 2,
    click_target: "/tablet/products?category=baby-care",
    asset_url: "https://mommy-a5.pages.dev/images/banners/banner-50.jpg",
    media_asset_id: "media-banner-baby-care",
  }),
  record("marketing_videos", "video-care-intro", {
    company_id: "company-sanho-care",
    title: "Mom care video placeholder",
    placement: "home_video_strip",
    target: "all_nurseries",
    status: "active",
    approval_status: "approved",
    display_order: 1,
    video_url: "",
    thumbnail_url: "https://mommy-a5.pages.dev/images/banners/hansan.jpg",
    media_asset_id: "media-video-care-intro",
  }),
  record("home_sections", "section-main-hero", {
    section_id: "section-main-hero",
    title: "A5 Closed Mall Exclusive",
    placement: "shopping_home_hero",
    status: "active",
    display_order: 1,
    banner_ids: ["banner-main-80"],
    product_ids: ["product-care-kit", "product-robe", "product-bag"],
    click_target: "/tablet/products",
    asset_url: "https://mommy-a5.pages.dev/images/banners/hansan.jpg",
  }),
  record("home_sections", "section-best-products", {
    section_id: "section-best-products",
    title: "Best products",
    placement: "shopping_home_products",
    status: "active",
    display_order: 2,
    banner_ids: ["banner-baby-care"],
    product_ids: ["product-care-kit", "product-bag", "product-tea"],
    click_target: "/tablet/products?sort=best",
  }),
  record("tablet_home_configs", "tablet-home-gangnam-701", {
    nursery_id: "nursery-gangnam-01",
    room_id: "room-701",
    tablet_id: "tablet-701-a",
    title: "Room 701 closed mall",
    status: "active",
    display_order: 1,
    section_ids: ["section-main-hero", "section-best-products"],
    banner_ids: ["banner-main-80"],
    video_ids: ["video-care-intro"],
    qr_short_code: "SANHO701",
  }),
  record("tablet_home_configs", "tablet-home-gangnam-702", {
    nursery_id: "nursery-gangnam-01",
    room_id: "room-702",
    tablet_id: "tablet-702-a",
    title: "Room 702 closed mall",
    status: "active",
    display_order: 2,
    section_ids: ["section-main-hero", "section-best-products"],
    banner_ids: ["banner-main-80", "banner-baby-care"],
    video_ids: [],
    qr_short_code: "OLDQR22",
  }),
  record("media_assets", "media-banner-80", {
    owner_type: "company",
    owner_id: "company-sanho-care",
    company_id: "company-sanho-care",
    asset_type: "banner_image",
    status: "active",
    title: "Main banner 80",
    storage_path: "marketing/banners/company-sanho-care/banner-main-80.jpg",
    public_url: "https://mommy-a5.pages.dev/images/banners/banner-80.jpg",
    approval_status: "approved",
  }),
  record("media_assets", "media-banner-baby-care", {
    owner_type: "company",
    owner_id: "company-bebe-lux",
    company_id: "company-bebe-lux",
    asset_type: "banner_image",
    status: "active",
    title: "Baby care banner",
    storage_path: "marketing/banners/company-bebe-lux/banner-baby-care.jpg",
    public_url: "https://mommy-a5.pages.dev/images/banners/banner-50.jpg",
    approval_status: "approved",
  }),
  record("media_assets", "media-video-care-intro", {
    owner_type: "company",
    owner_id: "company-sanho-care",
    company_id: "company-sanho-care",
    asset_type: "video_placeholder",
    status: "active",
    title: "Care intro video",
    storage_path: "marketing/videos/company-sanho-care/video-care-intro.mp4",
    public_url: "",
    approval_status: "approved",
  }),
  record("audit_logs", "audit-foundation-seed", {
    actor_role: "seed_admin",
    actor_id: "firebase-auth-seed-user",
    action: "foundation_seed_upsert",
    target_collection: "foundation",
    target_id: "a5-closed-mall",
    status: "active",
    message: "Seeded A5 closed mall foundation documents for beta storefront and operations.",
    risk_level: "info",
  }),
];

const requiredCollections = [
  "companies",
  "nurseries",
  "rooms",
  "tablets",
  "product_options",
  "qr_payment_sessions",
  "marketing_banners",
  "marketing_videos",
  "home_sections",
  "tablet_home_configs",
  "media_assets",
  "audit_logs",
];

const relationshipRequirements = {
  companies: ["company_id"],
  nurseries: ["nursery_id"],
  rooms: ["nursery_id", "room_id"],
  tablets: ["nursery_id", "room_id", "tablet_id"],
  product_options: ["company_id", "product_id", "option_id"],
  qr_payment_sessions: ["nursery_id", "room_id", "tablet_id", "short_code"],
  marketing_banners: ["company_id"],
  marketing_videos: ["company_id"],
  tablet_home_configs: ["nursery_id", "room_id", "tablet_id"],
};

function validateRecords(seedRecords) {
  const errors = [];
  const seededCollections = new Set(seedRecords.map((seedRecord) => seedRecord.collection));

  for (const collection of requiredCollections) {
    if (!seededCollections.has(collection)) {
      errors.push(`Missing required collection seed: ${collection}`);
    }
  }

  for (const seedRecord of seedRecords) {
    const prefix = `${seedRecord.collection}/${seedRecord.id}`;
    if (!seedRecord.collection || !seedRecord.id || !seedRecord.data) {
      errors.push(`${prefix} is missing collection, id, or data`);
      continue;
    }

    for (const field of ["status", "created_at", "updated_at"]) {
      if (!(field in seedRecord.data)) {
        errors.push(`${prefix} is missing ${field}`);
      }
    }

    for (const field of relationshipRequirements[seedRecord.collection] ?? []) {
      if (!seedRecord.data[field]) {
        errors.push(`${prefix} is missing relationship field ${field}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("[seed:foundation] Validation failed");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
}

function printSummary(seedRecords) {
  const counts = new Map();
  for (const seedRecord of seedRecords) {
    counts.set(seedRecord.collection, (counts.get(seedRecord.collection) ?? 0) + 1);
  }

  console.log("[seed:foundation] Collection summary");
  for (const collection of requiredCollections) {
    console.log(`- ${collection}: ${counts.get(collection) ?? 0}`);
  }
  console.log(`- total: ${seedRecords.length}`);
}

validateRecords(records);
printSummary(records);

if (dryRun) {
  console.log("[seed:foundation] Dry run complete. No Firebase login or Firestore write was attempted.");
  process.exit(0);
}

loadLocalEnv();

const requiredEnv = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_SEED_EMAIL",
  "FIREBASE_SEED_PASSWORD",
];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  console.error("Use FIREBASE_SEED_EMAIL/FIREBASE_SEED_PASSWORD in the shell or local untracked .env.local.");
  console.error("Secret values are never printed.");
  process.exit(1);
}

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, process.env.FIREBASE_SEED_EMAIL, process.env.FIREBASE_SEED_PASSWORD);
console.log("[seed:foundation] Signed in with Firebase seed account.");

for (const seedRecord of records) {
  await setDoc(doc(db, seedRecord.collection, seedRecord.id), seedRecord.data, { merge: true });
  console.log(`[seed:foundation] Seeded ${seedRecord.collection}/${seedRecord.id}`);
}

console.log(`[seed:foundation] Foundation seed complete: ${records.length} documents.`);
