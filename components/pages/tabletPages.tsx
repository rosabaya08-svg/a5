import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockNurseries } from "@/data/mockNurseries";
import { mockRooms } from "@/data/mockRooms";
import { mockRepositories } from "@/lib/repositories/mock";
import { repositoryData } from "@/lib/repositories/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { CartItemSnapshot, Nursery, Product, QrPaymentSession, Room } from "@/types/commerce";

const tabletNav = [
  { href: "/tablet/products", label: "홈" },
  { href: "/tablet/cart", label: "장바구니" },
  { href: "/tablet/qr", label: "구매 QR" },
  { href: "/tablet/ask", label: "조르기" },
];

const toneClasses: Record<Product["thumbnailTone"], string> = {
  sage: "bg-emerald-100 text-emerald-950",
  rose: "bg-rose-100 text-rose-950",
  sky: "bg-sky-100 text-sky-950",
  gold: "bg-amber-100 text-amber-950",
  ink: "bg-slate-200 text-slate-950",
};

function discountRate(product: Product) {
  const { listPrice, closedMallPrice } = product.comparison;
  return Math.round(((listPrice - closedMallPrice) / listPrice) * 100);
}

function stockLabel(stock: number) {
  if (stock <= 5) return "품절 임박";
  if (stock <= 10) return "소량 남음";
  return "재고 여유";
}

function fulfillmentLabel(product: Product) {
  if (product.category === "식품") return "택배배송";
  if (product.category === "외출") return "택배배송";
  return "현장수령/택배";
}

type StoreContext = {
  session: QrPaymentSession;
  nursery?: Nursery;
  room?: Room;
};

async function getContext(shortCode = "SANHO701"): Promise<StoreContext> {
  const session = repositoryData(
    await mockRepositories.qrSessions.getQrSessionByShortCode(shortCode),
  );
  const nursery = mockNurseries.find((item) => item.id === session.nurseryId);
  const room = mockRooms.find((item) => item.id === session.roomId);

  return { session, nursery, room };
}

function StoreShell({
  title,
  subtitle,
  context,
  children,
}: {
  title: string;
  subtitle: string;
  context: StoreContext;
  children: React.ReactNode;
}) {
  const { session, nursery, room } = context;

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-slate-950">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-4 md:px-6">
        <header className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="bg-slate-950 px-4 py-3 text-white md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">SANHO CLOSED MALL</p>
                <h1 className="mt-1 text-2xl font-black md:text-4xl">{title}</h1>
              </div>
              <nav className="flex flex-wrap gap-2">
                {tabletNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-950"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{subtitle}</p>
          </div>

          <div className="grid gap-3 bg-white p-4 md:grid-cols-3 md:p-5">
            <div className="rounded-md bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-800">조리원/객실</p>
              <p className="mt-1 font-bold">{nursery?.name ?? session.nurseryId}</p>
              <p className="text-sm text-slate-600">{room?.name ?? session.roomId}</p>
            </div>
            <div className="rounded-md bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">QR 세션</p>
              <p className="mt-1 font-bold">{session.shortCode}</p>
              <p className="text-sm text-slate-600">만료 {formatDateTime(session.expiresAt)}</p>
            </div>
            <div className="rounded-md bg-rose-50 p-3">
              <p className="text-xs font-semibold text-rose-900">폐쇄몰 혜택</p>
              <p className="mt-1 font-bold">정상가 대비 할인 mock</p>
              <p className="text-sm text-slate-600">실제 AI 분석이 아닌 가격 비교 표시</p>
            </div>
          </div>
        </header>

        <section className="py-5">{children}</section>
      </div>
    </main>
  );
}

function PromoBand() {
  return (
    <section className="mb-4 grid gap-3 md:grid-cols-[1.4fr_0.6fr]">
      <div className="rounded-md bg-[#2f4b3f] p-5 text-white">
        <p className="text-sm font-semibold">조리원 객실 전용 핫딜</p>
        <h2 className="mt-2 text-3xl font-black">오늘의 폐쇄몰 특가</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
          객실 태블릿에서 장바구니를 만들고 QR로 결제자에게 전달하는 mock 쇼핑 흐름입니다.
        </p>
      </div>
      <div className="rounded-md bg-white p-5">
        <p className="text-sm font-semibold text-slate-500">안전 상태</p>
        <p className="mt-2 text-2xl font-black text-slate-950">Mock only</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Firebase/PG/외부 API 호출 없음</p>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const rate = discountRate(product);

  return (
    <Link
      href={`/tablet/products/${product.id}`}
      className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className={`flex h-36 items-center justify-center px-5 text-center ${toneClasses[product.thumbnailTone]}`}>
        <div>
          <p className="text-sm font-bold">{product.category}</p>
          <p className="mt-2 text-2xl font-black">{rate}%</p>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-black leading-6">{product.name}</h3>
          <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">
            {rate}% OFF
          </span>
        </div>
        <div className="grid gap-1">
          <p className="text-sm text-slate-400 line-through">
            정상가 {formatCurrency(product.comparison.listPrice)}
          </p>
          <p className="text-2xl font-black text-red-600">
            폐쇄몰가 {formatCurrency(product.price)}
          </p>
          <p className="text-sm text-slate-600">
            최저가 대비 {formatCurrency(product.comparison.platformLowestPrice - product.price)} 절감 mock
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{fulfillmentLabel(product)}</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
            {stockLabel(product.stock)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PriceComparePanel({ product }: { product: Product }) {
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-emerald-800">가격비교/AI분석 mock</p>
          <h3 className="mt-1 text-xl font-black">실제 AI가 아닌 가격 비교 레이어</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-900">
          {discountRate(product)}% 절감
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between rounded-md bg-white px-3 py-2">
          <span>정상가</span>
          <strong>{formatCurrency(product.comparison.listPrice)}</strong>
        </div>
        <div className="flex justify-between rounded-md bg-white px-3 py-2">
          <span>플랫폼 최저가</span>
          <strong>{formatCurrency(product.comparison.platformLowestPrice)}</strong>
        </div>
        <div className="flex justify-between rounded-md bg-slate-950 px-3 py-2 text-white">
          <span>폐쇄몰가</span>
          <strong>{formatCurrency(product.price)}</strong>
        </div>
      </div>
    </section>
  );
}

function CartLine({ item }: { item: CartItemSnapshot }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black">{item.productName}</h3>
          <p className="mt-1 text-sm text-slate-600">옵션: {item.optionName}</p>
          <div className="mt-3 inline-flex items-center gap-3 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
            <span>수량</span>
            <span>{item.quantity}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">{formatCurrency(item.unitPrice)} / 개</p>
          <p className="mt-1 text-xl font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
        </div>
      </div>
    </article>
  );
}

export async function TabletHomePage() {
  return <TabletProductsPage />;
}

export async function TabletProductsPage() {
  const context = await getContext();
  const products = repositoryData(await mockRepositories.products.listApprovedProducts());

  return (
    <StoreShell
      title="맘 전용 폐쇄몰"
      subtitle="조리원 객실 태블릿에서만 열리는 상품 목록입니다. 모든 가격과 재고는 mock 데이터입니다."
      context={context}
    >
      <PromoBand />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">추천 상품</h2>
          <p className="mt-1 text-sm text-slate-600">정상가, 폐쇄몰가, 할인율, 수령 가능 여부를 함께 확인합니다.</p>
        </div>
        <Link href="/tablet/cart" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          장바구니 보기
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </StoreShell>
  );
}

export async function TabletProductDetailPage({ productId }: { productId: string }) {
  const context = await getContext();
  const product = repositoryData(await mockRepositories.products.getProductById(productId));
  const options = repositoryData(await mockRepositories.products.listProductOptions(product.id));

  return (
    <StoreShell
      title={product.name}
      subtitle="상품 상세와 가격 비교, 옵션, 수령 방식을 확인합니다."
      context={context}
    >
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className={`flex min-h-96 items-center justify-center rounded-md p-8 text-center ${toneClasses[product.thumbnailTone]}`}>
          <div>
            <p className="text-base font-bold">{product.category}</p>
            <h2 className="mt-2 text-4xl font-black">{discountRate(product)}% OFF</h2>
            <p className="mt-3 text-sm font-semibold">{fulfillmentLabel(product)}</p>
          </div>
        </div>

        <section className="grid gap-4">
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge status={product.status} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
                {stockLabel(product.stock)}
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-black">{product.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              조리원 객실 태블릿 전용 가격으로 표시됩니다. 실제 저장/결제 없이 mock 장바구니로 이동합니다.
            </p>
            <div className="mt-5">
              <p className="text-sm text-slate-400 line-through">
                정상가 {formatCurrency(product.comparison.listPrice)}
              </p>
              <p className="mt-1 text-4xl font-black text-red-600">{formatCurrency(product.price)}</p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                플랫폼 최저가 대비 {formatCurrency(product.comparison.platformLowestPrice - product.price)} 절감 mock
              </p>
            </div>
          </div>

          <PriceComparePanel product={product} />

          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h3 className="font-black">옵션 선택 mock</h3>
            <div className="mt-3 grid gap-2">
              {options.length ? (
                options.map((option) => (
                  <div key={option.id} className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span>{option.name}</span>
                    <span>{formatCurrency(product.price + option.priceDelta)} / 재고 {option.stock}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">기본 옵션 / 재고 {product.stock}</div>
              )}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link href="/tablet/cart" className="rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
                장바구니 담기
              </Link>
              <Link href="/tablet/qr" className="rounded-md bg-red-600 px-4 py-3 text-center text-sm font-black text-white">
                QR 결제 만들기
              </Link>
            </div>
          </div>
        </section>
      </div>
    </StoreShell>
  );
}

export async function TabletCartPage() {
  const context = await getContext();
  const { session } = context;

  return (
    <StoreShell
      title="장바구니"
      subtitle="옵션, 수량, 수령방식, 합계금액을 확인하고 QR을 생성합니다."
      context={context}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <section className="grid gap-3">
          {session.items.map((item) => (
            <CartLine key={`${item.productId}-${item.optionName}`} item={item} />
          ))}
        </section>

        <aside className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">주문 요약</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between">
              <span>상품 수</span>
              <strong>{session.items.reduce((total, item) => total + item.quantity, 0)}개</strong>
            </div>
            <div className="flex justify-between">
              <span>수령방식</span>
              <strong>{session.deliveryMethod === "pickup" ? "현장수령" : "택배배송"}</strong>
            </div>
            <div className="flex justify-between">
              <span>QR 만료</span>
              <strong>{formatDateTime(session.expiresAt)}</strong>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between text-lg">
                <span className="font-black">합계</span>
                <strong className="text-red-600">{formatCurrency(session.totalAmount)}</strong>
              </div>
            </div>
          </div>
          <Link href="/tablet/qr" className="mt-5 block rounded-md bg-red-600 px-4 py-3 text-center text-sm font-black text-white">
            구매 QR 생성
          </Link>
          <Link href="/tablet/ask" className="mt-2 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
            조르기 QR 생성
          </Link>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            QR은 2~3시간 만료, 1회성 사용, 재사용 차단 전제로 표시됩니다.
          </p>
        </aside>
      </div>
    </StoreShell>
  );
}

export async function TabletQrPage() {
  const context = await getContext();
  const { session } = context;

  return (
    <StoreShell
      title="구매 QR"
      subtitle="고객 또는 보호자가 모바일로 스캔하는 결제 진입 QR입니다."
      context={context}
    >
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[420px_1fr]">
        <section className="rounded-md border border-slate-200 bg-white p-6 text-center">
          <div className="mx-auto flex h-72 w-72 items-center justify-center rounded-md border-8 border-slate-950 bg-slate-100">
            <span className="text-3xl font-black">{session.shortCode}</span>
          </div>
          <p className="mt-4 text-sm font-bold text-red-600">만료 {formatDateTime(session.expiresAt)}</p>
          <Link href={`/q/${session.shortCode}`} className="mt-4 inline-flex rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white">
            고객 모바일 화면 열기
          </Link>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">QR 주문 요약</h2>
          <div className="mt-4 grid gap-3">
            {session.items.map((item) => (
              <CartLine key={`${item.productId}-${item.optionName}`} item={item} />
            ))}
          </div>
          <div className="mt-4 flex justify-between rounded-md bg-red-50 px-4 py-3">
            <span className="font-black">결제 예정 mock</span>
            <strong className="text-red-600">{formatCurrency(session.totalAmount)}</strong>
          </div>
        </section>
      </div>
    </StoreShell>
  );
}

export async function TabletAskPage() {
  const context = await getContext("ASKMOM88");
  const { session } = context;

  return (
    <StoreShell
      title="조르기 QR"
      subtitle="보호자에게 공유하는 제3자 결제용 mock 링크입니다."
      context={context}
    >
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[360px_1fr]">
        <section className="rounded-md border border-amber-200 bg-white p-5 text-center">
          <div className="flex h-60 items-center justify-center rounded-md border-8 border-amber-400 bg-amber-50">
            <span className="text-2xl font-black">{session.shortCode}</span>
          </div>
          <Link href={`/q/${session.shortCode}`} className="mt-4 inline-flex rounded-md bg-amber-500 px-5 py-3 text-sm font-black">
            조르기 링크 열기
          </Link>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">공유 결제 안내</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            조르기 수신자는 회원가입 없이 QR 랜딩에 진입합니다. 실제 운영 전에는 만료, 1회성 사용, 출처 저장,
            서버 금액 재계산이 필수입니다.
          </p>
          <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-900">
            실제 PG 호출 없이 mock 화면만 제공합니다.
          </div>
        </section>
      </div>
    </StoreShell>
  );
}
