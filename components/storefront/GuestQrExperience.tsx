import Link from "next/link";
import { GuestCheckoutClient } from "@/components/guest/GuestCheckoutClient";
import { PgReturnConfirmClient } from "@/components/guest/PgReturnConfirmClient";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockCompanies } from "@/data/mockCompanies";
import { COMPANY_GROUP_PURCHASE_MESSAGE, groupCartItemsByCompany } from "@/lib/payments/companyPaymentGroups";
import {
  getLiveOrderByOrderNo,
  getLiveQrSessionByShortCode,
  getLiveStorefrontContent,
} from "@/lib/repositories/liveCommerceRepository";
import type { StorefrontContent } from "@/lib/repositories/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { Order, OrderItem, QrPaymentSession } from "@/types/commerce";

function GuestFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f5f1eb] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-md md:max-w-4xl">
        <header className="overflow-hidden rounded-md bg-slate-950 text-white shadow-xl">
          <div className="p-5 md:p-6">
            <p className="text-xs font-black tracking-[0.16em] text-rose-300">with.commerce</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{subtitle}</p>
          </div>
          <nav className="grid grid-cols-2 gap-2 border-t border-white/10 bg-white/5 p-3">
            <Link href="/orders/guest" className="rounded-md bg-white px-3 py-2 text-center text-sm font-black text-slate-950">
              주문조회
            </Link>
            <Link href="/tablet/login" className="rounded-md border border-white/20 px-3 py-2 text-center text-sm font-black text-white">
              객실 쇼핑
            </Link>
          </nav>
        </header>
        <section className="mt-4">{children}</section>
      </div>
    </main>
  );
}

function QrStateNotice({ session }: { session: QrPaymentSession }) {
  const stateCopy: Record<QrPaymentSession["status"], { title: string; body: string; className: string }> = {
    active: {
      title: "결제 진행 가능",
      body: "상품, 금액, 수령 방식을 확인한 뒤 결제를 진행해 주세요.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    },
    paid: {
      title: "이미 결제된 QR",
      body: "주문번호로 주문 상태를 확인할 수 있습니다.",
      className: "border-blue-200 bg-blue-50 text-blue-950",
    },
    expired: {
      title: "만료된 QR",
      body: "태블릿에서 새 결제 QR을 다시 생성해 주세요.",
      className: "border-red-200 bg-red-50 text-red-950",
    },
    cancelled: {
      title: "취소된 QR",
      body: "이 QR로는 결제를 진행할 수 없습니다.",
      className: "border-amber-200 bg-amber-50 text-amber-950",
    },
  };
  const copy = stateCopy[session.status];

  return (
    <section className={`rounded-md border p-4 ${copy.className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6">{copy.body}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>
    </section>
  );
}

function MobileOrderSummary({ session, content }: { session: QrPaymentSession; content?: StorefrontContent }) {
  const paymentGroups = groupCartItemsByCompany(session.items, mockCompanies);

  return (
    <section className="rounded-md bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">QR 코드</p>
          <h2 className="text-3xl font-black">{session.shortCode}</h2>
          <p className="mt-2 text-sm text-slate-600">만료 {formatDateTime(session.expiresAt)}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-950">
        <p className="font-black">{COMPANY_GROUP_PURCHASE_MESSAGE}</p>
      </div>
      <div className="mt-4 grid gap-3">
        {session.items.map((item) => {
          const profile = content?.productProfiles.find((candidate) => candidate.productId === item.productId);
          return (
            <article key={`${item.productId}-${item.optionName}`} className="grid grid-cols-[72px_1fr] gap-3 rounded-md bg-slate-50 p-3">
              <div className="overflow-hidden rounded-md bg-white">
                {profile ? <img src={profile.imageUrl} alt={profile.displayName} className="aspect-square w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-rose-600">{profile?.brand ?? item.companyId}</p>
                <p className="mt-1 font-black">{profile?.displayName ?? item.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개</p>
                <p className="mt-2 text-right font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
        <span className="font-black">총 결제금액</span>
        <strong className="text-2xl text-rose-600">{formatCurrency(session.totalAmount)}</strong>
      </div>
    </section>
  );
}

function OrderTimeline({ order }: { order: Order }) {
  const steps = [
    { label: "QR 생성", active: true },
    { label: "결제 확인", active: order.status !== "pending_payment" && order.status !== "cancelled" },
    { label: order.deliveryMethod === "pickup" ? "현장수령 준비" : "배송 준비", active: ["ready_for_pickup", "shipping", "delivered", "picked_up"].includes(order.status) },
    { label: "완료", active: ["delivered", "picked_up"].includes(order.status) },
  ];

  return (
    <section className="rounded-md bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black">주문 진행 상태</h2>
      <div className="mt-4 grid gap-2">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3">
            <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${step.active ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500"}`}>
              {index + 1}
            </span>
            <span className={step.active ? "font-black text-slate-950" : "font-semibold text-slate-500"}>{step.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrderItems({ items, content }: { items: OrderItem[]; content?: StorefrontContent }) {
  return (
    <section className="grid gap-3">
      {items.map((item) => {
        const profile = content?.productProfiles.find((candidate) => candidate.displayName === item.productName || candidate.productId === item.id);
        return (
          <article key={item.id} className="rounded-md bg-white p-4 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-black">{profile?.displayName ?? item.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개 / {item.deliveryStatus}</p>
              </div>
              <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export async function QrLandingPage({ code }: { code: string }) {
  const [{ data: session }, content] = await Promise.all([getLiveQrSessionByShortCode(code), getLiveStorefrontContent()]);
  const canCheckout = session.status === "active";

  return (
    <GuestFrame title="QR 주문 확인" subtitle="상품, 금액, 수령 방식을 확인하고 결제를 진행합니다.">
      <div className="grid gap-4">
        <QrStateNotice session={session} />
        <MobileOrderSummary session={session} content={content} />
        <Link
          href={canCheckout ? `/q/${session.shortCode}/checkout` : `/q/${session.shortCode}/status`}
          className={`block rounded-md px-4 py-4 text-center text-base font-black ${canCheckout ? "bg-rose-600 text-white" : "bg-slate-950 text-white"}`}
        >
          {canCheckout ? "결제 정보 입력" : "QR 상태 확인"}
        </Link>
      </div>
    </GuestFrame>
  );
}

export async function QrCheckoutPage({ code }: { code: string }) {
  const [{ data: session }, content] = await Promise.all([getLiveQrSessionByShortCode(code), getLiveStorefrontContent()]);

  return (
    <GuestFrame title="결제 정보 입력" subtitle="결제자 정보와 주문 내용을 확인합니다.">
      <div className="grid gap-4">
        <MobileOrderSummary session={session} content={content} />
        <GuestCheckoutClient session={session} dataSource="qr_checkout" />
      </div>
    </GuestFrame>
  );
}

export async function QrLoadingPage({ code }: { code: string }) {
  const { data: session } = await getLiveQrSessionByShortCode(code);

  return (
    <GuestFrame title="결제 확인 중" subtitle="결제 결과를 확인하고 있습니다.">
      <div className="rounded-md bg-white p-5 text-center shadow-sm">
        <div className="mx-auto h-16 w-16 rounded-full border-8 border-slate-200 border-t-rose-600" />
        <h2 className="mt-5 text-2xl font-black">{formatCurrency(session.totalAmount)}</h2>
        <div className="mt-5 grid gap-2">
          <Link href={`/q/${session.shortCode}/success`} className="rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white">결제 완료 확인</Link>
          <Link href={`/q/${session.shortCode}/failed`} className="rounded-md bg-slate-200 px-4 py-3 text-sm font-black text-slate-900">다시 확인</Link>
        </div>
      </div>
    </GuestFrame>
  );
}

export async function QrSuccessPage({ code }: { code: string }) {
  const { data: session } = await getLiveQrSessionByShortCode(code);

  return (
    <GuestFrame title="결제 완료" subtitle="주문 접수가 완료되었습니다.">
      <section className="rounded-md border border-emerald-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">완료</div>
        <h2 className="mt-4 text-3xl font-black">{formatCurrency(session.totalAmount)}</h2>
        <PgReturnConfirmClient session={session} />
        <Link href="/orders/guest" className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          주문조회
        </Link>
      </section>
    </GuestFrame>
  );
}

export async function QrFailedPage({ code }: { code: string }) {
  const { data: session } = await getLiveQrSessionByShortCode(code);

  return (
    <GuestFrame title="결제 확인 필요" subtitle="결제가 완료되지 않았습니다. 다시 시도하거나 조리원에 문의해 주세요.">
      <div className="grid gap-4">
        <QrStateNotice session={session} />
        <section className="rounded-md border border-red-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-lg font-black text-red-700">확인</div>
          <h2 className="mt-4 text-2xl font-black">{session.shortCode}</h2>
          <Link href={`/q/${session.shortCode}/checkout`} className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
            다시 결제하기
          </Link>
        </section>
      </div>
    </GuestFrame>
  );
}

export async function QrExpiredPage({ code }: { code: string }) {
  const [{ data: session }, content] = await Promise.all([getLiveQrSessionByShortCode(code), getLiveStorefrontContent()]);

  return (
    <GuestFrame title="QR 만료" subtitle="새 결제 QR을 다시 생성해 주세요.">
      <div className="grid gap-4">
        <QrStateNotice session={{ ...session, status: "expired" }} />
        <MobileOrderSummary session={session} content={content} />
      </div>
    </GuestFrame>
  );
}

export async function QrStatusPage({ code }: { code: string }) {
  const [{ data: session }, content] = await Promise.all([getLiveQrSessionByShortCode(code), getLiveStorefrontContent()]);

  return (
    <GuestFrame title="QR 상태" subtitle="QR과 주문 상태를 확인합니다.">
      <div className="grid gap-4">
        <QrStateNotice session={session} />
        <MobileOrderSummary session={session} content={content} />
      </div>
    </GuestFrame>
  );
}

export function GuestOrderLookupPage() {
  return (
    <GuestFrame title="비회원 주문조회" subtitle="주문번호와 휴대폰번호로 주문 상태를 확인합니다.">
      <section className="rounded-md bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">주문조회 입력</h2>
        <div className="mt-3 grid gap-3">
          {[
            ["주문번호", "A5-20260519-001"],
            ["휴대폰번호", "010-****-2388"],
          ].map(([label, value]) => (
            <label key={label} className="grid gap-1 text-sm font-bold text-slate-700">
              {label}
              <input defaultValue={value} className="rounded-md border border-slate-200 px-3 py-3 text-base font-semibold" />
            </label>
          ))}
        </div>
        <Link href="/orders/guest/A5-20260519-001" className="mt-4 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
          주문 조회
        </Link>
      </section>
    </GuestFrame>
  );
}

export async function GuestOrderDetailPage({ orderNo }: { orderNo: string }) {
  const [{ data }, content] = await Promise.all([getLiveOrderByOrderNo(orderNo), getLiveStorefrontContent()]);
  const { order, items } = data;

  return (
    <GuestFrame title="주문 상세" subtitle="주문 결과와 배송 상태를 확인합니다.">
      <div className="grid gap-4">
        <section className="rounded-md bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">주문번호</p>
              <h2 className="text-2xl font-black">{order.orderNo}</h2>
              <p className="mt-1 text-sm text-slate-600">{order.customerName} / {order.customerPhoneMasked}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
            <div className="flex justify-between"><span className="text-sm text-slate-600">수령방식</span><strong>{order.deliveryMethod === "pickup" ? "현장수령" : "택배배송"}</strong></div>
            <div className="flex justify-between"><span className="text-sm text-slate-600">결제시각</span><strong>{order.paidAt ? formatDateTime(order.paidAt) : "결제 전"}</strong></div>
            <div className="flex justify-between text-xl"><span className="font-black">총 결제금액</span><strong className="text-rose-600">{formatCurrency(order.totalAmount)}</strong></div>
          </div>
        </section>
        <OrderTimeline order={order} />
        <OrderItems items={items} content={content} />
        <Link href={`/orders/guest/${order.orderNo}/refund`} className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-black text-red-700">
          취소/환불 문의
        </Link>
      </div>
    </GuestFrame>
  );
}

export async function GuestRefundRequestPage({ orderNo }: { orderNo: string }) {
  const [{ data }, content] = await Promise.all([getLiveOrderByOrderNo(orderNo), getLiveStorefrontContent()]);
  const { order, items } = data;

  return (
    <GuestFrame title="취소/환불 문의" subtitle="주문번호와 상품을 확인한 뒤 문의 내용을 남겨 주세요.">
      <div className="grid gap-4">
        <section className="rounded-md bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">주문번호</p>
              <h2 className="text-2xl font-black">{order.orderNo}</h2>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </section>
        <OrderItems items={items} content={content} />
        <section className="rounded-md border border-red-200 bg-white p-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            문의 내용
            <textarea className="min-h-32 rounded-md border border-slate-200 px-3 py-3" placeholder="취소 또는 환불 사유를 입력하세요." />
          </label>
          <button type="button" className="mt-4 w-full rounded-md bg-red-600 px-4 py-3 text-sm font-black text-white">
            문의 접수
          </button>
        </section>
      </div>
    </GuestFrame>
  );
}
