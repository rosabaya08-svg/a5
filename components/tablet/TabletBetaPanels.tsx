import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { CartItemNotice, CountSummary, ProductRisk } from "@/lib/repositories/mock/tabletQrRepository";
import type { CartItemSnapshot, Product, QrPaymentSession } from "@/types/commerce";

const riskClasses: Record<ProductRisk["level"], string> = {
  high: "bg-red-100 text-red-800 ring-red-200",
  medium: "bg-amber-100 text-amber-900 ring-amber-200",
  low: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

const galleryToneClasses: Record<Product["thumbnailTone"], string> = {
  sage: "bg-emerald-100 text-emerald-950",
  rose: "bg-rose-100 text-rose-950",
  sky: "bg-sky-100 text-sky-950",
  gold: "bg-amber-100 text-amber-950",
  ink: "bg-slate-200 text-slate-950",
};

export function RiskBadge({ level, label }: { level: ProductRisk["level"]; label: string }) {
  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-black ring-1 ${riskClasses[level]}`}>
      {label}
    </span>
  );
}

export function CatalogFilterSortPanel() {
  return (
    <section className="mb-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_150px_150px_150px_150px_150px]">
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Search
          <input
            readOnly
            value="recovery, tea, baby"
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Category
          <select
            disabled
            value="all"
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600"
          >
            <option value="all">All categories</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Price
          <select
            disabled
            value="under100"
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600"
          >
            <option value="under100">Under 100K</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Stock
          <select
            disabled
            value="available"
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600"
          >
            <option value="available">Available</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Receive
          <select
            disabled
            value="all"
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600"
          >
            <option value="all">Pickup/delivery</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Sort
          <select
            disabled
            value="benefit"
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600"
          >
            <option value="benefit">Benefit high first</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Controls are static mock UI. Search indexing and server filters are intentionally not connected.
      </p>
    </section>
  );
}

export function ProductGalleryMockPanel({ product }: { product: Product }) {
  const frames = ["Main", "Detail", "Package", "Room view"];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black">Image placeholder gallery</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">Storage is not connected. These frames reserve the product detail layout.</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{product.thumbnailTone}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {frames.map((frame, index) => (
          <div
            key={frame}
            className={`flex aspect-[4/3] items-center justify-center rounded-md p-3 text-center ${galleryToneClasses[product.thumbnailTone]}`}
          >
            <div>
              <p className="text-xs font-black uppercase">{frame}</p>
              <p className="mt-1 text-lg font-black">{index + 1}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TabletBetaChecklist() {
  const items = [
    "Tablet-only access is represented as mock UI.",
    "Product images use local visual placeholders.",
    "Cart snapshots are read-only mock records.",
    "QR creation never calls Firebase or PG.",
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Beta guardrails</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TabletSummaryGrid({ summaries }: { summaries: CountSummary[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">State summary</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaries.map((item) => (
          <div key={item.label} className="rounded-md bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
              </div>
              {item.level ? <RiskBadge level={item.level} label={item.level} /> : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{item.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FulfillmentDecisionPanel({ method }: { method: QrPaymentSession["deliveryMethod"] }) {
  const choices = [
    {
      id: "pickup",
      title: "Nursery pickup",
      body: "Pickup event remains a mock status until nursery admin confirmation rules are approved.",
    },
    {
      id: "delivery",
      title: "Delivery",
      body: "Invoice entry and carrier tracking are placeholders. No external delivery API is called.",
    },
  ] as const;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Fulfillment branch</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => {
          const active = choice.id === method;

          return (
            <div
              key={choice.id}
              className={`rounded-md border p-3 ${
                active ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white"
              }`}
            >
              <p className="font-black">{choice.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">{choice.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CartSnapshotLedger({ items }: { items: CartItemSnapshot[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">cart_items snapshot</h2>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.optionName}`}
            className="grid gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[1fr_120px_120px]"
          >
            <span className="font-semibold">{item.productName}</span>
            <span>{item.optionName}</span>
            <span className="font-black">{formatCurrency(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function QrStatePreviewLinks({ sessions }: { sessions: QrPaymentSession[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">QR state previews</h2>
          <p className="mt-1 text-sm text-slate-600">Active, expired, and already-used QR cases for beta review.</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {sessions.length} mock sessions
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/q/${session.shortCode}`}
            className="rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-400 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{session.shortCode}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {session.id} / expires {formatDateTime(session.expiresAt)}
                </p>
              </div>
              <StatusBadge status={session.status} />
            </div>
            <p className="mt-2 text-sm font-bold text-red-600">{formatCurrency(session.totalAmount)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function TabletRouteMatrix() {
  const routes = [
    ["/tablet/products", "Catalog with filters"],
    ["/tablet/products/product-monitor", "Critical stock detail"],
    ["/tablet/cart", "Cart snapshot"],
    ["/tablet/qr", "QR issue and state gallery"],
    ["/tablet/ask", "Ask payer QR"],
    ["/tablet/status", "Track status dashboard"],
    ["/q/SANHO701/status", "Active QR status"],
    ["/q/VOID1234", "Cancelled QR block"],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Tablet QA route matrix</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {routes.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-md bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">
            <span className="font-black text-slate-950">{href}</span>
            <span className="mt-1 block text-slate-600">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function QrExpiryNotice({ session }: { session: QrPaymentSession }) {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <h2 className="font-black">QR expiry rule mock</h2>
      <p className="mt-2 text-sm leading-6">
        short_code <strong>{session.shortCode}</strong> is tied to qr_session_id <strong>{session.id}</strong>.
        This UI assumes a short-lived, single-use QR and blocks real payment integration.
      </p>
      <p className="mt-2 text-sm font-bold">Expires {formatDateTime(session.expiresAt)}</p>
    </section>
  );
}

export function ProductRiskList({ risks }: { risks: ProductRisk[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="font-black">Risk badges</h3>
      <div className="mt-3 grid gap-2">
        {risks.map((risk) => (
          <div key={risk.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <RiskBadge level={risk.level} label={risk.label} />
              <span className="text-xs font-semibold uppercase text-slate-400">{risk.level}</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600">{risk.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductDetailMockTabs({ product }: { product: Product }) {
  const rows = [
    ["Product ID", product.id],
    ["Company scope", product.companyId],
    ["External code", product.externalProductCode ?? "not mapped"],
    ["Mock persistence", "UI only"],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex gap-2 overflow-x-auto">
        {["Summary", "Options", "Policy", "Audit"].map((tab, index) => (
          <span
            key={tab}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-black ${
              index === 0 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 rounded-md bg-slate-50 px-3 py-2">
            <span className="font-semibold text-slate-500">{label}</span>
            <strong className="text-right text-slate-950">{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductPurchaseMockPanel({ product, options }: { product: Product; options: Array<{ name: string; stock: number }> }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="font-black">Option and quantity mock</h3>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Option
          <select
            disabled
            value={options[0]?.name ?? "Default"}
            className="h-12 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-700"
          >
            {(options.length ? options : [{ name: "Default", stock: product.stock }]).map((option) => (
              <option key={option.name} value={option.name}>
                {option.name} / stock {option.stock}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 text-sm font-bold text-slate-700">
          Quantity
          <div className="grid h-12 w-40 grid-cols-3 overflow-hidden rounded-md border border-slate-200 text-center text-base font-black">
            <span className="bg-slate-100 py-3 text-slate-400">-</span>
            <span className="bg-white py-3">1</span>
            <span className="bg-slate-100 py-3 text-slate-400">+</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Option and quantity controls are touch-size placeholders. No cart write is performed.
      </p>
    </section>
  );
}

export function ProductPolicyPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="font-black">Refund and delivery guide mock</h3>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="rounded-md bg-slate-50 px-3 py-2">
          Delivery tracking is blocked until a carrier API contract is approved.
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2">
          Nursery pickup completion needs staff confirmation rules before real writes.
        </div>
        <div className="rounded-md bg-red-50 px-3 py-2 text-red-800">
          Refund request is UI-only and requires admin approval in a future phase.
        </div>
      </div>
    </section>
  );
}

export function CartInventoryRiskPanel({ notices }: { notices: CartItemNotice[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Cart inventory guard</h2>
      <div className="mt-3 grid gap-2">
        {notices.map((notice) => (
          <div key={notice.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black">{notice.productName}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{notice.detail}</p>
              </div>
              <RiskBadge level={notice.level} label={notice.label} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function QrIssueModePanel({
  purchaseSession,
  askSession,
}: {
  purchaseSession: QrPaymentSession;
  askSession: QrPaymentSession;
}) {
  const modes = [
    {
      title: "Purchase QR",
      session: purchaseSession,
      href: `/q/${purchaseSession.shortCode}`,
      helper: "Customer scans on their phone and pays for the cart snapshot.",
    },
    {
      title: "Ask-payer QR",
      session: askSession,
      href: `/q/${askSession.shortCode}`,
      helper: "Guardian payer receives the same mock checkout path without member Auth.",
    },
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">QR issue modes</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {modes.map((mode) => (
          <Link key={mode.title} href={mode.href} className="rounded-md border border-slate-200 bg-slate-50 p-3 hover:bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{mode.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{mode.helper}</p>
              </div>
              <StatusBadge status={mode.session.status} />
            </div>
            <div className="mt-3 grid gap-1 text-xs text-slate-600">
              <span>short_code: {mode.session.shortCode}</span>
              <span>qr_session_id: {mode.session.id}</span>
              <span>expires_at: {formatDateTime(mode.session.expiresAt)}</span>
              <span>
                source: {mode.session.nurseryId} / {mode.session.roomId} / {mode.session.tabletId}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CartActionMockPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Cart actions mock</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button disabled className="h-12 rounded-md bg-slate-100 px-4 text-sm font-black text-slate-500">
          Delete selected item
        </button>
        <button disabled className="h-12 rounded-md bg-slate-100 px-4 text-sm font-black text-slate-500">
          Recalculate mock total
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Buttons are disabled because real cart mutation and persistence are out of scope.
      </p>
    </section>
  );
}

export function EmptyStatePanel({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-sm font-black uppercase text-slate-400">Empty state</p>
      <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </section>
  );
}

export function ErrorStatePanel({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-4 text-red-950">
      <p className="text-sm font-black uppercase text-red-700">Error state mock</p>
      <h3 className="mt-2 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6">{detail}</p>
    </section>
  );
}

export function ResponsiveMockPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="font-black">Responsive review points</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {["mobile QR", "tablet cart", "desktop review"].map((item) => (
          <div key={item} className="rounded-md bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
