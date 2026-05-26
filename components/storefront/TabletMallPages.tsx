import Link from "next/link";
import { AddToCartPanel, CartStatusBadge, LiveCartPage, LiveQrSessionPanel } from "@/components/storefront/LiveShopClient";
import { TabletContextBadge, TabletFirstLoginGate } from "@/components/tablet/TabletAccessFlow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { MallProductProfile } from "@/data/mockShopContent";
import {
  requestedDataSource,
} from "@/lib/repositories";
import {
  getLiveApprovedProducts,
  getLiveNurseryById,
  getLiveProductById,
  getLiveProductOptions,
  getLiveQrSessionByShortCode,
  getLiveRoomById,
  getLiveStorefrontContent,
  productSourceLabel,
} from "@/lib/repositories/liveCommerceRepository";
import type { StorefrontContent } from "@/lib/repositories/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { CartItemSnapshot, Nursery, Product, QrPaymentSession, Room } from "@/types/commerce";

type StoreContext = {
  session: QrPaymentSession;
  nursery?: Nursery;
  room?: Room;
  content: StorefrontContent;
};

type ProductReadSource = "Firebase 상품" | "모의 대체 데이터";

type ProductListRead = {
  products: Product[];
  source: ProductReadSource;
  reason?: string;
};

type ProductDetailRead = {
  product: Product;
  source: ProductReadSource;
  reason?: string;
};

const tabletNav = [
  { href: "/tablet/products", label: "상품" },
  { href: "/tablet/cart", label: "장바구니" },
  { href: "/tablet/qr", label: "QR" },
  { href: "/tablet/ask", label: "조르기" },
];

async function getContext(shortCode = "SANHO701"): Promise<StoreContext> {
  const [{ data: session }, content] = await Promise.all([
    getLiveQrSessionByShortCode(shortCode),
    getLiveStorefrontContent(),
  ]);
  const [nursery, room] = await Promise.all([
    getLiveNurseryById(session.nurseryId),
    getLiveRoomById(session.roomId),
  ]);

  return { session, nursery: nursery.data, room: room.data, content };
}

async function getApprovedProductsWithSource(): Promise<ProductListRead> {
  const read = await getLiveApprovedProducts();
  return { products: read.data, source: productSourceLabel(read.source), reason: read.reason };
}

async function getProductWithSource(productId: string): Promise<ProductDetailRead> {
  const read = await getLiveProductById(productId);
  return { product: read.data, source: productSourceLabel(read.source), reason: read.reason };
}

async function getProductOptionsWithFallback(productId: string) {
  return (await getLiveProductOptions(productId)).data;
}

function discountRate(product: Product) {
  const { listPrice, closedMallPrice } = product.comparison;
  return Math.max(0, Math.round(((listPrice - closedMallPrice) / listPrice) * 100));
}

function profileFor(product: Product, content?: StorefrontContent): MallProductProfile {
  return (
    content?.productProfiles.find((profile) => profile.productId === product.id) ?? {
      productId: product.id,
      brand: product.brand ?? "A5 Partner",
      displayName: product.name,
      subtitle: product.subtitle ?? "폐쇄몰 전용 모의 상품",
      category: product.category,
      imageUrl: product.imageUrl ?? "/file.svg",
      gallery: product.gallery ?? [product.imageUrl ?? "/file.svg"],
      badges: product.badges ?? ["모의 상품"],
      tags: product.tags ?? [product.category],
      review: product.reviewSummary ?? { rating: 4.5, count: 12, highlight: "모의 후기 준비 중" },
      detailTabs: product.detailSections ?? [
        { title: "상품 상세", body: "상세페이지 본문 영역을 예약한 모의 상품입니다." },
        { title: "배송/수령", body: "실제 배송조회나 현장수령 처리는 연결하지 않습니다." },
        { title: "교환/반품", body: "운영 환불/PG 취소 정책 승인 전까지 안내만 표시합니다." },
      ],
    }
  );
}

function stockLabel(stock: number) {
  if (stock <= 0) return { label: "품절", className: "bg-slate-900 text-white" };
  if (stock <= 5) return { label: "재고 임박", className: "bg-red-100 text-red-700" };
  if (stock <= 10) return { label: "소량 남음", className: "bg-amber-100 text-amber-900" };
  return { label: "재고 여유", className: "bg-emerald-100 text-emerald-800" };
}

function fulfillmentLabel(product: Product, content?: StorefrontContent) {
  if (product.fulfillment?.delivery && !product.fulfillment.pickup) return "택배배송";
  if (!product.fulfillment?.delivery && product.fulfillment?.pickup) return "현장수령";
  if (["식품", "외출"].includes(profileFor(product, content).category)) return "택배배송";
  return "현장수령/택배";
}

function HeaderContextBadges({ context }: { context: StoreContext }) {
  const { session, nursery, room } = context;
  const badges = [
    `조리원 ${nursery?.name ?? session.nurseryId} · ${room?.name ?? session.roomId}`,
    `QR ${session.shortCode} · 만료 ${formatDateTime(session.expiresAt)}`,
    "장바구니 연결",
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span key={badge} className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-950 ring-1 ring-slate-200">
          {badge}
        </span>
      ))}
    </div>
  );
}

function DataSourceBadge({ source, reason }: { source: ProductReadSource; reason?: string }) {
  const isFirebase = source === "Firebase 상품";

  return (
    <div className="grid justify-items-start gap-1 md:justify-items-end">
      <span className={`rounded-full px-3 py-1 text-xs font-black ${isFirebase ? "bg-emerald-300 text-slate-950" : "bg-amber-300 text-slate-950"}`}>
        {source}
      </span>
      {reason ? <span className="max-w-xs text-left text-[11px] font-bold leading-4 text-slate-300 md:text-right">{reason}</span> : null}
    </div>
  );
}

function productDevRows(product: Product, source: ProductReadSource) {
  return [
    ["상품 ID", product.id],
    ["상태", product.firebaseStatus ?? product.status],
    ["데이터 출처", source === "Firebase 상품" ? product.source ?? "firestore" : "mockProducts"],
    ["시드 시각", product.seededAt ?? (source === "Firebase 상품" ? "미제공" : "모의 시드")],
  ];
}

function ProductDevPanel({
  product,
  source,
  reason,
  compact = false,
}: {
  product: Product;
  source: ProductReadSource;
  reason?: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-md border border-white/35 bg-white/70 text-[11px] font-bold text-slate-500 shadow-sm backdrop-blur-md ${compact ? "p-2" : "p-3"}`}>
      <div className="grid gap-1">
        {productDevRows(product, source).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <span className="uppercase tracking-[0.08em]">{label}</span>
            <span className="max-w-[62%] truncate text-right text-slate-700">{value}</span>
          </div>
        ))}
      </div>
      {reason ? <p className="mt-2 border-t border-slate-200 pt-2 leading-4 text-amber-700">읽기 참고: {reason}</p> : null}
    </div>
  );
}

function FirestoreReadDiagnostic({ source, reason }: { source: ProductReadSource; reason?: string }) {
  const requestedSource = requestedDataSource();

  return (
    <section className="rounded-md border border-white/30 bg-white/75 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">개발자 읽기 진단</p>
          <h2 className="mt-1 text-xl font-black">파이어스토어 상품 읽기 상태</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            /products, /tablet/products, /tablet/products/[id]는 Firestore 상품을 먼저 읽고, 실패하면 안전하게 모의 상품으로 대체합니다.
          </p>
        </div>
        <DataSourceBadge source={source} reason={reason} />
      </div>
      <div className="mt-4 rounded-md bg-white/55 p-3 text-xs font-bold text-slate-600 ring-1 ring-white/40">
        <p className="mb-1">데이터 소스 환경값: {requestedSource || "미설정"}</p>
        {reason ? <p>마지막 대체 표시 사유: {reason}</p> : <p>이번 렌더링에서 파이어스토어 읽기 실패가 감지되지 않았습니다.</p>}
      </div>
    </section>
  );
}

function StoreShell({
  title,
  subtitle,
  context,
  dataSource = "모의 대체 데이터",
  dataSourceNote,
  children,
}: {
  title: string;
  subtitle: string;
  context: StoreContext;
  dataSource?: ProductReadSource;
  dataSourceNote?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <TabletFirstLoginGate />
      <header className="sticky top-0 z-20 border-b border-white/20 bg-white/65 text-slate-950 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/55">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/tablet/products" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-lg font-black text-white">H</span>
            <span>
              <span className="block text-base font-black tracking-[0.18em]">HANSANYEON</span>
              <span className="block text-[11px] font-bold text-rose-600">전용 멤버십 폐쇄몰</span>
            </span>
          </Link>
          <nav className="hidden flex-wrap gap-2 md:flex">
            {tabletNav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 text-sm font-bold hover:bg-slate-100">
                {item.label}
              </Link>
            ))}
            <CartStatusBadge />
          </nav>
          <TabletContextBadge />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <section className="mb-5 overflow-hidden rounded-md border border-white/25 bg-white/70 text-slate-950 shadow-[0_18px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="bg-slate-950/85 px-4 py-4 text-white backdrop-blur-md md:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">폐쇄몰 태블릿</p>
                <h1 className="mt-2 text-3xl font-black md:text-5xl">{title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{subtitle}</p>
              </div>
              <div className="grid gap-3">
                <HeaderContextBadges context={context} />
                <DataSourceBadge source={dataSource} reason={dataSourceNote} />
              </div>
            </div>
          </div>
        </section>

        {children}
        <div className="mt-8">
          <FirestoreReadDiagnostic source={dataSource} reason={dataSourceNote} />
        </div>
      </div>
    </main>
  );
}

function HeroBanner({ content }: { content: StorefrontContent }) {
  const { heroBanner } = content;

  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-black">
      <Link href={heroBanner.href} className="block">
        <div className="relative min-h-[420px]">
          <img src={heroBanner.imageUrl} alt={heroBanner.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="relative flex min-h-[420px] flex-col justify-end p-5 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">{heroBanner.eyebrow}</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-6xl">{heroBanner.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{heroBanner.subtitle}</p>
          </div>
        </div>
      </Link>
    </section>
  );
}

function PromoBannerGrid({ content }: { content: StorefrontContent }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {content.promoBanners.map((banner) => (
        <Link key={banner.id} href={banner.href} className="group overflow-hidden rounded-md border border-white/15 bg-white/20 backdrop-blur-md">
          <div className="relative min-h-40">
            <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]" />
            <div className="absolute inset-0 bg-black/15" />
            <div className="relative p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em]">{banner.eyebrow}</p>
              <h3 className="mt-3 text-3xl font-black">{banner.title}</h3>
              <p className="mt-2 text-sm font-semibold">{banner.subtitle}</p>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}

function VideoAdStrip() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <article className="overflow-hidden rounded-md border border-white/25 bg-white/80 text-slate-950 shadow-sm backdrop-blur-xl">
        <div className="grid gap-0 md:grid-cols-[1fr_280px]">
          <div className="grid aspect-video place-items-center bg-slate-950 text-center text-white">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">영상/GIF 광고 영역</p>
              <h2 className="mt-2 text-3xl font-black">산모케어 브랜드 영상</h2>
              <p className="mt-2 text-sm text-slate-300">Storage 연결 전까지 모의 소재만 표시</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-xs font-black text-rose-600">광고 승인대기</p>
            <h3 className="mt-2 text-2xl font-black">태블릿 홈 영상 슬롯</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              최고관리자에서 노출 기간, 대상 조리원, 클릭 링크를 검수하고 기업 관리자가 소재를 제출하는 구조를 예약했습니다.
            </p>
            <Link href="/admin/marketing/videos" className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
              영상 관리 모의 화면
            </Link>
          </div>
        </div>
      </article>
      <article className="rounded-md border border-white/10 bg-gradient-to-br from-rose-100 to-amber-100 p-5 text-slate-950">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">폐쇄몰 안내</p>
        <h3 className="mt-2 text-3xl font-black">조리원 객실 전용 특가</h3>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          QR은 객실과 태블릿 출처를 기록하고, 고객은 비회원 모바일 결제 화면으로 이동합니다. 현재는 PG 모의 상태입니다.
        </p>
      </article>
    </section>
  );
}

function BrandGrid({ content }: { content: StorefrontContent }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">공식 입점 브랜드</p>
          <h2 className="mt-2 text-2xl font-black">브랜드관</h2>
        </div>
        <Link href="/admin/brands" className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-950 shadow-sm backdrop-blur-md">
          브랜드 관리 모의 화면
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {content.brands.map((brand) => (
          <article key={brand.id} className="rounded-md bg-white/80 p-3 text-center text-slate-950 shadow-sm backdrop-blur-md">
            <div className="flex h-16 items-center justify-center">
              <img src={brand.logoUrl} alt={brand.name} className="max-h-12 max-w-full object-contain" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">{brand.category}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CatalogControls({ content }: { content: StorefrontContent }) {
  return (
    <section className="rounded-md border border-white/30 bg-white/75 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
      <div className="grid gap-3 lg:grid-cols-[1fr_150px_150px_150px_150px_150px]">
        <label className="grid gap-1 text-sm font-bold">
          상품 검색
          <input readOnly value="수딩, 산모, 베이비" className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600" />
        </label>
        {[
          ["카테고리", "전체"],
          ["브랜드", "전체"],
          ["가격대", "10만원 이하"],
          ["재고", "품절 제외"],
          ["정렬", "할인율 높은순"],
        ].map(([label, value]) => (
          <label key={label} className="grid gap-1 text-sm font-bold">
            {label}
            <select disabled value={value} className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
              <option value={value}>{value}</option>
            </select>
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {content.categories.map((category) => (
          <span key={category.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
            {category.label} · {category.helper}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">검색/필터/정렬은 화면 모의 기능입니다. 실제 인덱스, Firestore query, 외부 재고 API는 연결하지 않습니다.</p>
    </section>
  );
}

function ProductCard({ product, source, content }: { product: Product; source?: ProductReadSource; content?: StorefrontContent }) {
  const profile = profileFor(product, content);
  const stock = stockLabel(product.stock);
  const rate = discountRate(product);
  const readSource = source ?? (product.source ? "Firebase 상품" : "모의 대체 데이터");

  return (
    <Link href={`/tablet/products/${product.id}`} className="group overflow-hidden rounded-md bg-white/88 text-slate-950 shadow-sm ring-1 ring-white/25 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/95 hover:shadow-2xl">
      <div className="relative aspect-[4/5] bg-slate-100">
        <img src={profile.imageUrl} alt={profile.displayName} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        <span className="absolute left-3 top-3 rounded-md bg-rose-600 px-2 py-1 text-xs font-black text-white">{rate}%</span>
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <p className="text-xs font-black text-rose-600">{profile.brand}</p>
          <h3 className="mt-1 min-h-12 text-base font-black leading-6">{profile.displayName}</h3>
          <p className="mt-1 text-xs text-slate-500">{profile.subtitle}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 line-through">정상가 {formatCurrency(product.comparison.listPrice)}</p>
          <p className="mt-1 text-2xl font-black text-rose-600">{formatCurrency(product.comparison.closedMallPrice)}</p>
          <p className="text-xs font-bold text-slate-500">최저가 대비 {formatCurrency(product.comparison.platformLowestPrice - product.comparison.closedMallPrice)} 절감 모의 표시</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{fulfillmentLabel(product, content)}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${stock.className}`}>{stock.label}</span>
        </div>
        <button className="rounded-md border border-rose-500 px-3 py-2 text-sm font-black text-rose-600">AI 분석</button>
        <ProductDevPanel product={product} source={readSource} compact />
      </div>
    </Link>
  );
}

function ProductRail({
  title,
  eyebrow,
  products,
  source,
  content,
}: {
  title: string;
  eyebrow: string;
  products: Product[];
  source?: ProductReadSource;
  content?: StorefrontContent;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-black">{title}</h2>
        </div>
        <Link href="/tablet/products" className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white ring-1 ring-white/20">
          전체 보기
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={`${title}-${product.id}`} product={product} source={source} content={content} />
        ))}
      </div>
    </section>
  );
}

function ProductGallery({ product, content }: { product: Product; content?: StorefrontContent }) {
  const profile = profileFor(product, content);
  const images = profile.gallery.length ? profile.gallery : [profile.imageUrl];

  return (
    <section className="grid gap-3">
      <div className="overflow-hidden rounded-md bg-white/80 shadow-sm backdrop-blur-md">
        <img src={images[0]} alt={profile.displayName} className="aspect-square w-full object-cover" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {images.slice(0, 3).map((image, index) => (
          <div key={`${image}-${index}`} className="overflow-hidden rounded-md bg-white/80 shadow-sm backdrop-blur-md">
            <img src={image} alt={`${profile.displayName} ${index + 1}`} className="aspect-square w-full object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PriceComparePanel({ product }: { product: Product }) {
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">가격 비교 레이어</p>
          <h3 className="mt-1 text-xl font-black">실제 AI가 아닌 가격 비교 모의 레이어</h3>
        </div>
        <span className="rounded-full bg-white/85 px-3 py-1 text-sm font-black text-emerald-900 shadow-sm backdrop-blur-md">{discountRate(product)}% 절감</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        {[
          ["정상가", product.comparison.listPrice],
          ["플랫폼 최저가", product.comparison.platformLowestPrice],
          ["폐쇄몰가", product.comparison.closedMallPrice],
        ].map(([label, value]) => (
          <div key={label} className={`flex justify-between rounded-md px-3 py-2 ${label === "폐쇄몰가" ? "bg-slate-950 text-white" : "bg-white/75 text-slate-950 backdrop-blur-md"}`}>
            <span>{label}</span>
            <strong>{formatCurrency(Number(value))}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailTabs({ product, content }: { product: Product; content?: StorefrontContent }) {
  const profile = profileFor(product, content);

  return (
    <section className="rounded-md bg-white/80 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
      <div className="grid gap-3 md:grid-cols-3">
        {profile.detailTabs.map((tab) => (
          <article key={tab.title} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-black">{tab.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{tab.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CartLine({ item, content }: { item: CartItemSnapshot; content?: StorefrontContent }) {
  const profile = content?.productProfiles.find((profile) => profile.productId === item.productId);
  const displayName = profile?.displayName ?? item.productName;

  return (
    <article className="rounded-md bg-white/82 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
      <div className="grid gap-4 sm:grid-cols-[96px_1fr_auto]">
        <div className="overflow-hidden rounded-md bg-slate-100">
          {profile ? <img src={profile.imageUrl} alt={displayName} className="aspect-square w-full object-cover" /> : null}
        </div>
        <div>
          <p className="text-xs font-black text-rose-600">{profile?.brand ?? item.companyId}</p>
          <h3 className="mt-1 text-lg font-black">{displayName}</h3>
          <p className="mt-1 text-sm text-slate-600">옵션: {item.optionName}</p>
          <div className="mt-3 inline-flex items-center gap-3 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
            <span>-</span>
            <span>{item.quantity}</span>
            <span>+</span>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm text-slate-500">{formatCurrency(item.unitPrice)} / 개</p>
          <p className="mt-1 text-xl font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
        </div>
      </div>
    </article>
  );
}

function SummaryPanel({ session, ask = false }: { session: QrPaymentSession; ask?: boolean }) {
  return (
    <aside className="rounded-md bg-white/82 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
      <h2 className="text-xl font-black">주문 요약</h2>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex justify-between"><span>상품 수량</span><strong>{session.items.reduce((total, item) => total + item.quantity, 0)}개</strong></div>
        <div className="flex justify-between"><span>수령방식</span><strong>{session.deliveryMethod === "pickup" ? "현장수령" : "택배배송"}</strong></div>
        <div className="flex justify-between"><span>QR 만료</span><strong>{formatDateTime(session.expiresAt)}</strong></div>
        <div className="border-t border-slate-100 pt-3">
          <div className="flex justify-between text-lg"><span className="font-black">합계</span><strong className="text-rose-600">{formatCurrency(session.totalAmount)}</strong></div>
        </div>
      </div>
      <Link href={ask ? `/q/${session.shortCode}` : "/tablet/qr"} className="mt-5 block rounded-md bg-rose-600 px-4 py-3 text-center text-sm font-black text-white">
        {ask ? "조르기 QR 열기" : "구매 QR 생성"}
      </Link>
      <p className="mt-3 text-xs leading-5 text-slate-500">QR은 2~3시간 만료, 1회성 사용, 재사용 차단 전제로 표시됩니다. 실제 PG 요청은 없습니다.</p>
    </aside>
  );
}

export async function TabletHomePage() {
  return <TabletProductsPage />;
}

export async function TabletProductsPage() {
  const context = await getContext();
  const { products, source, reason } = await getApprovedProductsWithSource();

  return (
    <StoreShell
      title="폐쇄몰 쇼핑 홈"
      subtitle="mommy-a5 배포 쇼핑몰 느낌에 맞춰 배너, 브랜드, 상품 카드, 검색/필터/정렬을 모의 기능으로 배치했습니다."
      context={context}
      dataSource={source}
      dataSourceNote={reason}
    >
      <div className="grid gap-8">
        <HeroBanner content={context.content} />
        <PromoBannerGrid content={context.content} />
        <VideoAdStrip />
        <BrandGrid content={context.content} />
        <CatalogControls content={context.content} />
        <ProductRail title="베이비 베스트 핫딜" eyebrow="베이비 특가" products={products.slice(0, 4)} />
        <ProductRail title="산모 회복 케어" eyebrow="산모 케어 특가" products={products.filter((product) => profileFor(product).category.includes("산모")).slice(0, 4)} />
        <ProductRail title="신상품/기획전" eyebrow="신상품과 기획전" products={products.slice(-4)} />
        <div className="rounded-md border border-white/30 bg-white/78 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">장바구니 바로가기</p>
              <h2 className="mt-1 text-xl font-black">선택한 상품은 장바구니에서 QR로 전환됩니다.</h2>
            </div>
            <Link href="/tablet/cart" className="rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white">장바구니 보기</Link>
          </div>
        </div>
      </div>
    </StoreShell>
  );
}

export async function TabletProductDetailPage({ productId }: { productId: string }) {
  const context = await getContext();
  const { product, source, reason } = await getProductWithSource(productId);
  const options = await getProductOptionsWithFallback(product.id);
  const profile = profileFor(product);

  return (
    <StoreShell title={profile.displayName} subtitle={profile.subtitle} context={context} dataSource={source} dataSourceNote={reason}>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ProductGallery product={product} />
        <section className="grid gap-4">
          <div className="rounded-md bg-white/82 p-5 text-slate-950 shadow-sm backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {profile.badges.map((badge) => (
                  <span key={badge} className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-700">{badge}</span>
                ))}
              </div>
              <StatusBadge status={product.status} />
            </div>
            <p className="mt-5 text-sm font-black text-rose-600">{profile.brand}</p>
            <h2 className="mt-2 text-4xl font-black">{profile.displayName}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{profile.subtitle}</p>
            <div className="mt-5">
              <p className="text-sm text-slate-400 line-through">정상가 {formatCurrency(product.comparison.listPrice)}</p>
              <p className="mt-1 text-5xl font-black text-rose-600">{formatCurrency(product.comparison.closedMallPrice)}</p>
              <p className="mt-2 text-sm font-bold text-emerald-700">{discountRate(product)}% 할인 · {fulfillmentLabel(product)} · {stockLabel(product.stock).label}</p>
            </div>
            <div className="mt-5 rounded-md bg-slate-50 p-4">
              <p className="text-sm font-black">리뷰 요약</p>
              <p className="mt-1 text-sm text-slate-600">{profile.review.rating.toFixed(1)}점 / {profile.review.count}개 모의 후기 · {profile.review.highlight}</p>
            </div>
          </div>

          <PriceComparePanel product={product} />
          <AddToCartPanel product={product} options={options} />
          <ProductDevPanel product={product} source={source} reason={reason} />
        </section>
      </div>
      <div className="mt-6">
        <DetailTabs product={product} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/40 bg-white/85 p-3 text-slate-950 shadow-2xl backdrop-blur-xl md:hidden">
        <Link href="/tablet/cart" className="block rounded-md bg-rose-600 px-4 py-3 text-center text-sm font-black text-white">장바구니 담고 QR 생성</Link>
      </div>
    </StoreShell>
  );
}

export async function TabletCartPage() {
  const context = await getContext();
  const { session } = context;

  return (
    <StoreShell title="장바구니" subtitle="수량, 옵션, 수령방식, 합계금액, QR 생성 버튼을 쇼핑몰 흐름처럼 정리했습니다." context={context}>
      <LiveCartPage fallbackItems={session.items} />
    </StoreShell>
  );
}

export async function TabletQrPage() {
  const context = await getContext();
  const { session } = context;

  return (
    <StoreShell title="구매 QR 생성" subtitle="고객 또는 보호자가 모바일에서 결제 진입 화면으로 넘어가는 QR 모의 흐름입니다." context={context}>
      <LiveQrSessionPanel fallbackSession={session} />
      <div className="hidden">
        <section className="rounded-md bg-white/82 p-6 text-center text-slate-950 shadow-sm backdrop-blur-xl">
          <div className="mx-auto grid h-72 w-72 place-items-center rounded-md border-[14px] border-slate-950 bg-slate-100">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">QR 코드</p>
              <p className="mt-2 text-4xl font-black">{session.shortCode}</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold text-rose-600">만료 {formatDateTime(session.expiresAt)}</p>
          <Link href={`/q/${session.shortCode}`} className="mt-4 inline-flex rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white">고객 모바일 화면 열기</Link>
        </section>
        <section className="grid gap-3">
          {session.items.map((item) => (
            <CartLine key={`${item.productId}-${item.optionName}`} item={item} />
          ))}
          <div className="rounded-md bg-white/82 p-4 text-slate-950 shadow-sm backdrop-blur-xl">
            <div className="flex justify-between text-lg">
              <span className="font-black">결제 예정</span>
              <strong className="text-rose-600">{formatCurrency(session.totalAmount)}</strong>
            </div>
            <p className="mt-2 text-sm text-slate-600">실제 PG 승인, Firebase write, 알림톡 발송은 실행하지 않습니다.</p>
          </div>
        </section>
      </div>
    </StoreShell>
  );
}

export async function TabletAskPage() {
  const context = await getContext("ASKMOM88");

  return (
    <StoreShell title="조르기 QR" subtitle="보호자에게 전달하는 결제 요청 QR 모의 흐름입니다. 회원가입 없이 QR 랜딩으로 진입합니다." context={context}>
      <div className="mx-auto max-w-4xl">
        <SummaryPanel session={context.session} ask />
      </div>
    </StoreShell>
  );
}
