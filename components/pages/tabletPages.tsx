import Link from "next/link";
import { ConfirmBox } from "@/components/ui/ConfirmBox";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { Product } from "@/types/commerce";

const tabletNav = [
  { href: "/tablet/products", label: "상품" },
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

function TabletFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-5">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
              TABLET_DEVICE / mock
            </p>
            <h1 className="mt-1 text-3xl font-bold">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{subtitle}</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {tabletNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <section className="flex-1 py-6">{children}</section>
      </div>
    </main>
  );
}

function ProductTile({ product }: { product: Product }) {
  const discount = product.comparison.platformLowestPrice - product.comparison.closedMallPrice;

  return (
    <Link
      href={`/tablet/products/${product.id}`}
      className="grid min-h-72 overflow-hidden rounded-md bg-white text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className={`flex h-28 items-center justify-center px-4 text-center ${toneClasses[product.thumbnailTone]}`}>
        <span className="text-lg font-bold">{product.category}</span>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold leading-6">{product.name}</h2>
          <StatusBadge status={product.status} />
        </div>
        <p className="text-sm text-slate-600">플랫폼 최저가 대비 {formatCurrency(discount)} 절감 mock</p>
        <div>
          <p className="text-2xl font-bold">{formatCurrency(product.price)}</p>
          <p className="text-xs text-slate-500">재고 {product.stock}개</p>
        </div>
      </div>
    </Link>
  );
}

export function TabletHomePage() {
  return <TabletProductsPage />;
}

export function TabletProductsPage() {
  const products = mockApi.products().filter((product) => product.status === "approved");

  return (
    <TabletFrame
      title="객실 태블릿 폐쇄몰"
      subtitle="인증된 객실 태블릿에서만 상품을 탐색하고 장바구니 이후 QR을 생성하는 mock 화면입니다."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductTile key={product.id} product={product} />
        ))}
      </div>
    </TabletFrame>
  );
}

export function TabletProductDetailPage({ productId }: { productId: string }) {
  const product = mockApi.findProduct(productId);
  const options = mockApi.productOptions().filter((option) => option.productId === product.id);

  return (
    <TabletFrame title={product.name} subtitle="상품 snapshot은 주문 생성 시 보존되어야 합니다.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className={`flex min-h-96 items-center justify-center rounded-md p-8 text-center ${toneClasses[product.thumbnailTone]}`}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em]">Mock visual</p>
            <h2 className="mt-3 text-3xl font-bold">{product.category}</h2>
          </div>
        </div>
        <section className="rounded-md bg-white p-5 text-slate-950">
          <StatusBadge status={product.status} />
          <h2 className="mt-4 text-3xl font-bold">{product.name}</h2>
          <p className="mt-3 text-slate-600">
            가격비교/AI분석은 실제 AI가 아니라 원가, 플랫폼 최저가, 폐쇄몰가 비교값입니다.
          </p>
          <div className="mt-5 grid gap-3 rounded-md border border-slate-200 p-4">
            <div className="flex justify-between"><span>플랫폼 최저가</span><strong>{formatCurrency(product.comparison.platformLowestPrice)}</strong></div>
            <div className="flex justify-between"><span>폐쇄몰가</span><strong>{formatCurrency(product.price)}</strong></div>
            <div className="flex justify-between text-emerald-700"><span>절감 mock</span><strong>{formatCurrency(product.comparison.platformLowestPrice - product.price)}</strong></div>
          </div>
          <div className="mt-5 grid gap-2">
            {options.length ? options.map((option) => (
              <div key={option.id} className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span>{option.name}</span>
                <span>{formatCurrency(product.price + option.priceDelta)} / 재고 {option.stock}</span>
              </div>
            )) : (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">기본 옵션 / 재고 {product.stock}</div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/tablet/cart" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">
              장바구니 담기 mock
            </Link>
            <Link href="/tablet/qr" className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">
              구매 QR 생성
            </Link>
          </div>
        </section>
      </div>
    </TabletFrame>
  );
}

export function TabletCartPage() {
  const session = mockApi.findQr("SANHO701");

  return (
    <TabletFrame title="장바구니" subtitle="QR 생성 전 상품 snapshot과 수령방식을 확인합니다.">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-3">
          {session.items.map((item) => (
            <article key={item.productId} className="rounded-md bg-white p-4 text-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{item.productName}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.optionName} / 수량 {item.quantity}</p>
                </div>
                <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
              </div>
            </article>
          ))}
        </section>
        <aside className="rounded-md bg-white p-4 text-slate-950">
          <p className="text-sm text-slate-600">수령방식</p>
          <h2 className="mt-1 text-xl font-bold">현장수령</h2>
          <p className="mt-4 text-2xl font-bold">{formatCurrency(session.totalAmount)}</p>
          <Link href="/tablet/qr" className="mt-4 block rounded-md bg-amber-500 px-4 py-3 text-center text-sm font-bold">
            구매 QR 생성
          </Link>
          <Link href="/tablet/ask" className="mt-2 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white">
            조르기 QR 생성
          </Link>
        </aside>
      </div>
    </TabletFrame>
  );
}

export function TabletQrPage() {
  const session = mockApi.findQr("SANHO701");

  return (
    <TabletFrame title="구매 QR" subtitle="QR은 2~3시간 만료, 1회성 사용, 재사용 차단을 전제로 합니다.">
      <div className="mx-auto max-w-xl rounded-md bg-white p-6 text-center text-slate-950">
        <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-md border-8 border-slate-950 bg-slate-100">
          <span className="text-3xl font-black tracking-[0.18em]">{session.shortCode}</span>
        </div>
        <h2 className="mt-6 text-2xl font-bold">{formatCurrency(session.totalAmount)}</h2>
        <p className="mt-2 text-sm text-slate-600">만료: {formatDateTime(session.expiresAt)}</p>
        <Link href={`/q/${session.shortCode}`} className="mt-5 inline-flex rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white">
          고객 QR 랜딩 열기
        </Link>
      </div>
    </TabletFrame>
  );
}

export function TabletAskPage() {
  const session = mockApi.findQr("ASKMOM88");

  return (
    <TabletFrame title="조르기 QR" subtitle="제3자 결제자에게 공유되는 mock 링크입니다.">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-md bg-white p-5 text-center text-slate-950">
          <div className="flex h-56 items-center justify-center rounded-md border-8 border-amber-400 bg-amber-50">
            <span className="text-2xl font-black tracking-[0.16em]">{session.shortCode}</span>
          </div>
          <Link href={`/q/${session.shortCode}`} className="mt-4 inline-flex rounded-md bg-amber-500 px-5 py-3 text-sm font-bold">
            조르기 링크 열기
          </Link>
        </div>
        <ConfirmBox
          title="공유 결제 주의"
          description="조르기 수신자는 회원가입 없이 결제 화면에 진입하지만, 만료와 1회성 사용 검증이 필수입니다."
          confirmLabel="QR 정책"
        />
      </div>
    </TabletFrame>
  );
}
