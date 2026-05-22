import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CheckoutConfirmPanel,
  CheckoutLoadingMockPanel,
  FailureReasonPanel,
  GuestEmptyState,
  GuestErrorState,
  GuestLookupFilterPanel,
  GuestRouteMatrix,
  GuestSummaryGrid,
  GuestVerificationPanel,
  OrderLookupMismatchPanel,
  PayerValidationMockPanel,
  PaymentMethodMockPanel,
  PaymentDetailPanel,
  QrIdentityPanel,
  QrConflictPanel,
  QrStatusPanel,
  RefundRequestMockPanel,
  ShareGuidePanel,
  SuccessSnapshotPanel,
} from "@/components/guest/GuestBetaPanels";
import {
  findGuestOrder,
  getGuestOrderSummaries,
  getGuestOrders,
  getMockOrderNo,
  getQrLifecycleState,
  getQrPreviewSessions,
  getQrSession,
  getQrStateMessage,
  getSessionItemCount,
} from "@/lib/repositories/mock/tabletQrRepository";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { CartItemSnapshot, Order, OrderItem, QrPaymentSession } from "@/types/commerce";
import type { ReactNode } from "react";

function GuestFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f4ef] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-md md:max-w-3xl">
        <header className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="bg-slate-950 p-5 text-white">
            <p className="text-sm font-bold uppercase text-slate-300">Sanho QR checkout</p>
            <h1 className="mt-2 text-3xl font-black">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-200">{subtitle}</p>
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
          <nav className="grid grid-cols-2 gap-2 p-3">
            <Link href="/orders/guest" className="rounded-md bg-slate-950 px-3 py-2 text-center text-sm font-black text-white">
              Order lookup
            </Link>
            <Link href="/tablet/products" className="rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-black">
              Tablet store
            </Link>
          </nav>
        </header>
        <section className="mt-4">{children}</section>
      </div>
    </main>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <input
        readOnly
        value={value}
        className="h-12 rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-semibold text-slate-700"
      />
    </label>
  );
}

function SessionLine({ item }: { item: CartItemSnapshot }) {
  return (
    <article className="rounded-md bg-slate-50 p-3">
      <div className="flex justify-between gap-4">
        <div>
          <p className="font-black">{item.productName}</p>
          <p className="mt-1 text-sm text-slate-600">
            {item.optionName} / {item.quantity} units
          </p>
        </div>
        <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
      </div>
    </article>
  );
}

function MobileOrderSummary({ session }: { session: QrPaymentSession }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">QR code</p>
          <h2 className="text-2xl font-black">{session.shortCode}</h2>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {session.nurseryId} / {session.roomId} / expires {formatDateTime(session.expiresAt)}
      </p>
      <div className="mt-4 grid gap-3">
        {session.items.map((item) => (
          <SessionLine key={`${item.productId}-${item.optionName}`} item={item} />
        ))}
      </div>
      <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
        <span className="font-black">Mock payment amount</span>
        <strong className="text-2xl text-red-600">{formatCurrency(session.totalAmount)}</strong>
      </div>
    </section>
  );
}

function QrStateNotice({ session }: { session: QrPaymentSession }) {
  const isActive = session.status === "active";

  return (
    <section className={`mt-3 rounded-md p-4 ${isActive ? "bg-emerald-50" : "bg-amber-50"}`}>
      <p className={`text-sm font-black ${isActive ? "text-emerald-900" : "text-amber-900"}`}>
        {isActive ? "Ready for mock checkout" : "Checkout blocked in this state"}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{getQrStateMessage(session)}</p>
    </section>
  );
}

function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <article className="rounded-md bg-slate-50 p-3">
      <div className="flex justify-between gap-4">
        <div>
          <p className="font-black">{item.productName}</p>
          <p className="mt-1 text-sm text-slate-600">
            {item.optionName} / {item.quantity} units / {item.deliveryStatus}
          </p>
        </div>
        <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
      </div>
    </article>
  );
}

function OrderStatusSteps({ order }: { order: Order }) {
  const steps =
    order.deliveryMethod === "pickup"
      ? ["Paid", "Pickup ready", "Picked up"]
      : ["Paid", "Invoice pending", "Delivered"];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="font-black">Fulfillment status</h3>
      <div className="mt-3 grid gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className={`h-3 w-3 rounded-full ${index === 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
            <span className="font-semibold">{step}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Delivery tracking API and pickup completion writes are intentionally not connected.
      </p>
    </section>
  );
}

export function QrLandingPage({ code }: { code: string }) {
  const session = getQrSession(code);
  const orderNo = getMockOrderNo(session);

  return (
    <GuestFrame
      title="Review QR order"
      subtitle="Mobile payer flow for QR sessions. Product summary, expiration, payer branch, and state blocks are all mock/test UI."
    >
      <MobileOrderSummary session={session} />
      {session.type === "ask" ? (
        <div className="mt-3">
          <ShareGuidePanel session={session} />
        </div>
      ) : null}
      <div className="mt-3">
        <QrIdentityPanel session={session} />
      </div>
      <QrStateNotice session={session} />
      {session.status === "active" ? (
        <Link
          href={`/q/${session.shortCode}/checkout`}
          className="mt-4 block rounded-md bg-red-600 px-4 py-4 text-center text-base font-black text-white"
        >
          Enter mock payment info
        </Link>
      ) : (
        <Link
          href={`/orders/guest/${orderNo}`}
          className="mt-4 block rounded-md bg-slate-950 px-4 py-4 text-center text-base font-black text-white"
        >
          View related order
        </Link>
      )}
    </GuestFrame>
  );
}

export function QrCheckoutPage({ code }: { code: string }) {
  const session = getQrSession(code);

  return (
    <GuestFrame title="Mock checkout" subtitle="No PG SDK or real payment request is used. This screen only captures the beta UI contract.">
      <MobileOrderSummary session={session} />
      <CheckoutConfirmPanel session={session} />
      <PaymentMethodMockPanel />
      <section className="mt-4 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black">Payer information mock</h2>
        <div className="mt-3 grid gap-3">
          <MockField label="Payer name" value={session.type === "ask" ? "Guardian payer" : "Guest customer"} />
          <MockField label="Mobile phone" value="010-1234-5678" />
          <MockField label="Receiver name" value="Room guest" />
          <MockField label="Fulfillment" value={session.deliveryMethod === "pickup" ? "Nursery pickup" : "Delivery"} />
        </div>
      </section>
      <PayerValidationMockPanel session={session} />
      <section className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
        <div className="flex justify-between">
          <span className="font-black">Server recalculated mock amount</span>
          <strong className="text-xl text-red-600">{formatCurrency(session.totalAmount)}</strong>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          The final amount must be recalculated from server-side cart snapshots before any future PG handoff.
        </p>
      </section>
      <CheckoutLoadingMockPanel />
      <div className="mt-4 grid gap-2">
        {session.status === "active" ? (
          <Link
            href={`/q/${session.shortCode}/loading`}
            className="rounded-md bg-red-600 px-4 py-4 text-center text-base font-black text-white"
          >
            Continue to loading mock
          </Link>
        ) : (
          <div className="rounded-md bg-amber-100 px-4 py-4 text-center text-base font-black text-amber-900">
            Checkout is blocked for {session.status} QR
          </div>
        )}
        <Link
          href={`/q/${session.shortCode}/failed`}
          className="rounded-md bg-slate-200 px-4 py-3 text-center text-sm font-black text-slate-900"
        >
          Preview mock failed state
        </Link>
      </div>
    </GuestFrame>
  );
}

export function QrLoadingPage({ code }: { code: string }) {
  const session = getQrSession(code);

  return (
    <GuestFrame title="Payment loading" subtitle="Intermediate mock state before deterministic success or failure screens.">
      <MobileOrderSummary session={session} />
      <CheckoutLoadingMockPanel />
      <div className="mt-4 grid gap-2">
        <Link
          href={`/q/${session.shortCode}/success`}
          className="rounded-md bg-red-600 px-4 py-4 text-center text-base font-black text-white"
        >
          Resolve as mock success
        </Link>
        <Link
          href={`/q/${session.shortCode}/failed`}
          className="rounded-md bg-slate-200 px-4 py-3 text-center text-sm font-black text-slate-900"
        >
          Resolve as mock failure
        </Link>
      </div>
    </GuestFrame>
  );
}

export function QrSuccessPage({ code }: { code: string }) {
  const session = getQrSession(code);
  const orderNo = getMockOrderNo(session);

  return (
    <GuestFrame title="Mock payment complete" subtitle="Success state for QR single-use and order creation review.">
      <section className="rounded-md border border-emerald-200 bg-white p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-md bg-emerald-100 text-xl font-black text-emerald-700">
          OK
        </div>
        <h2 className="mt-4 text-2xl font-black">{formatCurrency(session.totalAmount)}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Mock order number {orderNo}. No real PG approval, receipt, notification, or inventory write occurred.
        </p>
        <Link
          href={`/orders/guest/${orderNo}`}
          className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          View order detail
        </Link>
      </section>
      <div className="mt-4">
        <SuccessSnapshotPanel session={session} orderNo={orderNo} />
      </div>
    </GuestFrame>
  );
}

export function QrFailedPage({ code }: { code: string }) {
  const session = getQrSession(code);

  return (
    <GuestFrame title="Mock payment failed" subtitle="Failure state for expired QR, already used QR, and future PG failure handling.">
      <section className="rounded-md border border-red-200 bg-white p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-md bg-red-100 text-xl font-black text-red-700">
          FAIL
        </div>
        <h2 className="mt-4 text-2xl font-black">{session.shortCode}</h2>
        <p className="mt-2 text-sm text-slate-600">{getQrStateMessage(session)}</p>
        <div className="mt-5 grid gap-2">
          <Link
            href={`/q/${session.shortCode}/checkout`}
            className="rounded-md bg-red-600 px-4 py-3 text-center text-sm font-black text-white"
          >
            Return to checkout
          </Link>
          <Link href="/orders/guest" className="rounded-md bg-slate-200 px-4 py-3 text-center text-sm font-black">
            Check an order
          </Link>
        </div>
      </section>
      <div className="mt-4">
        <FailureReasonPanel session={session} />
      </div>
    </GuestFrame>
  );
}

export function QrExpiredPage({ code }: { code: string }) {
  const session = getQrSession(code);
  const orderNo = getMockOrderNo(session);

  return (
    <GuestFrame title="QR expired" subtitle="Expired QR preview. Checkout is blocked and no PG or Firebase lookup is performed.">
      <MobileOrderSummary session={session} />
      <QrConflictPanel lifecycle="expired" />
      <div className="mt-4 grid gap-2">
        <Link
          href={`/orders/guest/${orderNo}`}
          className="rounded-md bg-slate-950 px-4 py-4 text-center text-base font-black text-white"
        >
          View related mock order
        </Link>
        <Link
          href="/tablet/qr"
          className="rounded-md bg-slate-200 px-4 py-3 text-center text-sm font-black text-slate-900"
        >
          Back to tablet QR issue
        </Link>
      </div>
    </GuestFrame>
  );
}

export function QrStatusPage({ code }: { code: string }) {
  const session = getQrSession(code);
  const lifecycle = getQrLifecycleState(session);
  const orderNo = getMockOrderNo(session);

  return (
    <GuestFrame
      title="QR status"
      subtitle="State-specific QR preview for active, expired, used, canceled, and payment-failed mock flows."
    >
      <QrStatusPanel session={session} lifecycle={lifecycle} />
      <QrConflictPanel lifecycle={lifecycle} />
      <div className="mt-4 grid gap-2">
        {lifecycle === "active" ? (
          <Link
            href={`/q/${session.shortCode}/checkout`}
            className="rounded-md bg-red-600 px-4 py-4 text-center font-black text-white"
          >
            Continue checkout mock
          </Link>
        ) : (
          <Link
            href={`/orders/guest/${orderNo}`}
            className="rounded-md bg-slate-950 px-4 py-4 text-center font-black text-white"
          >
            View related order
          </Link>
        )}
        <Link href={`/q/${session.shortCode}/failed`} className="rounded-md bg-slate-200 px-4 py-3 text-center text-sm font-black">
          Open failure preview
        </Link>
      </div>
    </GuestFrame>
  );
}

export function GuestOrderLookupPage() {
  const orders = getGuestOrders();

  return (
    <GuestFrame title="Guest order lookup" subtitle="Mock lookup by order number and masked phone. No Auth account or customer DB is connected.">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black">Lookup input mock</h2>
        <div className="mt-3 grid gap-3">
          <MockField label="Order number" value="A5-20260519-001" />
          <MockField label="Mobile phone" value="010-****-2388" />
        </div>
        <Link
          href="/orders/guest/A5-20260519-001"
          className="mt-4 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white"
        >
          Open mock order
        </Link>
      </section>
      <div className="mt-4">
        <GuestLookupFilterPanel />
      </div>
      <div className="mt-4">
        <OrderLookupMismatchPanel />
      </div>
      <div className="mt-4">
        <GuestSummaryGrid summaries={getGuestOrderSummaries()} />
      </div>
      <section className="mt-4 grid gap-2">
        {orders.length ? (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/guest/${order.orderNo}`}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <span>
                <strong>{order.orderNo}</strong>
                <span className="ml-2 text-slate-500">{order.customerPhoneMasked}</span>
              </span>
              <StatusBadge status={order.status} />
            </Link>
          ))
        ) : (
          <GuestEmptyState
            title="No matching orders"
            detail="This empty state is reserved for order number and phone filters that return no mock records."
          />
        )}
      </section>
      <div className="mt-4">
        <GuestVerificationPanel />
      </div>
      <div className="mt-4">
        <GuestRouteMatrix />
      </div>
    </GuestFrame>
  );
}

export function GuestOrderDetailPage({ orderNo }: { orderNo: string }) {
  const detail = findGuestOrder(orderNo);

  if (!detail) {
    return (
      <GuestFrame title="Order not found" subtitle="Unknown guest order route rendered as a safe mock error state.">
        <GuestErrorState
          title="No mock order matched"
          detail="The requested order number is not in the mock dataset. No customer lookup, Auth, or Firestore query was made."
        />
        <div className="mt-4">
          <GuestVerificationPanel />
        </div>
      </GuestFrame>
    );
  }

  const { order, items, payment } = detail;

  return (
    <GuestFrame title="Order detail" subtitle="Guest order result with delivery, pickup, payment, and refund request mock sections.">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500">Order number</p>
            <h2 className="text-2xl font-black">{order.orderNo}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {order.customerName} / {order.customerPhoneMasked}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </div>
        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
          <DetailRow label="Fulfillment" value={order.deliveryMethod === "pickup" ? "Nursery pickup" : "Delivery"} />
          <DetailRow label="Paid at" value={order.paidAt ? formatDateTime(order.paidAt) : "Not paid"} />
          <DetailRow label="Item count" value={`${getSessionItemCount(getQrSessionByOrder(order))} units`} />
          <DetailRow label="Total" value={formatCurrency(order.totalAmount)} strong />
        </div>
      </section>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <OrderStatusSteps order={order} />
        <PaymentDetailPanel payment={payment} />
        <RefundRequestMockPanel order={order} />
        <Link
          href={`/orders/guest/${order.orderNo}/refund`}
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-black text-red-800"
        >
          Open refund request mock page
        </Link>
      </div>
    </GuestFrame>
  );
}

export function GuestRefundRequestPage({ orderNo }: { orderNo: string }) {
  const detail = findGuestOrder(orderNo);

  if (!detail) {
    return (
      <GuestFrame title="Refund request unavailable" subtitle="Unknown order rendered as a safe refund error state.">
        <GuestErrorState
          title="No mock order matched"
          detail="Refund request cannot be previewed because the order number is not in the mock dataset."
        />
        <div className="mt-4">
          <GuestVerificationPanel />
        </div>
      </GuestFrame>
    );
  }

  const { order, payment } = detail;

  return (
    <GuestFrame title="Refund request mock" subtitle="No real refund, PG cancel, settlement hold, or notification is executed.">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500">Order number</p>
            <h2 className="text-2xl font-black">{order.orderNo}</h2>
            <p className="mt-1 text-sm text-slate-600">{order.customerPhoneMasked}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </section>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PaymentDetailPanel payment={payment} />
        <RefundRequestMockPanel order={order} />
      </div>
      <section className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
        <h3 className="font-black text-amber-900">Admin approval required</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          This route only previews a customer-facing refund request. Production requires PG cancellation rules,
          inventory restoration, settlement hold, and operator audit before any real action.
        </p>
      </section>
    </GuestFrame>
  );
}

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-xl" : ""}`}>
      <span className={strong ? "font-black" : "text-sm text-slate-600"}>{label}</span>
      <strong className={strong ? "text-red-600" : "text-slate-950"}>{value}</strong>
    </div>
  );
}

function getQrSessionByOrder(order: Order): QrPaymentSession {
  const matchingSession = getQrPreviewSessions().find((session) => session.id === order.qrSessionId);

  return matchingSession ?? getQrSession("SANHO701");
}
