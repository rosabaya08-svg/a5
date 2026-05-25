import { existsSync, readFileSync } from "node:fs";
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
  console.error("Add local untracked values to .env.local or pass them in the shell. Secret values are never printed.");
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
const now = () => serverTimestamp();

const records = [
  {
    collection: "companies",
    id: "company-sanho-care",
    data: {
      name: "Sanho Care",
      status: "approved",
      manager_name: "A5 Partner Manager",
      commission_rate: 12,
      cs_phone: "1588-0000",
      cs_email: "partner@example.com",
      business_address: "Seoul",
      source: "foundation_seed",
    },
  },
  {
    collection: "companies",
    id: "company-bebe-lux",
    data: {
      name: "Bebe Lux",
      status: "approved",
      manager_name: "Bebe Partner Manager",
      commission_rate: 12,
      cs_phone: "1588-0001",
      cs_email: "bebe@example.com",
      business_address: "Seoul",
      source: "foundation_seed",
    },
  },
  {
    collection: "companies",
    id: "company-momtable",
    data: {
      name: "Mom Table",
      status: "approved",
      manager_name: "Momtable Manager",
      commission_rate: 10,
      cs_phone: "1588-0002",
      cs_email: "momtable@example.com",
      business_address: "Seoul",
      source: "foundation_seed",
    },
  },
  {
    collection: "nurseries",
    id: "nursery-gangnam-01",
    data: {
      name: "Sanho Gangnam Postpartum Care Center",
      status: "approved",
      region: "Seoul",
      business_address: "Gangnam, Seoul",
      room_count: 12,
      external_nursery_id: "a4-nursery-gangnam-01",
      source: "foundation_seed",
    },
  },
  {
    collection: "rooms",
    id: "room-701",
    data: {
      nursery_id: "nursery-gangnam-01",
      room_number: "701",
      name: "701",
      status: "active",
      pickup_enabled: true,
      external_room_id: "a4-room-701",
      source: "foundation_seed",
    },
  },
  {
    collection: "tablets",
    id: "tablet-701-a",
    data: {
      nursery_id: "nursery-gangnam-01",
      room_id: "room-701",
      tablet_id: "tablet-701-a",
      status: "active",
      label: "701-A",
      external_tablet_id: "a4-tablet-701-a",
      source: "foundation_seed",
    },
  },
  {
    collection: "brands",
    id: "brand-sanho-care",
    data: {
      company_id: "company-sanho-care",
      name: "Sanho Care",
      category: "mom-care",
      status: "published",
      logo_url: "https://mommy-a5.pages.dev/images/logos/logo-zespa.jpg",
      display_order: 1,
      source: "foundation_seed",
    },
  },
  {
    collection: "brands",
    id: "brand-bebe-lux",
    data: {
      company_id: "company-bebe-lux",
      name: "Bebe Lux",
      category: "baby-care",
      status: "published",
      logo_url: "https://mommy-a5.pages.dev/images/logos/logo-braun.jpg",
      display_order: 2,
      source: "foundation_seed",
    },
  },
  {
    collection: "home_sections",
    id: "section-main-hero",
    data: {
      title: "A5 Closed Mall Exclusive",
      placement: "shopping_home_hero",
      status: "published",
      visible_from: new Date("2026-05-01T00:00:00+09:00"),
      display_order: 1,
      click_target: "/tablet/products",
      asset_url: "https://mommy-a5.pages.dev/images/banners/hansan.jpg",
      source: "foundation_seed",
    },
  },
  {
    collection: "marketing_banners",
    id: "banner-main-80",
    data: {
      company_id: "company-sanho-care",
      title: "Member-only hot deal",
      placement: "tablet_home_top",
      target: "all_nurseries",
      status: "published",
      approval_status: "approved",
      visible_from: new Date("2026-05-01T00:00:00+09:00"),
      display_order: 1,
      click_target: "/tablet/products",
      asset_url: "https://mommy-a5.pages.dev/images/banners/banner-80.jpg",
      source: "foundation_seed",
    },
  },
  {
    collection: "marketing_videos",
    id: "video-care-intro",
    data: {
      company_id: "company-sanho-care",
      title: "Mom care video placeholder",
      placement: "home_video_strip",
      target: "all_nurseries",
      status: "published",
      approval_status: "approved",
      display_order: 1,
      asset_url: "",
      source: "foundation_seed",
    },
  },
  {
    collection: "exhibitions",
    id: "exhibition-new-mom-care",
    data: {
      title: "New Mom Care Special",
      status: "published",
      placement: "storefront_section",
      display_order: 1,
      source: "foundation_seed",
    },
  },
  {
    collection: "exhibition_products",
    id: "entry-care-kit",
    data: {
      company_id: "company-sanho-care",
      exhibition_id: "exhibition-new-mom-care",
      product_id: "product-care-kit",
      status: "published",
      display_order: 1,
      source: "foundation_seed",
    },
  },
  {
    collection: "tablet_home_configs",
    id: "tablet-home-gangnam-701",
    data: {
      nursery_id: "nursery-gangnam-01",
      room_id: "room-701",
      tablet_id: "tablet-701-a",
      title: "Room 701 closed mall",
      status: "published",
      display_order: 1,
      source: "foundation_seed",
    },
  },
  {
    collection: "product_detail_pages",
    id: "detail-product-care-kit",
    data: {
      company_id: "company-sanho-care",
      product_id: "product-care-kit",
      title: "Care kit detail page",
      status: "published",
      body: "A5 beta product detail page seed. Final copy, AS, refund, and delivery policy require operator review.",
      source: "foundation_seed",
    },
  },
];

await signInWithEmailAndPassword(
  auth,
  process.env.FIREBASE_SEED_EMAIL,
  process.env.FIREBASE_SEED_PASSWORD,
);

for (const record of records) {
  await setDoc(
    doc(db, record.collection, record.id),
    {
      ...record.data,
      seeded_at: now(),
      updated_at: now(),
    },
    { merge: true },
  );
  console.log(`Seeded ${record.collection}/${record.id}`);
}

console.log(`Foundation seed complete: ${records.length} documents.`);
