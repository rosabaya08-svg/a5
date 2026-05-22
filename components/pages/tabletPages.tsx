import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CartActionMockPanel,
  CartInventoryRiskPanel,
  CartSnapshotLedger,
  CatalogFilterSortPanel,
  EmptyStatePanel,
  ErrorStatePanel,
  FulfillmentDecisionPanel,
  ProductGalleryMockPanel,
  ProductDetailMockTabs,
  ProductPolicyPanel,
  ProductPurchaseMockPanel,
  ProductRiskList,
  QrExpiryNotice,
  QrIssueModePanel,
  QrStatePreviewLinks,
  ResponsiveMockPanel,
  TabletBetaChecklist,
  TabletRouteMatrix,
  TabletSummaryGrid,
} from "@/components/tablet/TabletBetaPanels";
import {
  getApprovedProducts,
  getAskSession,
  getCartItemNotices,
  getCartSession,
  getCatalogSummaries,
  getDiscountRate,
  getFulfillmentLabel,
  getProduct,
  getProductCategories,
  getProductOptions,
  getProductRisks,
  getQrPreviewSessions,
  getQrStatusSummaries,
  getSessionItemCount,
  getSessionSubtotal,
  getStockState,
  getTabletStoreContext,
} from "@/lib/repositories/mock/tabletQrRepository";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { CartItemSnapshot, Product, QrPaymentSession } from "@/types/commerce";
import type { ReactNode } from "react";

const tabletNav = [
  { href: "/tablet/products", label: "Products" },
  { href: "/tablet/cart", label: "Cart" },
  { href: "/tablet/qr", label: "QR" },
  { href: "/tablet/ask", label: "Ask payer" },
  { href: "/tablet/status", label: "Status" },
];

const toneClasses: Record<Product["thumbnailTone"], string> = {
  sage: "bg-emerald-100 text-emerald-950",
  rose: "bg-rose-100 text-rose-950",
  sky: "bg-sky-100 text-sky-950",
  gold: "bg-amber-100 text-amber-950",
  ink: "bg-slate-200 text-slate-950",
};

const stockToneClasses = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-800",
};

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "red" | "green" | "amber" }) {
  const classes = {
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-100 text-red-800",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-900",
  };

  return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${classes[tone]}`}>{children}</span>;
}

function StoreShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { session, nursery, room, tablet } = getTabletStoreContext();

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-slate-950">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-4 md:px-6">
        <header className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="bg-slate-950 px-4 py-4 text-white md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-300">Sanho tablet closed mall</p>
                <h1 className="mt-1 text-2xl font-black md:text-4xl">{title}</h1>
              </div>
              <nav className="flex flex-wrap gap-2">
                {tabletNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-900">
                mock/test beta
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-900">
                Firebase none
              </span>
              <span className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-black text-red-800">
                PG mock only
              </span>
            </div>
          </div>

          <div className="grid gap-3 bg-white p-4 md:grid-cols-4 md:p-5">
            <ContextTile label="Nursery" value={nursery?.name ?? session.nurseryId} helper={nursery?.region ?? "mock"} />
            <ContextTile label="Room" value={room?.name ?? session.roomId} helper={room?.pickupEnabled ? "Pickup enabled" : "Delivery only"} />
            <ContextTile label="Tablet" value={tablet?.label ?? session.tabletId} helper={session.tabletId} />
            <ContextTile label="QR source" value={session.shortCode} helper={`Expires ${formatDateTime(session.expiresAt)}`} />
          </div>
        </header>

        <section className="py-5">{children}</section>
      </div>
    </main>
  );
}

function ContextTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950 md:text-base">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function ProductVisual({ product }: { product: Product }) {
  return (
    <div className={`flex aspect-[4/3] items-center justify-center p-5 text-center ${toneClasses[product.thumbnailTone]}`}>
      <div>
        <p className="text-sm font-black uppercase">{product.category}</p>
        <p className="mt-2 text-4xl font-black">{getDiscountRate(product)}%</p>
        <p className="mt-1 text-xs font-bold">closed mall benefit</p>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const stock = getStockState(product);

  return (
    <Link
      href={`/tablet/products/${product.id}`}
      className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <ProductVisual product={product} />
      <div className="grid gap-3 p-4">
        <div className="flex min-h-16 items-start justify-between gap-3">
          <h3 className="text-lg font-black leading-6">{product.name}</h3>
          <Pill tone="red">{getDiscountRate(product)}% OFF</Pill>
        </div>
        <div>
          <p className="text-sm text-slate-400 line-through">
            List {formatCurrency(product.comparison.listPrice)}
          </p>
          <p className="mt-1 text-2xl font-black text-red-600">{formatCurrency(product.price)}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-700">
            {formatCurrency(product.comparison.platformLowestPrice - product.price)} below comparison low
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill>{getFulfillmentLabel(product)}</Pill>
          <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${stockToneClasses[stock.tone]}`}>
            {stock.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

function StoreStats({ session }: { session: QrPaymentSession }) {
  const products = getApprovedProducts();
  const lowStock = products.filter((product) => product.stock <= 10).length;

  return (
    <section className="mb-4 grid gap-3 md:grid-cols-4">
      <StatPanel label="Approved products" value={products.length.toString()} helper="Mock catalog only" tone="bg-white" />
      <StatPanel label="Cart items" value={getSessionItemCount(session).toString()} helper="Snapshot quantity" tone="bg-emerald-50" />
      <StatPanel label="QR amount" value={formatCurrency(session.totalAmount)} helper="Server recompute stub" tone="bg-rose-50" />
      <StatPanel label="Low stock" value={lowStock.toString()} helper="External API blocked" tone="bg-amber-50" />
    </section>
  );
}

function StatPanel({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: string }) {
  return (
    <section className={`rounded-md border border-slate-200 p-4 ${tone}`}>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{helper}</p>
    </section>
  );
}

function CategoryStrip() {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {getProductCategories().map((category, index) => (
        <span
          key={category}
          className={`shrink-0 rounded-md px-3 py-2 text-sm font-bold ${
            index === 0 ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          {category}
        </span>
      ))}
    </div>
  );
}

function PromoBand() {
  return (
    <section className="mb-4 grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-md bg-[#2f4b3f] p-5 text-white">
        <p className="text-sm font-semibold text-emerald-100">Room-only beta pricing</p>
        <h2 className="mt-2 text-3xl font-black">Build the cart here, send payment by QR.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
          This tablet flow keeps product browsing, cart snapshots, pickup choice, and QR issuance inside mock data.
        </p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold text-slate-500">Beta safety</p>
        <p className="mt-2 text-2xl font-black text-slate-950">Mock only</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No Firebase repository, PG call, delivery tracking, refund, or settlement execution is connected.
        </p>
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
          <p className="mt-1 text-sm text-slate-600">Option: {item.optionName}</p>
          <div className="mt-3 inline-grid h-9 grid-cols-[36px_44px_36px] overflow-hidden rounded-md border border-slate-200 text-center text-sm font-black">
            <span className="bg-slate-100 py-2 text-slate-400">-</span>
            <span className="bg-white py-2">{item.quantity}</span>
            <span className="bg-slate-100 py-2 text-slate-400">+</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">{formatCurrency(item.unitPrice)} each</p>
          <p className="mt-1 text-xl font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
        </div>
      </div>
    </article>
  );
}

function SummaryPanel({
  session,
  primaryHref,
  primaryLabel,
}: {
  session: QrPaymentSession;
  primaryHref: string;
  primaryLabel: string;
}) {
  const subtotal = getSessionSubtotal(session.items);

  return (
    <aside className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-black">Order snapshot</h2>
      <div className="mt-4 grid gap-3 text-sm">
        <SummaryRow label="Items" value={`${getSessionItemCount(session)} units`} />
        <SummaryRow label="Fulfillment" value={session.deliveryMethod === "pickup" ? "Nursery pickup" : "Delivery"} />
        <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
        <SummaryRow label="Mock fee" value={formatCurrency(0)} />
        <div className="border-t border-slate-100 pt-3">
          <SummaryRow label="Total" value={formatCurrency(session.totalAmount)} strong />
        </div>
      </div>
      <Link
        href={primaryHref}
        className="mt-5 block rounded-md bg-red-600 px-4 py-3 text-center text-sm font-black text-white"
      >
        {primaryLabel}
      </Link>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        QR expiry, single-use status, and server amount recalculation are documented as mock/stub behavior.
      </p>
    </aside>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-lg" : ""}`}>
      <span className={strong ? "font-black" : "text-slate-600"}>{label}</span>
      <strong className={strong ? "text-red-600" : "text-slate-950"}>{value}</strong>
    </div>
  );
}

function QrMockBox({ session }: { session: QrPaymentSession }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 text-center">
      <div className="mx-auto grid h-72 w-72 grid-cols-5 gap-1 rounded-md border-8 border-slate-950 bg-white p-3">
        {Array.from({ length: 25 }).map((_, index) => (
          <span
            key={index}
            className={`rounded-sm ${
              [0, 1, 2, 5, 10, 12, 14, 16, 18, 20, 21, 22, 24].includes(index)
                ? "bg-slate-950"
                : "bg-slate-100"
            }`}
          />
        ))}
      </div>
      <p className="mt-4 text-3xl font-black">{session.shortCode}</p>
      <p className="mt-1 text-sm font-bold text-red-600">Expires {formatDateTime(session.expiresAt)}</p>
    </div>
  );
}

export function TabletHomePage() {
  return <TabletProductsPage />;
}

export function TabletProductsPage() {
  const session = getCartSession();
  const products = getApprovedProducts();

  return (
    <StoreShell
      title="Tablet store"
      subtitle="Closed mall browsing for nursery tablets. Product cards show list price, closed mall price, stock state, and pickup or delivery labels from mock data."
    >
      <StoreStats session={session} />
      <PromoBand />
      <TabletBetaChecklist />
      <div className="h-4" />
      <TabletSummaryGrid summaries={getCatalogSummaries()} />
      <div className="h-4" />
      <CatalogFilterSortPanel />
      <CategoryStrip />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Recommended products</h2>
          <p className="mt-1 text-sm text-slate-600">
            Approved products only. Pending products stay out of the tablet catalog.
          </p>
        </div>
        <Link href="/tablet/cart" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          View cart
        </Link>
      </div>
      {products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyStatePanel
          title="No approved products"
          detail="This is the tablet empty-state placeholder for a category or approval filter with no products."
        />
      )}
      <div className="mt-4">
        <ErrorStatePanel
          title="External inventory unavailable"
          detail="The beta deliberately avoids external inventory APIs. Stock labels are mock values until server sync is approved."
        />
      </div>
      <div className="mt-4">
        <TabletRouteMatrix />
      </div>
    </StoreShell>
  );
}

export function TabletProductDetailPage({ productId }: { productId: string }) {
  const product = getProduct(productId);
  const options = getProductOptions(product.id);
  const stock = getStockState(product);
  const risks = getProductRisks(product);

  return (
    <StoreShell
      title={product.name}
      subtitle="Product detail mock with price comparison, option inventory, fulfillment branch, and safe cart/QR actions."
    >
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="grid gap-4">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <ProductVisual product={product} />
            <div className="grid gap-3 p-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={product.status} />
                <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${stockToneClasses[stock.tone]}`}>
                  {stock.label}
                </span>
                <Pill>{getFulfillmentLabel(product)}</Pill>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                This product is shown as a mock closed-mall offer. Image storage, real inventory sync, and purchase
                persistence are not connected.
              </p>
            </div>
          </div>
          <ProductGalleryMockPanel product={product} />
        </section>

        <section className="grid gap-4">
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-400 line-through">
              List price {formatCurrency(product.comparison.listPrice)}
            </p>
            <h2 className="mt-2 text-4xl font-black text-red-600">{formatCurrency(product.price)}</h2>
            <p className="mt-2 text-sm font-semibold text-emerald-700">
              {formatCurrency(product.comparison.platformLowestPrice - product.price)} below comparison low.
            </p>
            <div className="mt-5 grid gap-2 text-sm">
              <SummaryRow label="Platform low" value={formatCurrency(product.comparison.platformLowestPrice)} />
              <SummaryRow label="Closed mall" value={formatCurrency(product.comparison.closedMallPrice)} />
              <SummaryRow label="Discount rate" value={`${getDiscountRate(product)}%`} strong />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h3 className="font-black">Option inventory mock</h3>
            <div className="mt-3 grid gap-2">
              {options.length ? (
                options.map((option) => (
                  <div key={option.id} className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span>{option.name}</span>
                    <span>
                      {formatCurrency(product.price + option.priceDelta)} / stock {option.stock}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">Default option / stock {product.stock}</div>
              )}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link href="/tablet/cart" className="rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
                Add to mock cart
              </Link>
              <Link href="/tablet/qr" className="rounded-md bg-red-600 px-4 py-3 text-center text-sm font-black text-white">
                Create QR
              </Link>
            </div>
          </div>
          <ProductPurchaseMockPanel product={product} options={options} />
          <ProductRiskList risks={risks} />
          <ProductDetailMockTabs product={product} />
          <ProductPolicyPanel />
        </section>
      </div>
    </StoreShell>
  );
}

export function TabletCartPage() {
  const session = getCartSession();

  return (
    <StoreShell
      title="Cart snapshot"
      subtitle="Quantity controls, cart item snapshots, pickup or delivery branch, and QR issuance are mocked for beta review."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <section className="grid gap-3">
          <FulfillmentDecisionPanel method={session.deliveryMethod} />
          {session.items.map((item) => (
            <CartLine key={`${item.productId}-${item.optionName}`} item={item} />
          ))}
          <CartInventoryRiskPanel notices={getCartItemNotices(session.items)} />
          <CartActionMockPanel />
          <CartSnapshotLedger items={session.items} />
          <ResponsiveMockPanel />
        </section>

        <SummaryPanel session={session} primaryHref="/tablet/qr" primaryLabel="Create purchase QR" />
      </div>
    </StoreShell>
  );
}

export function TabletQrPage() {
  const session = getCartSession();
  const askSession = getAskSession();

  return (
    <StoreShell
      title="Purchase QR"
      subtitle="Tablet staff can hand this QR to a customer or guardian. The QR landing, checkout, success, failed, expired, and used states are mock screens."
    >
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[380px_1fr]">
        <section>
          <QrMockBox session={session} />
          <Link
            href={`/q/${session.shortCode}`}
            className="mt-3 block rounded-md bg-slate-950 px-5 py-3 text-center text-sm font-black text-white"
          >
            Open mobile landing
          </Link>
          <div className="mt-3">
            <QrExpiryNotice session={session} />
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">QR order summary</h2>
              <p className="mt-1 text-sm text-slate-600">short_code, qr_session_id, expiry, and cart snapshot.</p>
            </div>
            <StatusBadge status={session.status} />
          </div>
          <div className="mt-4 grid gap-3">
            {session.items.map((item) => (
              <CartLine key={`${item.productId}-${item.optionName}`} item={item} />
            ))}
          </div>
          <div className="mt-4 flex justify-between rounded-md bg-red-50 px-4 py-3">
            <span className="font-black">Mock payment amount</span>
            <strong className="text-red-600">{formatCurrency(session.totalAmount)}</strong>
          </div>
        </section>
      </div>
      <div className="mt-4">
        <QrIssueModePanel purchaseSession={session} askSession={askSession} />
      </div>
      <div className="mt-4">
        <TabletSummaryGrid summaries={getQrStatusSummaries()} />
      </div>
      <div className="mt-4">
        <QrStatePreviewLinks sessions={getQrPreviewSessions()} />
      </div>
      <div className="mt-4">
        <ResponsiveMockPanel />
      </div>
    </StoreShell>
  );
}

export function TabletAskPage() {
  const session = getAskSession();

  return (
    <StoreShell
      title="Ask payer QR"
      subtitle="A guardian can open this link from their phone, review the cart, enter payer information, and continue to mock checkout."
    >
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[380px_1fr]">
        <section>
          <QrMockBox session={session} />
          <Link
            href={`/q/${session.shortCode}`}
            className="mt-3 block rounded-md bg-amber-500 px-5 py-3 text-center text-sm font-black text-slate-950"
          >
            Open ask link
          </Link>
          <div className="mt-3">
            <QrExpiryNotice session={session} />
          </div>
        </section>
        <SummaryPanel session={session} primaryHref={`/q/${session.shortCode}/checkout`} primaryLabel="Preview payer checkout" />
      </div>
    </StoreShell>
  );
}
