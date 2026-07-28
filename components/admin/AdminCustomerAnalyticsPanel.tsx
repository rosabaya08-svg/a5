import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  visitorAnalyticsChannelLabels,
  type VisitorAnalyticsSummary,
} from "@/lib/analytics/visitorAnalytics";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils/format";
import type { Order } from "@/types/commerce";

export type AdminCustomerAnalyticsMode = "overview" | "guests" | "visitors" | "orders";

type AdminCustomerAnalyticsPanelProps = {
  summary: VisitorAnalyticsSummary;
  orders: Order[];
  mode?: AdminCustomerAnalyticsMode;
};

type GuestCustomerRow = {
  id: string;
  name: string;
  phone: string;
  orderCount: number;
  totalAmount: number;
  lastOrderedAt: string;
  lastOrderNo: string;
};

type CsvCell = string | number | boolean | null | undefined;

function csvValue(value: CsvCell) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvHref(headers: string[], rows: CsvCell[][]) {
  const csv = [
    headers.map(csvValue).join(","),
    ...rows.map((row) => row.map(csvValue).join(",")),
  ].join("\r\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${csv}`)}`;
}

function CsvDownloadLink({
  filename,
  headers,
  rows,
  children,
}: {
  filename: string;
  headers: string[];
  rows: CsvCell[][];
  children: React.ReactNode;
}) {
  return (
    <a
      href={csvHref(headers, rows)}
      download={filename}
      className="inline-flex h-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-normal text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
    >
      {children}
    </a>
  );
}

function buildGuestCustomers(orders: Order[]) {
  const customers = new Map<string, GuestCustomerRow>();

  for (const order of orders) {
    const key = `${order.customerPhoneMasked || "-"}:${order.customerName || "비회원 고객"}`;
    const current =
      customers.get(key) ??
      ({
        id: key,
        name: order.customerName || "비회원 고객",
        phone: order.customerPhoneMasked || "-",
        orderCount: 0,
        totalAmount: 0,
        lastOrderedAt: order.createdAt,
        lastOrderNo: order.orderNo,
      } satisfies GuestCustomerRow);

    current.orderCount += 1;
    current.totalAmount += order.totalAmount;

    if (order.createdAt > current.lastOrderedAt) {
      current.lastOrderedAt = order.createdAt;
      current.lastOrderNo = order.orderNo;
    }

    customers.set(key, current);
  }

  return [...customers.values()].sort((left, right) => right.lastOrderedAt.localeCompare(left.lastOrderedAt));
}

function orderStatusCounts(orders: Order[]) {
  const counts = new Map<string, { status: string; count: number; amount: number }>();

  for (const order of orders) {
    const current = counts.get(order.status) ?? { status: order.status, count: 0, amount: 0 };
    current.count += 1;
    current.amount += order.totalAmount;
    counts.set(order.status, current);
  }

  return [...counts.values()].sort((left, right) => right.count - left.count);
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-normal uppercase tracking-[0.12em] text-blue-700">{label}</p>
      <p className="mt-2 text-2xl font-normal text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-normal text-slate-500">{helper}</p>
    </article>
  );
}

function CustomerManagementShortcuts() {
  const links = [
    { href: "/admin/customers/guests", label: "비회원-고객리스트", body: "주문 기준 비회원 고객을 중복 제거해서 확인합니다." },
    { href: "/admin/customers/visitors", label: "방문자수", body: "폐쇄몰, 모바일, A5S 웹/앱 방문자 집계를 확인합니다." },
    { href: "/admin/customers/orders", label: "주문수", body: "주문 상태별 건수와 금액을 확인합니다." },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md">
          <p className="font-normal text-slate-950">{link.label}</p>
          <p className="mt-2 text-sm font-normal leading-6 text-slate-600">{link.body}</p>
          <p className="mt-3 text-xs font-normal text-blue-700">{link.href}</p>
        </Link>
      ))}
    </section>
  );
}

function VisitorChannelCards({ summary }: { summary: VisitorAnalyticsSummary }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {summary.channels.map((channel) => (
        <article key={channel.channel} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-normal uppercase tracking-[0.12em] text-slate-500">{visitorAnalyticsChannelLabels[channel.channel]}</p>
          <p className="mt-2 text-2xl font-normal text-slate-950">{formatNumber(channel.uniqueVisitors)}</p>
          <p className="mt-1 text-xs font-normal text-slate-500">
            방문 {formatNumber(channel.visits)} / 조회 {formatNumber(channel.pageViews)}
          </p>
        </article>
      ))}
    </section>
  );
}

function VisitorTables({ summary }: { summary: VisitorAnalyticsSummary }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <DataTable
        columns={["채널", "일자", "방문자", "방문", "조회"]}
        rows={summary.daily.map((row) => ({
          id: row.id,
          cells: [
            visitorAnalyticsChannelLabels[row.channel],
            row.dateKey,
            formatNumber(row.uniqueVisitors),
            formatNumber(row.visits),
            formatNumber(row.pageViews),
          ],
        }))}
      />
      <DataTable
        columns={["채널", "경로", "조회", "방문자"]}
        rows={summary.topPages.map((row) => ({
          id: row.id,
          cells: [
            visitorAnalyticsChannelLabels[row.channel],
            <span key="path" className="font-normal text-slate-950">{row.path}</span>,
            formatNumber(row.pageViews),
            formatNumber(row.uniqueVisitors),
          ],
        }))}
      />
    </div>
  );
}

function GuestCustomerTable({ orders }: { orders: Order[] }) {
  const customers = buildGuestCustomers(orders);

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <CsvDownloadLink
          filename="a5-guest-customers.csv"
          headers={["고객명", "연락처", "주문수", "누적주문금액", "최근주문일", "최근주문번호", "가입/주문루트"]}
          rows={customers.map((customer) => [
            customer.name,
            customer.phone,
            customer.orderCount,
            customer.totalAmount,
            customer.lastOrderedAt,
            customer.lastOrderNo,
            "A5 비회원 주문",
          ])}
        >
          고객 CSV 다운로드
        </CsvDownloadLink>
      </div>
      <DataTable
      columns={["고객", "연락처", "주문수", "누적 주문금액", "최근 주문"]}
      rows={customers.map((customer) => ({
        id: customer.id,
        cells: [
          <span key="name" className="font-normal text-slate-950">{customer.name}</span>,
          customer.phone,
          formatNumber(customer.orderCount),
          formatCurrency(customer.totalAmount),
          <Link key="order" href={`/orders/guest/${customer.lastOrderNo}`} className="font-normal text-blue-700">
            {formatDateTime(customer.lastOrderedAt)}
          </Link>,
        ],
      }))}
      />
    </div>
  );
}

function OrderCountTable({ orders }: { orders: Order[] }) {
  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <CsvDownloadLink
          filename="a5-customer-orders.csv"
          headers={["주문번호", "고객명", "연락처", "상태", "금액", "생성일", "가입/주문루트"]}
          rows={orders.map((order) => [
            order.orderNo,
            order.customerName,
            order.customerPhoneMasked,
            order.status,
            order.totalAmount,
            order.createdAt,
            "A5 주문",
          ])}
        >
          주문 CSV 다운로드
        </CsvDownloadLink>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <DataTable
        columns={["상태", "주문수", "금액"]}
        rows={orderStatusCounts(orders).map((row) => ({
          id: row.status,
          cells: [
            <StatusBadge key="status" status={row.status} />,
            formatNumber(row.count),
            formatCurrency(row.amount),
          ],
        }))}
      />
      <DataTable
        columns={["주문번호", "고객", "상태", "금액", "생성"]}
        rows={orders.map((order) => ({
          id: order.id,
          cells: [
            <Link key="order" href={`/orders/guest/${order.orderNo}`} className="font-normal text-blue-700">
              {order.orderNo}
            </Link>,
            order.customerName,
            <StatusBadge key="status" status={order.status} />,
            formatCurrency(order.totalAmount),
            formatDateTime(order.createdAt),
          ],
        }))}
      />
      </div>
    </div>
  );
}

export function AdminCustomerAnalyticsPanel({ summary, orders, mode = "overview" }: AdminCustomerAnalyticsPanelProps) {
  const guestCustomers = buildGuestCustomers(orders);
  const paidAmount = orders.filter((order) => order.status !== "cancelled").reduce((total, order) => total + order.totalAmount, 0);

  return (
    <div className="grid gap-4">
      {summary.error ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-normal text-amber-900">
          방문자 집계 읽기 확인 필요: {summary.error}
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="unique visitors" value={formatNumber(summary.totals.uniqueVisitors)} helper={`${summary.days}일 기준 방문자`} />
        <SummaryCard label="visits" value={formatNumber(summary.totals.visits)} helper="새 세션 기준 방문" />
        <SummaryCard label="page views" value={formatNumber(summary.totals.pageViews)} helper="폐쇄몰/모바일/A5S 조회" />
        <SummaryCard label="guest customers" value={formatNumber(guestCustomers.length)} helper={`주문 ${formatNumber(orders.length)}건 / ${formatCurrency(paidAmount)}`} />
      </section>

      {mode === "overview" ? (
        <>
          <CustomerManagementShortcuts />
          <VisitorChannelCards summary={summary} />
          <GuestCustomerTable orders={orders.slice(0, 12)} />
        </>
      ) : null}

      {mode === "guests" ? <GuestCustomerTable orders={orders} /> : null}
      {mode === "visitors" ? (
        <>
          <VisitorChannelCards summary={summary} />
          <VisitorTables summary={summary} />
        </>
      ) : null}
      {mode === "orders" ? <OrderCountTable orders={orders} /> : null}
    </div>
  );
}
