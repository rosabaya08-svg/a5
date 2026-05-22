import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { CountSummary, QrLifecycleState } from "@/lib/repositories/mock/tabletQrRepository";
import type { Order, Payment, QrPaymentSession } from "@/types/commerce";

const summaryToneClasses: Record<NonNullable<CountSummary["level"]>, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-emerald-100 text-emerald-800",
};

export function GuestVerificationPanel() {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-black text-amber-900">Guest verification mock</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Order lookup uses order number and masked phone as a placeholder. Production needs a confirmed verification
        policy before exposing customer data.
      </p>
    </section>
  );
}

export function GuestLookupFilterPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Lookup filters mock</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_140px_140px]">
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Search
          <input
            readOnly
            value="A5-20260519"
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Status
          <select
            disabled
            value="all"
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600"
          >
            <option value="all">All</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Sort
          <select
            disabled
            value="latest"
            className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-600"
          >
            <option value="latest">Latest first</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export function GuestSummaryGrid({ summaries }: { summaries: CountSummary[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Guest order summary</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {summaries.map((summary) => (
          <div key={summary.label} className="rounded-md bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">{summary.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{summary.value}</p>
              </div>
              {summary.level ? (
                <span className={`rounded-md px-2 py-1 text-xs font-black ${summaryToneClasses[summary.level]}`}>
                  {summary.level}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">{summary.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GuestRouteMatrix() {
  const routes = [
    ["/q/SANHO701", "Active QR"],
    ["/q/OLDQR22", "Expired QR"],
    ["/q/USED701", "Already paid QR"],
    ["/q/VOID1234", "Cancelled QR"],
    ["/q/CANCEL77/status", "Canceled QR status"],
    ["/q/DELIV900/status", "Delivered order QR status"],
    ["/orders/guest/A5-20260519-004", "Cancelled order detail"],
    ["/orders/guest/UNKNOWN-ORDER", "Error state detail"],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Guest QA route matrix</h2>
      <div className="mt-3 grid gap-2">
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

export function QrIdentityPanel({ session }: { session: QrPaymentSession }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">QR identity</h2>
      <div className="mt-3 grid gap-2 text-sm">
        <IdentityRow label="short_code" value={session.shortCode} />
        <IdentityRow label="qr_session_id" value={session.id} />
        <IdentityRow label="cart_id" value={session.cartId} />
        <IdentityRow label="tablet_id" value={session.tabletId} />
        <IdentityRow label="expires_at" value={formatDateTime(session.expiresAt)} />
      </div>
    </section>
  );
}

export function CheckoutConfirmPanel({ session }: { session: QrPaymentSession }) {
  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Before payment handoff</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            The payer sees final amount, QR state, and fulfillment method before any future PG request.
          </p>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
        <p className="text-xs font-bold uppercase text-red-700">Mock amount</p>
        <p className="mt-1 text-2xl font-black text-red-600">{formatCurrency(session.totalAmount)}</p>
      </div>
    </section>
  );
}

export function PaymentMethodMockPanel() {
  const methods = [
    { label: "Card mock", state: "selected", detail: "Ready for future PG handoff, no SDK call." },
    { label: "Easy pay mock", state: "available", detail: "UI branch only, provider not selected." },
    { label: "Bank transfer", state: "blocked", detail: "Blocked until settlement and refund policy is approved." },
  ];

  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Payment method mock</h2>
      <div className="mt-3 grid gap-2">
        {methods.map((method) => (
          <div
            key={method.label}
            className={`rounded-md border px-3 py-3 ${
              method.state === "blocked" ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-black">{method.label}</span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-600">{method.state}</span>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-600">{method.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PayerValidationMockPanel({ session }: { session: QrPaymentSession }) {
  const checks = [
    {
      label: "Payer name",
      state: "mock valid",
      detail: session.type === "ask" ? "Guardian payer name is preview-only." : "Guest customer name is preview-only.",
    },
    {
      label: "Mobile phone",
      state: "masked only",
      detail: "The screen shows sample input and must not persist real personal information in beta.",
    },
    {
      label: "Fulfillment consent",
      state: session.deliveryMethod,
      detail:
        session.deliveryMethod === "pickup"
          ? "Pickup confirmation remains a nursery/admin mock state."
          : "Delivery address and carrier tracking remain blocked.",
    },
  ];

  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Payer validation mock</h2>
      <div className="mt-3 grid gap-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-black">{check.label}</span>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-600">{check.state}</span>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-600">{check.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CheckoutLoadingMockPanel() {
  const steps = ["Lock cart snapshot", "Block real PG SDK", "Return deterministic mock result"];

  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black">Payment loading mock</h2>
      <div className="mt-3 grid gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-950 font-black text-white">
              {index + 1}
            </span>
            <span className="font-semibold">{step}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        This loading state is a visual placeholder only. No approval request, cancellation request, or webhook is used.
      </p>
    </section>
  );
}

export function QrConflictPanel({ lifecycle }: { lifecycle: QrLifecycleState }) {
  const message: Record<QrLifecycleState, string> = {
    active: "No conflict. Checkout can continue inside the mock flow.",
    expired: "QR expired before payment completion. A new tablet QR should be generated later.",
    used: "QR was already paid. The customer should move to order lookup instead of checkout.",
    canceled: "QR was cancelled or blocked. Retry requires a new QR after operator review.",
    payment_failed: "Mock payment failed. Retry remains UI-only until PG retry rules are approved.",
  };

  return (
    <section className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
      <h3 className="font-black text-amber-900">QR conflict state</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{message[lifecycle]}</p>
    </section>
  );
}

export function OrderLookupMismatchPanel() {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-4">
      <h3 className="font-black text-red-900">Order/phone mismatch mock</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        If an order number and phone value do not match, the beta should show this safe error state without revealing
        whether a real customer record exists.
      </p>
    </section>
  );
}

export function RefundRequestMockPanel({ order }: { order: Order }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-4">
      <h3 className="font-black text-red-900">Refund request mock</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Refund request for {order.orderNo} is displayed only as a UI reservation. PG cancellation, refund approval,
        settlement hold, and notification are intentionally disconnected.
      </p>
      <button
        type="button"
        disabled
        className="mt-4 w-full rounded-md bg-white px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-200"
      >
        Refund request disabled
      </button>
    </section>
  );
}

export function PaymentDetailPanel({ payment }: { payment?: Payment }) {
  if (!payment) {
    return (
      <GuestErrorState
        title="Payment record not found"
        detail="The order can render, but a matching mock payment record is missing. Real payment lookup remains blocked."
      />
    );
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black">Payment mock detail</h3>
          <p className="mt-1 text-sm text-slate-600">{payment.mockTid}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <IdentityRow label="amount" value={formatCurrency(payment.amount)} />
        <IdentityRow label="approved_at" value={payment.approvedAt ? formatDateTime(payment.approvedAt) : "not approved"} />
      </div>
    </section>
  );
}

export function QrStatusPanel({ session, lifecycle }: { session: QrPaymentSession; lifecycle: string }) {
  const detail: Record<string, string> = {
    active: "QR is active and can continue to mock checkout.",
    expired: "QR is expired and must block checkout.",
    used: "QR was already paid and should lead to order lookup.",
    canceled: "QR was manually cancelled and should not allow retry without a new QR.",
    payment_failed: "Payment failed in mock data. Retry is a UI branch only.",
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase text-slate-500">QR status page</p>
          <h2 className="mt-1 text-3xl font-black">{session.shortCode}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{detail[lifecycle] ?? detail.active}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <IdentityRow label="lifecycle" value={lifecycle} />
        <IdentityRow label="qr_session_id" value={session.id} />
        <IdentityRow label="expires_at" value={formatDateTime(session.expiresAt)} />
        <IdentityRow label="amount" value={formatCurrency(session.totalAmount)} />
      </div>
    </section>
  );
}

export function ShareGuidePanel({ session }: { session: QrPaymentSession }) {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <h3 className="font-black text-amber-900">Ask payer share guide</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Share code {session.shortCode} with a guardian payer. The payer can review the snapshot and enter mock payment
        information without a member account.
      </p>
    </section>
  );
}

export function SuccessSnapshotPanel({ session, orderNo }: { session: QrPaymentSession; orderNo: string }) {
  return (
    <section className="rounded-md border border-emerald-200 bg-white p-4">
      <h3 className="font-black text-emerald-900">Success snapshot</h3>
      <div className="mt-3 grid gap-2 text-sm">
        <IdentityRow label="order_no" value={orderNo} />
        <IdentityRow label="fulfillment" value={session.deliveryMethod === "pickup" ? "Nursery pickup" : "Delivery"} />
        <IdentityRow label="items" value={`${session.items.length} snapshot rows`} />
        <IdentityRow label="amount" value={formatCurrency(session.totalAmount)} />
      </div>
    </section>
  );
}

export function FailureReasonPanel({ session }: { session: QrPaymentSession }) {
  const reason =
    session.status === "expired"
      ? "QR expired before checkout."
      : session.status === "paid"
        ? "QR was already used."
        : session.status === "cancelled"
          ? "QR was cancelled by operator."
          : "Mock payment failed before approval.";

  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-4">
      <h3 className="font-black text-red-900">Failure reason mock</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{reason}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        Retry is allowed only as a UI preview. No PG retry, refund, or notification is executed.
      </p>
    </section>
  );
}

export function GuestEmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-sm font-black uppercase text-slate-400">Empty state</p>
      <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </section>
  );
}

export function GuestErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-4 text-red-950">
      <p className="text-sm font-black uppercase text-red-700">Error state mock</p>
      <h3 className="mt-2 text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6">{detail}</p>
    </section>
  );
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-md bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-500">{label}</span>
      <strong className="text-right text-slate-950">{value}</strong>
    </div>
  );
}
