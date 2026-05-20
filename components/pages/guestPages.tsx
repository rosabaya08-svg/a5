import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockRepositories } from "@/lib/repositories/mock";
import { repositoryData } from "@/lib/repositories/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import type { QrPaymentSession } from "@/types/commerce";

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
    <main className="min-h-screen bg-[#f7f4ef] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-md md:max-w-3xl">
        <header className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="bg-slate-950 p-5 text-white">
            <p className="text-sm font-bold">SANHO QR CHECKOUT</p>
            <h1 className="mt-2 text-3xl font-black">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-200">{subtitle}</p>
          </div>
          <nav className="flex gap-2 p-3">
            <Link href="/orders/guest" className="flex-1 rounded-md bg-slate-950 px-3 py-2 text-center text-sm font-black text-white">
              주문조회
            </Link>
            <Link href="/tablet/products" className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-center text-sm font-black">
              쇼핑몰 보기
            </Link>
          </nav>
        </header>
        <section className="mt-4">{children}</section>
      </div>
    </main>
  );
}

function MobileOrderSummary({ session }: { session: QrPaymentSession }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">QR 코드</p>
          <h2 className="text-2xl font-black">{session.shortCode}</h2>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {session.nurseryId} / {session.roomId} / 만료 {formatDateTime(session.expiresAt)}
      </p>
      <div className="mt-4 grid gap-3">
        {session.items.map((item) => (
          <article key={`${item.productId}-${item.optionName}`} className="rounded-md bg-slate-50 p-3">
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-black">{item.productName}</p>
                <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개</p>
              </div>
              <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 flex justify-between border-t border-slate-100 pt-4">
        <span className="font-black">총 결제 예정</span>
        <strong className="text-2xl text-red-600">{formatCurrency(session.totalAmount)}</strong>
      </div>
    </section>
  );
}

export async function QrLandingPage({ code }: { code: string }) {
  const session = repositoryData(
    await mockRepositories.qrSessions.getQrSessionByShortCode(code),
  );

  return (
    <GuestFrame title="QR 주문 확인" subtitle="모바일 결제 진입 전 상품, 수령방식, 만료 시간을 확인합니다.">
      <MobileOrderSummary session={session} />
      <section className="mt-3 rounded-md bg-emerald-50 p-4">
        <p className="text-sm font-black text-emerald-900">폐쇄몰 전용 안내</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          회원가입 없이 결제자 정보와 수령 정보를 입력하는 mock 화면입니다. 실제 결제 승인 요청은 발생하지 않습니다.
        </p>
      </section>
      <Link href={`/q/${session.shortCode}/checkout`} className="mt-4 block rounded-md bg-red-600 px-4 py-4 text-center text-base font-black text-white">
        mock 결제 정보 입력
      </Link>
    </GuestFrame>
  );
}

export async function QrCheckoutPage({ code }: { code: string }) {
  const session = repositoryData(
    await mockRepositories.qrSessions.getQrSessionByShortCode(code),
  );

  return (
    <GuestFrame title="결제 정보 입력" subtitle="실제 PG 호출 없이 모바일 결제 폼 UI만 제공합니다.">
      <MobileOrderSummary session={session} />
      <section className="mt-4 rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black">비회원 정보 mock</h2>
        <div className="mt-3 grid gap-3">
          {[
            ["결제자 이름", "김보호"],
            ["휴대폰번호", "010-1234-5678"],
            ["수령자 이름", "박산모"],
            ["수령 방식", session.deliveryMethod === "pickup" ? "조리원 현장수령" : "택배배송"],
          ].map(([label, value]) => (
            <label key={label} className="grid gap-1 text-sm font-bold text-slate-700">
              {label}
              <input
                readOnly
                value={value}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-base font-semibold text-slate-700"
              />
            </label>
          ))}
        </div>
      </section>
      <section className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
        <div className="flex justify-between">
          <span className="font-black">서버 재계산 대상 금액</span>
          <strong className="text-xl text-red-600">{formatCurrency(session.totalAmount)}</strong>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          프론트 금액은 신뢰하지 않고 서버 snapshot 기준으로 재계산해야 한다는 정책을 표시합니다.
        </p>
      </section>
      <div className="mt-4 grid gap-2">
        <Link href={`/q/${session.shortCode}/success`} className="rounded-md bg-red-600 px-4 py-4 text-center text-base font-black text-white">
          mock 결제 승인
        </Link>
        <Link href={`/q/${session.shortCode}/failed`} className="rounded-md bg-slate-200 px-4 py-3 text-center text-sm font-black text-slate-900">
          mock 실패 화면 보기
        </Link>
      </div>
    </GuestFrame>
  );
}

export async function QrSuccessPage({ code }: { code: string }) {
  const session = repositoryData(
    await mockRepositories.qrSessions.getQrSessionByShortCode(code),
  );

  return (
    <GuestFrame title="mock 결제 완료" subtitle="QR 재사용 차단과 주문 원장 기록이 필요한 상태입니다.">
      <section className="rounded-md border border-emerald-200 bg-white p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">
          OK
        </div>
        <h2 className="mt-4 text-2xl font-black">{formatCurrency(session.totalAmount)}</h2>
        <p className="mt-2 text-sm text-slate-600">운영 PG 승인 내역이 아닌 mock 완료 화면입니다.</p>
        <Link href="/orders/guest/A5-20260519-001" className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
          주문 상세 보기
        </Link>
      </section>
    </GuestFrame>
  );
}

export async function QrFailedPage({ code }: { code: string }) {
  const session = repositoryData(
    await mockRepositories.qrSessions.getQrSessionByShortCode(code),
  );

  return (
    <GuestFrame title="mock 결제 실패" subtitle="실패 사유와 재시도 가능 여부를 구분하는 화면입니다.">
      <section className="rounded-md border border-red-200 bg-white p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-xl font-black text-red-700">
          FAIL
        </div>
        <h2 className="mt-4 text-2xl font-black">{session.shortCode}</h2>
        <p className="mt-2 text-sm text-slate-600">운영 PG 오류가 아닌 mock 실패 화면입니다.</p>
        <Link href={`/q/${session.shortCode}/checkout`} className="mt-5 inline-flex rounded-md bg-red-600 px-4 py-3 text-sm font-black text-white">
          다시 입력하기
        </Link>
      </section>
    </GuestFrame>
  );
}

export function GuestOrderLookupPage() {
  return (
    <GuestFrame title="비회원 주문조회" subtitle="주문번호와 휴대폰번호 mock 입력 후 주문 상세 예시를 확인합니다.">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-black">주문조회 mock 입력</h2>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            주문번호
            <input
              readOnly
              value="A5-20260519-001"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-base font-semibold"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            휴대폰번호
            <input
              readOnly
              value="010-****-2388"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-base font-semibold"
            />
          </label>
        </div>
        <Link href="/orders/guest/A5-20260519-001" className="mt-4 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
          mock 주문 조회
        </Link>
      </section>
      <section className="mt-4 rounded-md bg-amber-50 p-4">
        <p className="text-sm font-black text-amber-900">개인정보 정책 미확정</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          실제 운영 전 주문조회 인증 방식과 개인정보 노출 범위는 사람 승인이 필요합니다.
        </p>
      </section>
    </GuestFrame>
  );
}

export async function GuestOrderDetailPage({ orderNo }: { orderNo: string }) {
  const { order, items } = repositoryData(
    await mockRepositories.orders.getOrderByOrderNo(orderNo),
  );

  return (
    <GuestFrame title="주문 상세" subtitle="비회원 고객용 주문 결과 mock 화면입니다.">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500">주문번호</p>
            <h2 className="text-2xl font-black">{order.orderNo}</h2>
            <p className="mt-1 text-sm text-slate-600">{order.customerName} / {order.customerPhoneMasked}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-md bg-slate-50 p-3">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-black">{item.productName}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.optionName} / {item.quantity}개 / {item.deliveryStatus}
                  </p>
                </div>
                <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">수령방식</span>
            <strong>{order.deliveryMethod === "pickup" ? "현장수령" : "택배배송"}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">결제시각</span>
            <strong>{order.paidAt ? formatDateTime(order.paidAt) : "결제 전"}</strong>
          </div>
          <div className="flex justify-between text-xl">
            <span className="font-black">총 결제금액</span>
            <strong className="text-red-600">{formatCurrency(order.totalAmount)}</strong>
          </div>
        </div>
      </section>
    </GuestFrame>
  );
}
