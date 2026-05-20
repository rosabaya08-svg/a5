import Link from "next/link";
import { ConfirmBox } from "@/components/ui/ConfirmBox";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockApi } from "@/lib/mock/mockApi";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

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
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            CUSTOMER_GUEST / mock
          </p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          <nav className="mt-4 flex flex-wrap gap-2">
            <Link href="/orders/guest" className="rounded-md bg-slate-950 px-3 py-2 text-sm font-bold text-white">
              비회원 주문조회
            </Link>
            <Link href="/tablet/products" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold">
              태블릿 mock
            </Link>
          </nav>
        </header>
        <section className="mt-4">{children}</section>
      </div>
    </main>
  );
}

export function QrLandingPage({ code }: { code: string }) {
  const session = mockApi.findQr(code);

  return (
    <GuestFrame title="QR 주문 확인" subtitle="QR 만료/사용 여부를 먼저 확인한 뒤 mock 결제로 이동합니다.">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{session.shortCode}</h2>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            출처: {session.nurseryId} / {session.roomId} / {session.tabletId}
          </p>
          <div className="mt-4 grid gap-3">
            {session.items.map((item) => (
              <div key={item.productId} className="rounded-md bg-slate-50 p-3">
                <div className="flex justify-between gap-4">
                  <span className="font-semibold">{item.productName}</span>
                  <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.quantity}개</p>
              </div>
            ))}
          </div>
        </section>
        <aside className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">총 결제 예정 mock</p>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(session.totalAmount)}</p>
          <p className="mt-2 text-sm text-slate-600">만료 {formatDateTime(session.expiresAt)}</p>
          <Link href={`/q/${session.shortCode}/checkout`} className="mt-5 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white">
            mock 결제 진행
          </Link>
        </aside>
      </div>
    </GuestFrame>
  );
}

export function QrCheckoutPage({ code }: { code: string }) {
  const session = mockApi.findQr(code);

  return (
    <GuestFrame title="비회원 mock 결제" subtitle="실제 PG 호출 없이 결제자/수령정보 입력 구조만 표시합니다.">
      <ConfirmBox
        title="실결제 아님"
        description="이 화면은 mock adapter 전용입니다. 운영 PG MID/KEY 또는 실제 카드 승인 요청을 만들지 않습니다."
        confirmLabel="PG 차단"
      />
      <div className="mt-4 grid gap-4 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-2">
        {["결제자 이름", "휴대폰", "수령자 이름", "주소 또는 객실 확인"].map((label) => (
          <label key={label} className="grid gap-2 text-sm font-semibold text-slate-700">
            {label}
            <input
              readOnly
              value="mock 입력 대기"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-slate-600">서버 재계산 대상 금액</span>
          <strong className="text-2xl">{formatCurrency(session.totalAmount)}</strong>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/q/${session.shortCode}/success`} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
            mock 승인
          </Link>
          <Link href={`/q/${session.shortCode}/failed`} className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white">
            mock 실패
          </Link>
        </div>
      </div>
    </GuestFrame>
  );
}

export function QrSuccessPage({ code }: { code: string }) {
  const session = mockApi.findQr(code);

  return (
    <GuestFrame title="mock 결제 성공" subtitle="QR 재사용 차단과 주문/결제 원장 기록이 필요한 상태입니다.">
      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <StatusBadge status="approved_mock" />
        <h2 className="mt-3 text-2xl font-bold">{formatCurrency(session.totalAmount)} mock 승인</h2>
        <p className="mt-2 text-sm">운영 PG 승인 내역이 아니며 테스트 흐름 확인용입니다.</p>
        <Link href="/orders/guest/A5-20260519-001" className="mt-4 inline-flex rounded-md bg-white px-4 py-2 text-sm font-bold text-emerald-900">
          주문 상세 보기
        </Link>
      </section>
    </GuestFrame>
  );
}

export function QrFailedPage({ code }: { code: string }) {
  const session = mockApi.findQr(code);

  return (
    <GuestFrame title="mock 결제 실패" subtitle="실패 상태와 재시도 가능 여부를 구분해야 합니다.">
      <section className="rounded-md border border-red-200 bg-red-50 p-5 text-red-950">
        <StatusBadge status="failed_mock" />
        <h2 className="mt-3 text-2xl font-bold">{session.shortCode} mock 실패</h2>
        <p className="mt-2 text-sm">운영 PG 오류가 아니며 테스트 실패 화면입니다.</p>
        <Link href={`/q/${session.shortCode}/checkout`} className="mt-4 inline-flex rounded-md bg-white px-4 py-2 text-sm font-bold text-red-900">
          mock 결제 다시 보기
        </Link>
      </section>
    </GuestFrame>
  );
}

export function GuestOrderLookupPage() {
  return (
    <GuestFrame title="비회원 주문조회" subtitle="주문번호와 휴대폰 등 최소 인증 정책은 사람 확인 후 확정합니다.">
      <ConfirmBox
        title="인증 정책 미확정"
        description="개인정보 노출을 막기 위해 주문조회 인증 정책은 법무/개인정보 검토 후 확정해야 합니다."
        confirmLabel="BLOCKER"
      />
      <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
        <DataTable
          columns={["샘플 주문번호", "상태", "금액", "상세"]}
          rows={mockApi.orders().map((order) => ({
            id: order.id,
            cells: [
              order.orderNo,
              <StatusBadge key="status" status={order.status} />,
              formatCurrency(order.totalAmount),
              <Link key="link" href={`/orders/guest/${order.orderNo}`} className="font-semibold text-blue-700">
                보기
              </Link>,
            ],
          }))}
        />
      </div>
    </GuestFrame>
  );
}

export function GuestOrderDetailPage({ orderNo }: { orderNo: string }) {
  const order = mockApi.findOrder(orderNo);
  const items = mockApi.orderItems().filter((item) => order.itemIds.includes(item.id));

  return (
    <GuestFrame title="주문 상세" subtitle="비회원 고객에게 필요한 최소 정보만 노출하는 mock 상세입니다.">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{order.orderNo}</h2>
            <p className="mt-1 text-sm text-slate-600">{order.customerName} / {order.customerPhoneMasked}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-md bg-slate-50 p-3">
              <div className="flex justify-between gap-4">
                <span className="font-semibold">{item.productName}</span>
                <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.optionName} / {item.deliveryStatus}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-600">총 결제금액</span>
          <strong className="text-2xl">{formatCurrency(order.totalAmount)}</strong>
        </div>
      </section>
    </GuestFrame>
  );
}
