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

const qrSessions = [
  {
    id: "SANHO701",
    qr_session_id: "SANHO701",
    shortCode: "SANHO701",
    short_code: "SANHO701",
    type: "purchase",
    status: "active",
    nurseryId: "nursery-gangnam-01",
    nursery_id: "nursery-gangnam-01",
    roomId: "room-701",
    room_id: "room-701",
    tabletId: "tablet-701-a",
    tablet_id: "tablet-701-a",
    cartId: "cart-701-001",
    cart_id: "cart-701-001",
    createdAt: "2026-05-19T15:12:00+09:00",
    created_at: "2026-05-19T15:12:00+09:00",
    expiresAt: "2026-05-19T18:12:00+09:00",
    expires_at: "2026-05-19T18:12:00+09:00",
    deliveryMethod: "pickup",
    delivery_method: "pickup",
    totalAmount: 147000,
    total_amount: 147000,
    guest_read_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
    items: [
      {
        productId: "product-care-kit",
        product_id: "product-care-kit",
        productName: "A5 산모 회복 케어 키트",
        product_name: "A5 산모 회복 케어 키트",
        optionName: "기본 패키지",
        option_name: "기본 패키지",
        unitPrice: 75000,
        unit_price: 75000,
        quantity: 1,
        companyId: "company-sanho-care",
        company_id: "company-sanho-care",
      },
      {
        productId: "product-tea",
        product_id: "product-tea",
        productName: "수유맘 루이보스 티 세트",
        product_name: "수유맘 루이보스 티 세트",
        optionName: "20입",
        option_name: "20입",
        unitPrice: 36000,
        unit_price: 36000,
        quantity: 2,
        companyId: "company-momtable",
        company_id: "company-momtable",
      },
    ],
  },
  {
    id: "ASKMOM88",
    qr_session_id: "ASKMOM88",
    shortCode: "ASKMOM88",
    short_code: "ASKMOM88",
    type: "ask",
    status: "paid",
    nurseryId: "nursery-bundang-01",
    nursery_id: "nursery-bundang-01",
    roomId: "room-501",
    room_id: "room-501",
    tabletId: "tablet-501-a",
    tablet_id: "tablet-501-a",
    cartId: "cart-501-001",
    cart_id: "cart-501-001",
    createdAt: "2026-05-19T10:01:00+09:00",
    created_at: "2026-05-19T10:01:00+09:00",
    expiresAt: "2026-05-19T13:01:00+09:00",
    expires_at: "2026-05-19T13:01:00+09:00",
    deliveryMethod: "delivery",
    delivery_method: "delivery",
    totalAmount: 128000,
    total_amount: 128000,
    guest_read_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
    items: [
      {
        productId: "product-bag",
        product_id: "product-bag",
        productName: "프리미엄 기저귀 백",
        product_name: "프리미엄 기저귀 백",
        optionName: "크림",
        option_name: "크림",
        unitPrice: 128000,
        unit_price: 128000,
        quantity: 1,
        companyId: "company-bebe-lux",
        company_id: "company-bebe-lux",
      },
    ],
  },
  {
    id: "OLDQR22",
    qr_session_id: "OLDQR22",
    shortCode: "OLDQR22",
    short_code: "OLDQR22",
    type: "purchase",
    status: "expired",
    nurseryId: "nursery-gangnam-01",
    nursery_id: "nursery-gangnam-01",
    roomId: "room-702",
    room_id: "room-702",
    tabletId: "tablet-702-a",
    tablet_id: "tablet-702-a",
    cartId: "cart-702-001",
    cart_id: "cart-702-001",
    createdAt: "2026-05-18T20:14:00+09:00",
    created_at: "2026-05-18T20:14:00+09:00",
    expiresAt: "2026-05-18T23:14:00+09:00",
    expires_at: "2026-05-18T23:14:00+09:00",
    deliveryMethod: "pickup",
    delivery_method: "pickup",
    totalAmount: 39000,
    total_amount: 39000,
    guest_read_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
    items: [
      {
        productId: "product-blanket",
        product_id: "product-blanket",
        productName: "신생아 순면 블랭킷",
        product_name: "신생아 순면 블랭킷",
        optionName: "기본",
        option_name: "기본",
        unitPrice: 39000,
        unit_price: 39000,
        quantity: 1,
        companyId: "company-bebe-lux",
        company_id: "company-bebe-lux",
      },
    ],
  },
];

const orders = [
  {
    id: "A5-20260519-001",
    order_id: "A5-20260519-001",
    orderNo: "A5-20260519-001",
    order_no: "A5-20260519-001",
    qrSessionId: "ASKMOM88",
    qr_session_id: "ASKMOM88",
    nurseryId: "nursery-bundang-01",
    nursery_id: "nursery-bundang-01",
    roomId: "room-501",
    room_id: "room-501",
    customerName: "김*영",
    customer_name: "김*영",
    customerPhoneMasked: "010-****-2388",
    customer_phone_masked: "010-****-2388",
    status: "paid",
    deliveryMethod: "delivery",
    delivery_method: "delivery",
    totalAmount: 128000,
    total_amount: 128000,
    paidAt: "2026-05-19T10:09:00+09:00",
    paid_at: "2026-05-19T10:09:00+09:00",
    createdAt: "2026-05-19T10:05:00+09:00",
    created_at: "2026-05-19T10:05:00+09:00",
    itemIds: ["A5-20260519-001-1"],
    item_ids: ["A5-20260519-001-1"],
    guest_lookup_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
  },
  {
    id: "A5-20260519-002",
    order_id: "A5-20260519-002",
    orderNo: "A5-20260519-002",
    order_no: "A5-20260519-002",
    qrSessionId: "SANHO701",
    qr_session_id: "SANHO701",
    nurseryId: "nursery-gangnam-01",
    nursery_id: "nursery-gangnam-01",
    roomId: "room-701",
    room_id: "room-701",
    customerName: "박*리",
    customer_name: "박*리",
    customerPhoneMasked: "010-****-7811",
    customer_phone_masked: "010-****-7811",
    status: "ready_for_pickup",
    deliveryMethod: "pickup",
    delivery_method: "pickup",
    totalAmount: 147000,
    total_amount: 147000,
    paidAt: "2026-05-19T15:28:00+09:00",
    paid_at: "2026-05-19T15:28:00+09:00",
    createdAt: "2026-05-19T15:22:00+09:00",
    created_at: "2026-05-19T15:22:00+09:00",
    itemIds: ["A5-20260519-002-1", "A5-20260519-002-2"],
    item_ids: ["A5-20260519-002-1", "A5-20260519-002-2"],
    guest_lookup_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
  },
  {
    id: "A5-20260518-011",
    order_id: "A5-20260518-011",
    orderNo: "A5-20260518-011",
    order_no: "A5-20260518-011",
    qrSessionId: "OLDQR22",
    qr_session_id: "OLDQR22",
    nurseryId: "nursery-gangnam-01",
    nursery_id: "nursery-gangnam-01",
    roomId: "room-702",
    room_id: "room-702",
    customerName: "이*진",
    customer_name: "이*진",
    customerPhoneMasked: "010-****-4402",
    customer_phone_masked: "010-****-4402",
    status: "refund_requested",
    deliveryMethod: "pickup",
    delivery_method: "pickup",
    totalAmount: 39000,
    total_amount: 39000,
    paidAt: "2026-05-18T21:02:00+09:00",
    paid_at: "2026-05-18T21:02:00+09:00",
    createdAt: "2026-05-18T20:56:00+09:00",
    created_at: "2026-05-18T20:56:00+09:00",
    itemIds: ["A5-20260518-011-1"],
    item_ids: ["A5-20260518-011-1"],
    guest_lookup_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
  },
];

const orderItems = [
  {
    id: "A5-20260519-001-1",
    order_id: "A5-20260519-001",
    order_no: "A5-20260519-001",
    company_id: "company-bebe-lux",
    product_id: "product-bag",
    product_name: "프리미엄 기저귀 백",
    option_name: "크림",
    quantity: 1,
    unit_price: 128000,
    delivery_status: "invoice_pending",
    settlement_amount: 108800,
    guest_lookup_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
  },
  {
    id: "A5-20260519-002-1",
    order_id: "A5-20260519-002",
    order_no: "A5-20260519-002",
    company_id: "company-sanho-care",
    product_id: "product-care-kit",
    product_name: "A5 산모 회복 케어 키트",
    option_name: "기본 패키지",
    quantity: 1,
    unit_price: 75000,
    delivery_status: "pickup_ready",
    settlement_amount: 66000,
    guest_lookup_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
  },
  {
    id: "A5-20260519-002-2",
    order_id: "A5-20260519-002",
    order_no: "A5-20260519-002",
    company_id: "company-momtable",
    product_id: "product-tea",
    product_name: "수유맘 루이보스 티 세트",
    option_name: "20입",
    quantity: 2,
    unit_price: 36000,
    delivery_status: "pickup_ready",
    settlement_amount: 64800,
    guest_lookup_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
  },
  {
    id: "A5-20260518-011-1",
    order_id: "A5-20260518-011",
    order_no: "A5-20260518-011",
    company_id: "company-bebe-lux",
    product_id: "product-blanket",
    product_name: "신생아 순면 블랭킷",
    option_name: "기본",
    quantity: 1,
    unit_price: 39000,
    delivery_status: "picked_up",
    settlement_amount: 33150,
    guest_lookup_enabled: true,
    guest_write_enabled: true,
    source: "firestore_commerce_seed",
  },
];

if (process.env.FIREBASE_SEED_EMAIL && process.env.FIREBASE_SEED_PASSWORD) {
  await signInWithEmailAndPassword(auth, process.env.FIREBASE_SEED_EMAIL, process.env.FIREBASE_SEED_PASSWORD);
} else {
  console.log("FIREBASE_SEED_EMAIL/PASSWORD missing. Using public guest demo write rules for commerce seed.");
}

for (const session of qrSessions) {
  await setDoc(doc(db, "qr_payment_sessions", session.id), { ...session, seeded_at: now(), updated_at: now() }, { merge: true });
  console.log(`Seeded qr_payment_sessions/${session.id}`);
}

for (const order of orders) {
  await setDoc(doc(db, "orders", order.id), { ...order, seeded_at: now(), updated_at: now() }, { merge: true });
  console.log(`Seeded orders/${order.id}`);
}

for (const item of orderItems) {
  await setDoc(doc(db, "order_items", item.id), { ...item, seeded_at: now(), updated_at: now() }, { merge: true });
  console.log(`Seeded order_items/${item.id}`);
}

console.log(`Commerce seed complete: ${qrSessions.length + orders.length + orderItems.length} documents.`);
