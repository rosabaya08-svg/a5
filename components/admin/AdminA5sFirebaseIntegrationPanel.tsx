import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { AdminA5sCustomerMonitorPanel } from "@/components/admin/AdminA5sCustomerMonitorPanel";
import type { Company, Order, OrderItem, Payment } from "@/types/commerce";

type AdminA5sFirebaseIntegrationPanelProps = {
  companies: Company[];
  orders: Order[];
  orderItems: OrderItem[];
  payments: Payment[];
};

type PlanRow = {
  name: string;
  purpose: string;
  owner: string;
  status: string;
};

const firebaseCollections: PlanRow[] = [
  { name: "a5s_companies", purpose: "A5S 입점사, 운영 권한, 승인 상태를 A5와 분리해 저장합니다.", owner: "최고관리자", status: "설계 필요" },
  { name: "a5s_stores", purpose: "PC몰, 모바일웹, 앱형 스토어 기본 정보와 공개 상태를 관리합니다.", owner: "A5S 운영자", status: "설계 필요" },
  { name: "a5s_products", purpose: "A5S 전용 상품, 재고, 가격, 전시 상태를 저장합니다.", owner: "A5S 운영자", status: "설계 필요" },
  { name: "a5s_customers / a5s_auth_identities", purpose: "회원 허브와 연결된 고객 가입 경로, 로그인 제공자, 동기화 상태를 확인합니다.", owner: "최고관리자", status: "모니터링 필요" },
  { name: "a5s_orders / a5s_order_items", purpose: "A5S 주문과 주문상품을 기존 A5 주문과 분리해 취합합니다.", owner: "A5S API", status: "설계 필요" },
  { name: "a5s_payments / a5s_payment_intents", purpose: "Payup 결제 준비, 승인, 실패, 취소 로그를 분리해 저장합니다.", owner: "A5S API", status: "구현 필요" },
  { name: "a5s_pg_credentials", purpose: "산지바로 PG 설정은 PG 관리 메뉴의 산지바로 탭에서만 관리합니다.", owner: "최고관리자", status: "분리 완료" },
  { name: "a5s_sales_daily / a5s_sales_monthly", purpose: "A5S 매출, 주문수, 수수료 예정액을 일/월 단위로 별도 집계합니다.", owner: "집계 Function", status: "설계 필요" },
  { name: "a5s_visitor_events", purpose: "A5S 방문, 상품조회, 장바구니, 주문진입 이벤트를 저장합니다.", owner: "A5S 클라이언트", status: "설계 필요" },
];

const salesPipeline: PlanRow[] = [
  { name: "주문 생성", purpose: "A5S 주문 발생 시 a5s_orders와 a5s_order_items에 기록합니다.", owner: "A5S API", status: "설계 완료" },
  { name: "결제 승인", purpose: "Payup 승인 결과를 a5s_payments와 a5s_payment_intents에 기록합니다.", owner: "Payup webhook", status: "구현 필요" },
  { name: "매출 집계", purpose: "승인, 취소, 환불 이벤트 기준으로 a5s_sales_daily를 재계산합니다.", owner: "집계 Function", status: "구현 필요" },
  { name: "대시보드 표시", purpose: "최고관리자에서 A5S 매출, 주문, 방문, PG 상태를 기존 A5와 분리해 표시합니다.", owner: "최고관리자", status: "재설계" },
];

const pgPipeline: PlanRow[] = [
  { name: "채널별 PG 저장", purpose: "산지바로, 홀세일 폐쇄몰, 루쏘 부티끄를 PG 관리 메뉴에서 분리 저장합니다.", owner: "최고관리자", status: "구조 반영" },
  { name: "결제 준비 확인", purpose: "paymentsReady가 채널별 가맹점 설정을 읽어 결제 가능 여부를 판단해야 합니다.", owner: "A5S API", status: "검증 필요" },
  { name: "결제창 호출", purpose: "고객 결제 버튼에서 해당 기업 또는 채널의 Payup 결제창을 열어야 합니다.", owner: "A5S 화면", status: "검증 필요" },
  { name: "로그 보존", purpose: "요청, 응답, webhook, 실패 사유를 채널별 PG 로그로 남깁니다.", owner: "A5S API", status: "구현 필요" },
];

function readField(record: unknown, ...keys: string[]) {
  const source = record && typeof record === "object" ? (record as Record<string, unknown>) : {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function isRevenueOrder(order: Order) {
  return !["pending_payment", "refund_approved_mock", "refunded", "cancelled"].includes(String(readField(order, "status") ?? ""));
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-normal tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-normal text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-normal leading-6 text-slate-600">{helper}</p>
    </div>
  );
}

function PlanTable({ title, rows }: { title: string; rows: PlanRow[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-normal text-slate-950">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm font-normal">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-normal">항목</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-normal">역할</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-normal">담당</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-normal">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-3 text-slate-900">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">{row.purpose}</td>
                <td className="px-4 py-3 text-slate-600">{row.owner}</td>
                <td className="px-4 py-3 text-slate-700">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminA5sFirebaseIntegrationPanel({ companies, orders, orderItems, payments }: AdminA5sFirebaseIntegrationPanelProps) {
  const approvedCompanies = companies.filter((company) => readField(company, "approval_status", "approvalStatus", "status") === "approved").length;
  const payupReadyCompanies = companies.filter((company) => readField(company, "pg_merchant_status", "pgMerchantStatus", "merchantStatus") === "active").length;
  const revenueOrders = orders.filter(isRevenueOrder);
  const revenueTotal = revenueOrders.reduce((sum, order) => sum + Number(readField(order, "total_amount", "totalAmount") ?? 0), 0);
  const completedPayments = payments.filter((payment) => ["paid", "approved", "completed"].includes(String(readField(payment, "status") ?? "")));

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="승인 기업" value={formatNumber(approvedCompanies)} helper="현재 A5 승인 기업 기준입니다. A5S 기업으로 자동 복제하지 않습니다." />
        <MetricCard label="Payup 준비" value={formatNumber(payupReadyCompanies)} helper="현재 A5 Payup credential 참조값이 준비된 기업 수입니다." />
        <MetricCard label="주문 항목" value={formatNumber(orderItems.length)} helper="현재 A5 주문상품 수입니다. A5S 매출 저장소와 분리해야 합니다." />
        <MetricCard label="주문 매출" value={formatCurrency(revenueTotal)} helper={`결제 기록 ${formatNumber(completedPayments.length)}건과 함께 대조가 필요합니다.`} />
      </section>

      <AdminA5sCustomerMonitorPanel />

      <PlanTable title="A5S Firebase 컬렉션 설계" rows={firebaseCollections} />
      <PlanTable title="A5S 매출 별도 취합 루프" rows={salesPipeline} />
      <PlanTable title="A5S PG 별도 관리 루프" rows={pgPipeline} />

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-normal text-slate-950">다음 구현 과제</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            "Firestore rules: a5s_* 컬렉션 권한을 최고관리자, A5S 운영자, 고객 공개 read로 분리",
            "Functions: a5sOrderCreate, a5sPayupReady, a5sPayupWebhook, a5sSalesAggregate 신설",
            "Storage: a5s/stores, a5s/products, a5s/banners 경로와 업로드 권한 분리",
            "대시보드: A5S 매출, 주문, 방문, PG 상태를 기존 A5 지표와 별도 카드로 표시",
          ].map((item) => (
            <div key={item} className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-normal leading-6 text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

