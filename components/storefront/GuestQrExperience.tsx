import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { productProfileById } from "@/data/mockShopContent";
import { getPaymentReadiness } from "@/lib/payments/paymentService";
import { mockRepositories } from "@/lib/repositories/mock";
import { repositoryData } from "@/lib/repositories/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { Order, OrderItem, QrPaymentSession } from "@/types/commerce";

const safetyBadges = ["mock/test beta", "Firebase 연결 없음", "PG 연결 없음", "실결제 아님"];

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
            <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-300">Sanho closed mall QR</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {safetyBadges.map((badge) => (
                <span key={badge} className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-950">
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-2 border-t border-white/10 bg-white/5 p-3">
            <Link href="/orders/guest" className="rounded-md bg-white px-3 py-2 text-center text-sm font-black text-slate-950">
              주문조회
            </Link>
            <Link href="/products" className="rounded-md border border-white/20 px-3 py-2 text-center text-sm font-black text-white">
              쇼핑몰 보기
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
      title: "결제 진행 가능 mock",
      body: "아직 만료되지 않은 QR입니다. 실제 운영에서는 서버에서 만료와 1회 사용 여부를 다시 검증해야 합니다.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    },
    paid: {
      title: "이미 사용된 QR mock",
      body: "이미 결제가 완료된 QR로 표시합니다. 재결제 대신 비회원 주문조회로 안내해야 합니다.",
      className: "border-blue-200 bg-blue-50 text-blue-950",
    },
    expired: {
      title: "만료된 QR mock",
      body: "결제 진입을 차단하고 태블릿에서 새 QR을 생성하도록 안내합니다.",
      className: "border-red-200 bg-red-50 text-red-950",
    },
    cancelled: {
      title: "취소된 QR mock",
      body: "운영자 취소 또는 위험 상태로 결제 진입을 차단하는 화면입니다.",
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

function MobileOrderSummary({ session }: { session: QrPaymentSession }) {
  return (
    <section className="rounded-md bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">QR code</p>
          <h2 className="text-3xl font-black">{session.shortCode}</h2>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {session.nurseryId} / {session.roomId} / 만료 {formatDateTime(session.expiresAt)}
      </p>
      <div className="mt-4 grid gap-3">
        {session.items.map((item) => {
          const profile = productProfileById[item.productId];
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
        <span className="font-black">총 결제 예정</span>
        <strong className="text-2xl text-rose-600">{formatCurrency(session.totalAmount)}</strong>
      </div>
    </section>
  );
}

function CheckoutFormMock({ session }: { session: QrPaymentSession }) {
  const rows = [
    ["결제자 이름", "김보호"],
    ["휴대폰번호", "010-1234-5678"],
    ["수령자 이름", "박산모"],
    ["수령 방식", session.deliveryMethod === "pickup" ? "조리원 현장수령" : "택배배송"],
  ];

  return (
    <section className="rounded-md bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black">비회원 결제 정보 mock</h2>
      <div className="mt-3 grid gap-3">
        {rows.map(([label, value]) => (
          <label key={label} className="grid gap-1 text-sm font-bold text-slate-700">
            {label}
            <input readOnly value={value} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-base font-semibold text-slate-700" />
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">실제 개인정보 저장, 본인인증, PG 승인, 알림톡 발송은 연결하지 않습니다.</p>
    </section>
  );
}

function PaymentReadinessPanel({ amount }: { amount: number }) {
  const readiness = getPaymentReadiness();
  const missingKeys = readiness.missingKeys.length ? readiness.missingKeys.join(", ") : "없음";

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-600">PG readiness</p>
          <h2 className="mt-1 text-xl font-black">PG 모듈 연결 준비 상태</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            결제 버튼은 현재 mock 흐름을 유지합니다. PG 키 수령 후에는 서버 confirm endpoint에서 금액을 재계산한 뒤 provider adapter를 연결해야 합니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${readiness.ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {readiness.label}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">결제 예정 금액</p>
          <p className="mt-1 text-lg font-black text-slate-950">{formatCurrency(amount)}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">현재 provider</p>
          <p className="mt-1 font-black text-slate-950">{readiness.provider}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">누락 키</p>
          <p className="mt-1 break-words font-black text-slate-950">{missingKeys}</p>
        </div>
      </div>
      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-900">
        실제 승인, 취소, 환불, 웹훅 처리는 아직 차단되어 있습니다. Cloudflare static export 화면에서는 PG secret을 사용할 수 없으므로 Functions, Cloud Run, Workers 중 서버 실행 위치가 필요합니다.
      </div>
    </section>
  );
}

function OrderTimeline({ order }: { order: Order }) {
  const steps = [
    { label: "QR 생성", active: true },
    { label: "mock 결제", active: order.status !== "pending_payment" && order.status !== "cancelled" },
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

function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <section className="grid gap-3">
      {items.map((item) => {
        const profile = Object.values(productProfileById).find((candidate) => candidate.displayName === item.productName || candidate.productId === item.id);
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
  const session = repositoryData(await mockRepositories.qrSessions.getQrSessionByShortCode(code));
  const canCheckout = session.status === "active";

  return (
    <GuestFrame title="QR 주문 확인" subtitle="고객이 모바일에서 보는 결제 진입 화면입니다. 상품, 만료, 수령방식, 결제 차단 상태를 먼저 확인합니다.">
      <div className="grid gap-4">
        <QrStateNotice session={session} />
        <MobileOrderSummary session={session} />
        <Link
          href={canCheckout ? `/q/${session.shortCode}/checkout` : `/q/${session.shortCode}/status`}
          className={`block rounded-md px-4 py-4 text-center text-base font-black ${canCheckout ? "bg-rose-600 text-white" : "bg-slate-950 text-white"}`}
        >
          {canCheckout ? "mock 결제 정보 입력" : "QR 상태 확인"}
        </Link>
      </div>
    </GuestFrame>
  );
}

export async function QrCheckoutPage({ code }: { code: string }) {
  const session = repositoryData(await mockRepositories.qrSessions.getQrSessionByShortCode(code));
  const canCheckout = session.status === "active";

  return (
    <GuestFrame title="결제 정보 입력" subtitle="실제 PG 호출 없이 결제 전 확인 UI만 제공합니다.">
      <div className="grid gap-4">
        <MobileOrderSummary session={session} />
        <CheckoutFormMock session={session} />
        <PaymentReadinessPanel amount={session.totalAmount} />
        <section className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex justify-between">
            <span className="font-black">서버 재계산 대상 금액</span>
            <strong className="text-xl text-rose-600">{formatCurrency(session.totalAmount)}</strong>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">운영 전환 시 클라이언트 금액을 신뢰하지 않고 QR snapshot 기준으로 서버에서 재계산해야 합니다.</p>
        </section>
        <div className="grid gap-2">
          <Link href={canCheckout ? `/q/${session.shortCode}/loading` : `/q/${session.shortCode}/status`} className="rounded-md bg-rose-600 px-4 py-4 text-center text-base font-black text-white">
            {canCheckout ? "PG 모듈 연결 지점으로 진행(mock)" : "결제 차단 상태 보기"}
          </Link>
          <Link href={`/q/${session.shortCode}/failed`} className="rounded-md bg-slate-200 px-4 py-3 text-center text-sm font-black text-slate-900">
            실패 화면 미리보기
          </Link>
        </div>
      </div>
    </GuestFrame>
  );
}

export async function QrLoadingPage({ code }: { code: string }) {
  const session = repositoryData(await mockRepositories.qrSessions.getQrSessionByShortCode(code));

  return (
    <GuestFrame title="mock 결제 확인 중" subtitle="PG 승인 대기처럼 보이지만 실제 요청은 없습니다.">
      <div className="rounded-md bg-white p-5 text-center shadow-sm">
        <div className="mx-auto h-16 w-16 rounded-full border-8 border-slate-200 border-t-rose-600" />
        <h2 className="mt-5 text-2xl font-black">{formatCurrency(session.totalAmount)}</h2>
        <p className="mt-2 text-sm text-slate-600">결제 승인, 웹훅, 주문 생성은 모두 mock 상태입니다.</p>
        <div className="mt-5 grid gap-2">
          <Link href={`/q/${session.shortCode}/success`} className="rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white">성공 mock 보기</Link>
          <Link href={`/q/${session.shortCode}/failed`} className="rounded-md bg-slate-200 px-4 py-3 text-sm font-black text-slate-900">실패 mock 보기</Link>
        </div>
      </div>
    </GuestFrame>
  );
}

export async function QrSuccessPage({ code }: { code: string }) {
  const session = repositoryData(await mockRepositories.qrSessions.getQrSessionByShortCode(code));

  return (
    <GuestFrame title="mock 결제 완료" subtitle="QR 재사용 차단과 주문 원장 기록이 필요한 성공 상태입니다.">
      <section className="rounded-md border border-emerald-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">OK</div>
        <h2 className="mt-4 text-3xl font-black">{formatCurrency(session.totalAmount)}</h2>
        <p className="mt-2 text-sm text-slate-600">운영 PG 승인 내역이 아닌 mock 완료 화면입니다.</p>
        <Link href="/orders/guest/A5-20260519-001" className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">주문 상세 보기</Link>
      </section>
    </GuestFrame>
  );
}

export async function QrFailedPage({ code }: { code: string }) {
  const session = repositoryData(await mockRepositories.qrSessions.getQrSessionByShortCode(code));

  return (
    <GuestFrame title="mock 결제 실패" subtitle="만료, 이미 사용, 취소, 승인 실패 상태를 고객에게 안전하게 안내합니다.">
      <div className="grid gap-4">
        <QrStateNotice session={session} />
        <section className="rounded-md border border-red-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-xl font-black text-red-700">FAIL</div>
          <h2 className="mt-4 text-2xl font-black">{session.shortCode}</h2>
          <p className="mt-2 text-sm text-slate-600">운영 PG 오류가 아닌 mock 실패 화면입니다.</p>
          <Link href={`/q/${session.shortCode}/status`} className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">QR 상태 보기</Link>
        </section>
      </div>
    </GuestFrame>
  );
}

export async function QrExpiredPage({ code }: { code: string }) {
  const session = repositoryData(await mockRepositories.qrSessions.getQrSessionByShortCode(code));

  return (
    <GuestFrame title="QR 만료" subtitle="만료된 QR은 결제 진입을 차단하고 새 QR 생성을 안내합니다.">
      <div className="grid gap-4">
        <QrStateNotice session={{ ...session, status: "expired" }} />
        <MobileOrderSummary session={session} />
        <Link href="/tablet/qr" className="block rounded-md bg-slate-950 px-4 py-4 text-center text-base font-black text-white">태블릿에서 새 QR 생성</Link>
      </div>
    </GuestFrame>
  );
}

export async function QrStatusPage({ code }: { code: string }) {
  const session = repositoryData(await mockRepositories.qrSessions.getQrSessionByShortCode(code));

  return (
    <GuestFrame title="QR 상태" subtitle="active, paid, expired, cancelled 상태별 고객 안내를 한 화면에서 확인합니다.">
      <div className="grid gap-4">
        <QrStateNotice session={session} />
        <MobileOrderSummary session={session} />
      </div>
    </GuestFrame>
  );
}

export function GuestOrderLookupPage() {
  return (
    <GuestFrame title="비회원 주문조회" subtitle="주문번호와 휴대폰번호 mock 입력 UI로 주문 상세 결과를 확인합니다.">
      <section className="rounded-md bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black">주문조회 mock 입력</h2>
        <div className="mt-3 grid gap-3">
          {[
            ["주문번호", "A5-20260519-001"],
            ["휴대폰번호", "010-****-2388"],
          ].map(([label, value]) => (
            <label key={label} className="grid gap-1 text-sm font-bold text-slate-700">
              {label}
              <input readOnly value={value} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-base font-semibold" />
            </label>
          ))}
        </div>
        <Link href="/orders/guest/A5-20260519-001" className="mt-4 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">mock 주문 조회</Link>
      </section>
      <section className="mt-4 rounded-md bg-amber-50 p-4">
        <p className="text-sm font-black text-amber-900">개인정보 정책 미확정</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">운영 전 비회원 주문조회 인증 방식과 개인정보 노출 범위는 사람 승인 필요 항목입니다.</p>
      </section>
    </GuestFrame>
  );
}

export async function GuestOrderDetailPage({ orderNo }: { orderNo: string }) {
  const { order, items } = repositoryData(await mockRepositories.orders.getOrderByOrderNo(orderNo));

  return (
    <GuestFrame title="주문 상세" subtitle="비회원 고객이 모바일에서 확인하는 주문 결과 mock 화면입니다.">
      <div className="grid gap-4">
        <section className="rounded-md bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">order no</p>
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
        <OrderItems items={items} />
        <Link href={`/orders/guest/${order.orderNo}/refund`} className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-black text-red-700">환불 요청 mock 보기</Link>
      </div>
    </GuestFrame>
  );
}

export async function GuestRefundRequestPage({ orderNo }: { orderNo: string }) {
  const { order, items } = repositoryData(await mockRepositories.orders.getOrderByOrderNo(orderNo));

  return (
    <GuestFrame title="환불 요청 mock" subtitle="실제 PG 취소, 환불 승인, 정산 보류, 알림톡 발송은 실행하지 않습니다.">
      <div className="grid gap-4">
        <section className="rounded-md bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">refund request</p>
              <h2 className="text-2xl font-black">{order.orderNo}</h2>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </section>
        <OrderItems items={items} />
        <section className="rounded-md border border-red-200 bg-red-50 p-4 text-red-950">
          <h2 className="font-black">운영 환불 차단</h2>
          <p className="mt-2 text-sm leading-6">이 화면은 고객용 환불 요청 UI 예약입니다. PG 취소, 환불 승인, 정산 보류, 고객 알림은 모두 blocker로 유지합니다.</p>
        </section>
      </div>
    </GuestFrame>
  );
}
