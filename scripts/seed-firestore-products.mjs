import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

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
  console.error("Create a local, untracked .env.local or pass variables in the shell before running this seed script.");
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

const seedProducts = [
  {
    id: "product-care-kit",
    company_id: "company-sanho-care",
    nursery_id: "all",
    title: "몽쉘베베 수딩앰플키트",
    name: "몽쉘베베 수딩앰플키트",
    brand: "몽쉘베베",
    subtitle: "산모 피부 진정 케어 mock seed 상품",
    category: "산모케어",
    status: "active",
    price: 69000,
    inventory: 27,
    list_price: 89000,
    platform_lowest_price: 76000,
    closed_mall_price: 69000,
    image_url: "https://mommy-a5.pages.dev/images/products/mong-ampoule.jpg",
    option_ids: ["opt-care-s", "opt-care-l"],
    delivery_available: true,
    pickup_available: true,
  },
  {
    id: "product-robe",
    company_id: "company-sanho-care",
    nursery_id: "all",
    title: "수유 라운지 로브",
    name: "수유 라운지 로브",
    brand: "Sanho Care",
    subtitle: "산후조리원 객실용 로브 mock seed 상품",
    category: "산모케어",
    status: "active",
    price: 54000,
    inventory: 11,
    list_price: 69000,
    platform_lowest_price: 62000,
    closed_mall_price: 54000,
    image_url: "https://mommy-a5.pages.dev/images/products/mili-lotion.jpg",
    option_ids: ["opt-robe-m", "opt-robe-l"],
    delivery_available: true,
    pickup_available: true,
  },
  {
    id: "product-bag",
    company_id: "company-bebe-lux",
    nursery_id: "all",
    title: "프리미엄 기저귀 백",
    name: "프리미엄 기저귀 백",
    brand: "Bebe Lux",
    subtitle: "외출 준비용 프리미엄 백 mock seed 상품",
    category: "베이비케어",
    status: "active",
    price: 128000,
    inventory: 7,
    list_price: 159000,
    platform_lowest_price: 142000,
    closed_mall_price: 128000,
    image_url: "https://mommy-a5.pages.dev/images/products/santa-m.jpg",
    option_ids: ["opt-bag-cream", "opt-bag-charcoal"],
    delivery_available: true,
    pickup_available: false,
  },
  {
    id: "product-tea",
    company_id: "company-momtable",
    nursery_id: "all",
    title: "수유맘 루이보스 티 세트",
    name: "수유맘 루이보스 티 세트",
    brand: "Mom Table",
    subtitle: "산모 회복 루틴용 티 mock seed 상품",
    category: "푸드",
    status: "active",
    price: 36000,
    inventory: 36,
    list_price: 52000,
    platform_lowest_price: 44000,
    closed_mall_price: 36000,
    image_url: "https://mommy-a5.pages.dev/images/products/mili-serum.jpg",
    option_ids: ["opt-tea-basic", "opt-tea-large"],
    delivery_available: true,
    pickup_available: true,
  },
];

const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(
  auth,
  process.env.FIREBASE_SEED_EMAIL,
  process.env.FIREBASE_SEED_PASSWORD,
);

for (const product of seedProducts) {
  await setDoc(
    doc(db, "products", product.id),
    {
      ...product,
      source: "local_mock_seed",
      seeded_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );
  console.log(`Seeded products/${product.id}`);
}

console.log(`Seed complete: ${seedProducts.length} active products.`);
