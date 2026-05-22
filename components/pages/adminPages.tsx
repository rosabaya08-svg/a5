import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/AdminSidebar";
import { AdminActionTimeline } from "@/components/admin/AdminActionTimeline";
import { AdminDataSurface } from "@/components/admin/AdminDataSurface";
import { AdminRiskBadge } from "@/components/admin/AdminRiskBadge";
import {
  AdminBadge,
  AdminChecklist,
  AdminCompactRecordList,
  AdminConfirmModal,
  AdminDefinitionGrid,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterChips,
  AdminImagePlaceholder,
  AdminLoadingState,
  AdminMetricGrid,
  AdminNotice,
  AdminPanel,
  AdminPagination,
  AdminSearchSortBar,
  AdminTabs,
  type AdminTone,
} from "@/components/admin/AdminMockWidgets";
import { DataTable } from "@/components/ui/DataTable";
import {
  adminAuditLogs,
  adminChecklist,
  adminCompanies,
  adminDetailTimeline,
  adminDeliveryEvents,
  adminExternalIntegrations,
  adminExportPreviews,
  adminInventorySync,
  adminMetrics,
  adminNurseries,
  adminNotificationLogs,
  adminPeriodMetricSets,
  adminOperationRisks,
  adminOrders,
  adminOrderItems,
  adminPermissionMatrix,
  adminPayments,
  adminPickupEvents,
  adminPeriodFilters,
  adminProductApprovals,
  adminQrSources,
  adminDataQualityIssues,
  adminRefundRequests,
  adminReleaseReadiness,
  adminRooms,
  adminScaleCompanies,
  adminScaleNurseries,
  adminScaleOrders,
  adminScaleQrSources,
  adminScaleRisks,
  adminSecurityLogs,
  adminSettlements,
  adminSettlementItems,
  adminSearchResults,
  adminSlaAging,
  adminTablets,
} from "@/data/admin/mockAdminData";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/utils/format";

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", badge: "A" },
  { href: "/admin/status", label: "Status" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/nurseries", label: "Nurseries" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/tablets", label: "Tablets" },
  { href: "/admin/qr-sources", label: "QR sources" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/settlements", label: "Settlements" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/delivery", label: "Delivery/Pickup" },
  { href: "/admin/inventory-sync", label: "Inventory sync" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/risk-center", label: "Risk Center" },
  { href: "/admin/search", label: "Search" },
  { href: "/admin/permissions", label: "Permissions" },
  { href: "/admin/exports", label: "Exports" },
  { href: "/admin/sla", label: "SLA aging" },
  { href: "/admin/data-quality", label: "Data quality" },
  { href: "/admin/release-readiness", label: "Release ready" },
  { href: "/admin/queue-ownership", label: "Queue owners" },
  { href: "/admin/change-requests", label: "Change requests" },
  { href: "/admin/privacy-review", label: "Privacy review" },
  { href: "/admin/incidents", label: "Incidents" },
  { href: "/admin/onboarding", label: "Onboarding" },
  { href: "/admin/accessibility", label: "Accessibility" },
  { href: "/admin/localization", label: "Localization" },
  { href: "/admin/performance-budget", label: "Performance" },
  { href: "/admin/merge-readiness", label: "Merge ready" },
  { href: "/admin/handoff", label: "Handoff" },
  { href: "/admin/audit-logs", label: "Audit logs" },
];

const statusTone: Record<string, AdminTone> = {
  approved: "green",
  pending: "amber",
  suspended: "red",
  rejected: "red",
  normal: "green",
  review: "purple",
  blocked: "red",
  active: "green",
  inactive: "slate",
  maintenance: "amber",
  pending_approval: "amber",
  paid: "green",
  ready_for_pickup: "blue",
  shipping: "purple",
  refund_requested: "amber",
  cancelled: "slate",
  approved_mock: "green",
  cancel_requested: "amber",
  failed_mock: "red",
  none: "slate",
  requested: "amber",
  reviewing: "purple",
  expired: "red",
  draft: "slate",
  payout_ready_mock: "blue",
  blocked_real_payout: "red",
  blocked_real_pg_required: "red",
  confirmed_mock: "green",
  payout_blocked: "red",
  low: "slate",
  medium: "amber",
  high: "red",
  closed_mall_allowed: "green",
  needs_check: "amber",
  mock_ready: "green",
  docs_required: "blue",
  needs_approval: "amber",
  production_forbidden: "red",
  official_docs_required: "amber",
  secret_required: "red",
  production_blocked: "red",
  open: "red",
  watching: "amber",
  mock_mitigated: "green",
  invoice_pending: "amber",
  invoice_entered: "blue",
  in_transit: "purple",
  delivered: "green",
  pickup_ready: "blue",
  picked_up: "green",
  empty: "slate",
  active_cart: "blue",
  qr_created: "green",
  stale_cart: "amber",
  forbidden: "red",
  server_required: "amber",
  not_applicable: "slate",
};

function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <AppShell
      sectionTitle="Super Admin"
      title={title}
      subtitle={subtitle}
      scopeLabel="SUPER_ADMIN / mock-test beta"
      navItems={adminNav}
      accent="admin"
    >
      <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-900">
        mock/test beta. 실제 Firebase/PG 연결 없음. Real payout, refund execution, notification send, delivery lookup, and external inventory API calls are blocked.
      </div>
      {children}
    </AppShell>
  );
}

function Status({ value }: { value: string }) {
  return <AdminBadge tone={statusTone[value] ?? "slate"}>{value.replaceAll("_", " ")}</AdminBadge>;
}

function RiskList() {
  return (
    <div className="grid gap-3">
      {adminScaleRisks.slice(0, 12).map((risk) => (
        <article key={risk.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-950">{risk.title}</p>
            <AdminBadge tone={statusTone[risk.severity]}>{risk.severity}</AdminBadge>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{risk.owner}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{risk.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function AdminIndexPage() {
  return (
    <AdminShell
      title="Operations console"
      subtitle="Mock-only super admin workspace for the closed mall beta. Real Firebase, PG, refund, payout, delivery lookup, and external stock APIs remain blocked."
    >
      <AdminMetricGrid metrics={adminMetrics.slice(0, 4)} />
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_380px]">
        <AdminPanel title="Start here" eyebrow="Admin track">
          <div className="grid gap-3 sm:grid-cols-2">
            {adminNav.slice(0, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-800"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </AdminPanel>
        <AdminNotice
          title="Production actions are disabled"
          description="This worktree generates only files, UI, mock data, and reports. Any real integration decision is recorded as a blocker instead of being executed."
          tone="amber"
        />
      </div>
    </AdminShell>
  );
}

export function AdminDashboardPage() {
  return (
    <AdminShell
      title="Super admin dashboard"
      subtitle="A five-day mock dashboard with order, QR, payment, refund, settlement, and risk signals."
    >
      <AdminFilterChips title="Period" filters={adminPeriodFilters} />
      <AdminSearchSortBar
        searchLabel="Dashboard query"
        searchValue="orders + active QR + risk logs"
        filters={["QR source exists", "Mock payment only", "Refund included", "Settlement review"]}
        sortOptions={["Newest", "Highest risk", "Largest amount"]}
        activeSort="Highest risk"
        resultCount={adminScaleOrders.length + adminScaleRisks.length}
      />
      <AdminMetricGrid metrics={adminMetrics} />
      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        {adminPeriodMetricSets.map((period) => (
          <AdminPanel key={period.period} title={period.label} eyebrow="Period mock">
            <AdminMetricGrid metrics={period.metrics} />
          </AdminPanel>
        ))}
      </div>
      <AdminCompactRecordList
        title="Recent order cards"
        records={adminScaleOrders.slice(0, 8).map((order) => ({
          id: order.id,
          title: order.orderNo,
          meta: `${order.nurseryId} / ${order.roomId}`,
          status: <Status value={order.orderStatus} />,
          amount: formatCurrency(order.totalAmount),
        }))}
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <AdminPanel title="Recent orders" eyebrow="QR and order activity">
          <DataTable
            columns={["Order", "Customer", "Order status", "Payment", "Amount", "Created"]}
            rows={adminScaleOrders.slice(0, 8).map((order) => ({
              id: order.id,
              cells: [
                <Link key="order" href={`/admin/orders/detail?order_no=${order.orderNo}`} className="font-semibold text-blue-700">
                  {order.orderNo}
                </Link>,
                order.customerMasked,
                <Status key="order-status" value={order.orderStatus} />,
                <Status key="payment-status" value={order.paymentStatus} />,
                formatCurrency(order.totalAmount),
                formatDateTime(order.createdAt),
              ],
            }))}
          />
          <AdminPagination page={1} pageSize={8} total={adminScaleOrders.length} />
        </AdminPanel>
        <AdminPanel title="Risk queue" eyebrow="Blocked integrations">
          <RiskList />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

export function AdminCompaniesPage() {
  const pendingCount = adminScaleCompanies.filter((company) => company.status === "pending").length;

  return (
    <AdminShell
      title="Company management"
      subtitle="Company approval, suspension, detail tabs, commission rates, and masked settlement accounts."
    >
      <AdminSearchSortBar
        searchLabel="company_id"
        searchValue="company-*"
        filters={["All", "Pending", "Approved", "Suspended", "Rejected", "Settlement blocked"]}
        sortOptions={["Updated", "Pending first", "Blocked first"]}
        activeSort="Pending first"
        resultCount={adminScaleCompanies.length}
      />
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <AdminNotice
          title={`${pendingCount} pending approval`}
          description="Approval and suspension buttons are static mock controls. They do not mutate real Auth claims or Firestore documents."
          tone="blue"
          label="Mock action"
        />
        <AdminNotice
          title="company_id filter ready"
          description="Tables expose company_id so the future repository adapter can scope products, orders, and settlements safely."
          tone="green"
          label="Interface cue"
        />
        <AdminNotice
          title="Settlement account masked"
          description="Only masked bank account display is present. Full account storage and payout execution are blocked."
          tone="amber"
          label="PII guard"
        />
      </div>
      <AdminPanel title="Company list" eyebrow="Day 2">
        <DataTable
          columns={[
            "company_id",
            "Company",
            "Manager",
            "Status",
            "Fee",
            "Settlement account",
            "Products",
            "Orders",
            "Pending payout",
            "Settlement",
          ]}
          rows={adminScaleCompanies.map((company) => ({
            id: company.id,
            cells: [
              company.id,
              <Link
                key="name"
                href={`/admin/companies/detail?company_id=${company.id}`}
                className="font-semibold text-blue-700"
              >
                {company.name}
              </Link>,
              company.managerName,
              <Status key="status" value={company.status} />,
              formatPercent(company.commissionRate),
              company.maskedSettlementAccount,
              company.productCount,
              company.orderCount,
              formatCurrency(company.pendingSettlementAmount),
              <Status key="settlement" value={company.settlementStatus} />,
            ],
          }))}
        />
        <AdminPagination page={1} pageSize={10} total={adminScaleCompanies.length} />
      </AdminPanel>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {["Profile", "Approval", "Suspension"].map((tab) => (
          <AdminPanel key={tab} title={`${tab} tab`} eyebrow="Static detail mock">
            <p className="text-sm leading-6 text-slate-600">
              {tab} decisions are represented as review notes only. Real role changes and account mutations stay in BLOCKERS until Firebase Auth claims are approved.
            </p>
          </AdminPanel>
        ))}
      </div>
    </AdminShell>
  );
}

export function AdminNurseriesPage() {
  const selectedNursery = adminScaleNurseries[0];

  return (
    <AdminShell
      title="Nursery management"
      subtitle="Nursery, room, tablet, and QR source tracking for the closed mall beta."
    >
      <AdminSearchSortBar
        searchLabel="nursery_id"
        searchValue="nursery-*"
        filters={["All", "Approved", "Pending", "Pickup enabled", "Active QR"]}
        sortOptions={["Region", "Active QR", "Pickup waiting"]}
        activeSort="Active QR"
        resultCount={adminScaleNurseries.length}
      />
      <AdminPanel title="Nursery list" eyebrow="Day 3">
        <DataTable
          columns={["nursery_id", "Name", "Address", "Manager", "Status", "Rooms", "Tablets", "Active QR", "Pickup waiting"]}
          rows={adminScaleNurseries.map((nursery) => ({
            id: nursery.id,
            cells: [
              nursery.nurseryId,
              <Link
                key="name"
                href={`/admin/nurseries/detail?nursery_id=${nursery.nurseryId}`}
                className="font-semibold text-blue-700"
              >
                {nursery.name}
              </Link>,
              nursery.address,
              nursery.managerName,
              <Status key="status" value={nursery.status} />,
              nursery.roomCount,
              nursery.tabletCount,
              nursery.activeQrCount,
              nursery.pickupWaitingCount,
            ],
          }))}
        />
        <AdminPagination page={1} pageSize={10} total={adminScaleNurseries.length} />
      </AdminPanel>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <AdminPanel title="Nursery detail mock" eyebrow={selectedNursery.nurseryId}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-500">Name</dt>
              <dd className="mt-1 text-slate-950">{selectedNursery.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Region</dt>
              <dd className="mt-1 text-slate-950">{selectedNursery.region}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Rooms</dt>
              <dd className="mt-1 text-slate-950">{selectedNursery.roomCount}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Tablets</dt>
              <dd className="mt-1 text-slate-950">{selectedNursery.tabletCount}</dd>
            </div>
          </dl>
        </AdminPanel>
        <AdminPanel title="QR source tracking" eyebrow="Mock model">
          <p className="text-sm leading-6 text-slate-600">
            QR source is tracked as nursery_id + room_id + tablet_id. This page keeps the mapping visible before the real repository adapter exists.
          </p>
          <Link href="/admin/qr-sources" className="mt-3 inline-flex rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">
            Open QR source mock
          </Link>
        </AdminPanel>
      </div>
      <div className="mt-4">
        <AdminEmptyState
          title="No production customer data"
          description="The admin mock does not store real patient, guardian, or payer information. Future customer fields require a privacy review."
        />
      </div>
    </AdminShell>
  );
}

export function AdminQrSourcesPage() {
  return (
    <AdminShell
      title="QR source tracking"
      subtitle="Mock trace view for short_code, qr_session_id, nursery_id, room_id, and tablet_id."
    >
      <AdminSearchSortBar
        searchLabel="short_code"
        searchValue="SANHO701"
        filters={["All", "Active", "Paid", "Expired", "Cancelled", "Missing order"]}
        sortOptions={["Newest", "Expires soon", "Missing order"]}
        activeSort="Expires soon"
        resultCount={adminScaleQrSources.length}
      />
      <AdminPanel title="QR source records" eyebrow="Day 3">
        <DataTable
          columns={["short_code", "cart_id", "qr_session_id", "Status", "nursery_id", "room_id", "tablet_id", "Order", "Created", "Expires", "Memo"]}
          rows={adminScaleQrSources.map((source) => ({
            id: source.id,
            cells: [
              <span key="short-code" className="font-semibold text-slate-950">{source.shortCode}</span>,
              source.cartId,
              source.qrSessionId,
              <Status key="status" value={source.status} />,
              source.nurseryId,
              source.roomId,
              source.tabletId,
              source.orderNo ?? "not ordered",
              formatDateTime(source.createdAt),
              formatDateTime(source.expiresAt),
              source.sourceMemo,
            ],
          }))}
        />
        <AdminPagination page={1} pageSize={10} total={adminScaleQrSources.length} />
      </AdminPanel>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminNotice
          title="QR source contract"
          description="Every generated QR must be traceable to nursery_id, room_id, and tablet_id before payment handoff. This is a mock contract only."
          tone="blue"
          label="Trace required"
        />
        <AdminErrorState
          title="Missing source fallback"
          description="If a future QR session arrives without tablet provenance, the safe behavior is to block checkout and record a security log."
          code="QR_SOURCE_REQUIRED"
        />
      </div>
    </AdminShell>
  );
}

export function AdminRoomsPage() {
  return (
    <AdminShell
      title="Room management"
      subtitle="Room identifiers, duplicate prevention guidance, pickup availability, and tablet linkage."
    >
      <AdminNotice
        title="Duplicate room_number guard"
        description="The UI exposes nursery_id and room_id together so the future server check can prevent duplicate room numbers per nursery."
        tone="blue"
        label="Server rule pending"
      />
      <div className="mt-4">
        <AdminPanel title="Room list" eyebrow="Day 3">
          <DataTable
            columns={["nursery_id", "room_id", "Room", "Floor", "Tablet", "Recent QR", "Pickup waiting", "Pickup", "Status"]}
            rows={adminRooms.map((room) => ({
              id: room.id,
              cells: [
                room.nurseryId,
                room.roomId,
                room.roomNumber,
                room.floor,
                room.tabletId ?? "unassigned",
                room.recentQrShortCode ?? "-",
                room.pickupWaitingOrderCount,
                room.pickupEnabled ? "enabled" : "disabled",
                <Status key="status" value={room.status} />,
              ],
            }))}
          />
        </AdminPanel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Bulk room registration mock" eyebrow="CSV paste preview">
          <DataTable
            columns={["room_number", "floor", "pickup", "validation"]}
            rows={[
              { id: "bulk-701", cells: ["701", "7F", "enabled", <Status key="ok" value="approved" />] },
              { id: "bulk-702", cells: ["702", "7F", "enabled", <Status key="ok" value="approved" />] },
              { id: "bulk-701-dup", cells: ["701", "7F", "enabled", <Status key="dup" value="rejected" />] },
            ]}
          />
        </AdminPanel>
        <AdminErrorState
          title="Duplicate room_number blocked"
          description="Bulk room registration is a UI-only preview. Real duplicate prevention must run on the server before saving."
          code="ROOM_DUPLICATE"
        />
      </div>
    </AdminShell>
  );
}

export function AdminTabletsPage() {
  return (
    <AdminShell
      title="Tablet management"
      subtitle="Tablet access state, room linkage, last seen timestamp, and QR source identity."
    >
      <AdminSearchSortBar
        searchLabel="tablet_id"
        searchValue="tablet-*"
        filters={["All", "Active", "Inactive", "Maintenance", "Access blocked"]}
        sortOptions={["Last seen", "Access risk", "Room"]}
        activeSort="Access risk"
        resultCount={adminTablets.length}
      />
      <AdminPanel title="Tablet status" eyebrow="Day 3">
        <DataTable
          columns={["tablet_id", "Label", "nursery_id", "room_id", "Status", "Last seen", "QR count", "Cart", "Access", "QR source"]}
          rows={adminTablets.map((tablet) => ({
            id: tablet.id,
            cells: [
              tablet.tabletId,
              <span key="label" className="font-semibold text-slate-950">{tablet.label}</span>,
              tablet.nurseryId,
              tablet.roomId,
              <Status key="status" value={tablet.status} />,
              formatDateTime(tablet.lastSeenAt),
              tablet.qrCreatedCount,
              <Status key="cart" value={tablet.cartState} />,
              <Status key="access" value={tablet.accessState} />,
              tablet.qrSource,
            ],
          }))}
        />
      </AdminPanel>
      <div className="mt-4">
        <AdminErrorState
          title="General browser access blocked"
          description="The tablet catalog should only be available to registered tablet contexts. This admin mock records the blocked state and leaves real enforcement to the auth/rules track."
          code="TABLET_CONTEXT_REQUIRED"
        />
      </div>
    </AdminShell>
  );
}

export function AdminProductsPage() {
  return (
    <AdminShell
      title="Product approval"
      subtitle="Approval queue, rejection reason display, price comparison cues, and inventory status."
    >
      <AdminSearchSortBar
        searchLabel="product/company"
        searchValue="pending approval"
        filters={["All", "Draft", "Pending approval", "Approved", "Rejected", "Suspended", "Low stock"]}
        sortOptions={["Submitted", "Low stock", "Rejected first", "Draft first"]}
        activeSort="Submitted"
        resultCount={adminProductApprovals.length}
      />
      <AdminPanel title="Approval queue" eyebrow="Day 4">
        <DataTable
          columns={["Image", "product_id", "Product", "Company", "Status", "List price", "Lowest", "Closed mall", "Stock", "Submitted", "Reject reason"]}
          rows={adminProductApprovals.map((product) => ({
            id: product.id,
            cells: [
              <div key="image" className="w-28">
                <AdminImagePlaceholder label={product.category} tone={product.imagePlaceholderTone} />
              </div>,
              product.productId,
              <Link
                key="name"
                href={`/admin/products/detail?product_id=${product.productId}`}
                className="font-semibold text-blue-700"
              >
                {product.name}
              </Link>,
              product.companyName,
              <Status key="status" value={product.status} />,
              formatCurrency(product.listPrice),
              formatCurrency(product.platformLowestPrice),
              formatCurrency(product.closedMallPrice),
              product.stock,
              formatDateTime(product.submittedAt),
              product.rejectReason ?? "-",
            ],
          }))}
        />
        <AdminPagination page={1} pageSize={10} total={adminProductApprovals.length} />
      </AdminPanel>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminNotice
          title="Approve/reject modal mock"
          description="The confirmation state is represented as UI copy only. It does not write approval status to a real product collection."
          tone="amber"
          label="No mutation"
        />
        <AdminEmptyState
          title="No external inventory sync"
          description="External luxury mall stock codes are not called from this admin track. Sync errors belong in the company or integration blocker reports."
        />
      </div>
    </AdminShell>
  );
}

export function AdminOrdersPage() {
  return (
    <AdminShell
      title="Order management"
      subtitle="QR-origin orders, delivery or pickup state, payment state, and settlement basis by order_items."
    >
      <AdminSearchSortBar
        searchLabel="order_no / qr_session_id"
        searchValue="A5-20260520"
        filters={["All", "Pickup", "Delivery", "Refund requested", "Payment failed"]}
        sortOptions={["Newest", "Largest amount", "Refund first"]}
        activeSort="Refund first"
        resultCount={adminOrders.length}
      />
      <AdminPanel title="Order list" eyebrow="Day 4">
        <DataTable
          columns={["Order", "Customer", "nursery_id", "room_id", "QR", "Order status", "Payment", "Receive", "Amount"]}
          rows={adminOrders.map((order) => ({
            id: order.id,
            cells: [
              <Link key="order" href={`/admin/orders/detail?order_no=${order.orderNo}`} className="font-semibold text-blue-700">
                {order.orderNo}
              </Link>,
              order.customerMasked,
              order.nurseryId,
              order.roomId,
              order.qrSessionId,
              <Status key="order-status" value={order.orderStatus} />,
              <Status key="payment-status" value={order.paymentStatus} />,
              order.deliveryMethod,
              formatCurrency(order.totalAmount),
            ],
          }))}
        />
        <AdminPagination page={1} pageSize={10} total={adminOrders.length} />
      </AdminPanel>
      <div className="mt-4">
        <AdminPanel title="order_items list" eyebrow="Separated from orders">
          <DataTable
            columns={["Item", "Order", "company_id", "Product", "Option", "Qty", "Unit price", "Delivery", "Settlement"]}
            rows={adminOrderItems.map((item) => ({
              id: item.id,
              cells: [
                item.id,
                item.orderNo,
                item.companyId,
                item.productName,
                item.optionName,
                item.quantity,
                formatCurrency(item.unitPrice),
                <Status key="delivery" value={item.deliveryStatus} />,
                <Status key="settlement" value={item.settlementStatus} />,
              ],
            }))}
          />
        </AdminPanel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {["order_items snapshot", "company_id payout split", "refund hold amount"].map((title) => (
          <AdminPanel key={title} title={title} eyebrow="Settlement basis">
            <p className="text-sm leading-6 text-slate-600">
              This beta screen documents the calculation surface only. Real settlement and refund mutations stay disabled.
            </p>
          </AdminPanel>
        ))}
      </div>
    </AdminShell>
  );
}

export function AdminPaymentsPage() {
  return (
    <AdminShell
      title="Payment mock management"
      subtitle="Mock payment states, refund requests, and PG transition gates without any real PG call."
    >
      <AdminNotice
        title="Real PG calls are forbidden"
        description="The table uses mock TID values only. Cancel, refund, and capture actions require signed PG documents and a separate implementation review."
        tone="red"
        label="Blocked"
      />
      <div className="mt-4">
        <AdminPanel title="Payment records" eyebrow="Day 4">
          <DataTable
            columns={["payment_id", "order_id", "Order", "Status", "Amount", "mock_pg_tid", "Approved", "Failed reason", "Refund review"]}
            rows={adminPayments.map((payment) => ({
              id: payment.id,
              cells: [
                payment.paymentId,
                payment.orderId,
                payment.orderNo,
                <Status key="status" value={payment.status} />,
                formatCurrency(payment.amount),
                payment.mockTid,
                payment.approvedAt ? formatDateTime(payment.approvedAt) : "-",
                payment.failedReason ?? "-",
                <Status key="refund" value={payment.refundReview} />,
              ],
            }))}
          />
          <AdminPagination page={1} pageSize={10} total={adminPayments.length} />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

export function AdminRefundsPage() {
  return (
    <AdminShell
      title="Refund and cancel request mock"
      subtitle="Refund, full cancel, and partial cancel review queue. Real PG cancellation and refund execution remain blocked."
    >
      <AdminSearchSortBar
        searchLabel="refund_id / order_no"
        searchValue="refund-*"
        filters={["All", "Requested", "Reviewing", "Approved mock", "Rejected", "Real PG required"]}
        sortOptions={["Newest", "Largest amount", "Blocked first"]}
        activeSort="Blocked first"
        resultCount={adminRefundRequests.length}
      />
      <AdminNotice
        title="Partial cancel blocker"
        description="Partial cancel and refund paths are represented as review rows only. They do not call PG, mutate payments, or reconcile settlements."
        tone="red"
        label="PG blocked"
      />
      <div className="mt-4">
        <AdminPanel title="Refund request queue" eyebrow="Batch 10">
          <DataTable
            columns={["refund_id", "Order", "payment_id", "company_id", "Type", "Status", "Amount", "Requested", "Reason", "Blocker"]}
            rows={adminRefundRequests.map((refund) => ({
              id: refund.id,
              cells: [
                refund.refundId,
                refund.orderNo,
                refund.paymentId,
                refund.companyId,
                refund.type,
                <Status key="status" value={refund.status} />,
                formatCurrency(refund.amount),
                formatDateTime(refund.requestedAt),
                refund.reason,
                refund.blockerNote ?? "-",
              ],
            }))}
          />
          <AdminPagination page={1} pageSize={10} total={adminRefundRequests.length} />
        </AdminPanel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminConfirmModal
          title="Approve mock refund?"
          description="The confirm button is visual only. Real approval requires a PG adapter, refund ledger, and settlement reconciliation."
          confirmLabel="Approve mock"
        />
        <AdminErrorState
          title="Real PG required"
          description="blocked_real_pg_required requests cannot move beyond review until production PG cancellation rules are approved."
          code="REAL_PG_REQUIRED"
        />
      </div>
    </AdminShell>
  );
}

export function AdminSettlementsPage() {
  return (
    <AdminShell
      title="Settlement review"
      subtitle="order_items-based mock settlement review. Payout execution is intentionally unavailable."
    >
      <AdminSearchSortBar
        searchLabel="company_id / period"
        searchValue="2026-05"
        filters={["All", "Draft", "Review", "Payout blocked", "Refund hold"]}
        sortOptions={["Period", "Payout blocked", "Largest payout"]}
        activeSort="Payout blocked"
        resultCount={adminSettlements.length}
      />
      <AdminNotice
        title="Payout execution blocked"
        description="Amounts are display-only mock calculations. The admin UI does not create bank transfer files, payout jobs, or settlement mutations."
        tone="red"
        label="No payout"
      />
      <div className="mt-4">
        <AdminPanel title="Settlement queue" eyebrow="Day 4">
          <DataTable
            columns={["Period", "company_id", "Company", "Status", "Gross", "Commission", "Refund hold", "Payout", "Items"]}
            rows={adminSettlements.map((settlement) => ({
              id: settlement.id,
              cells: [
                settlement.period,
                settlement.companyId,
                settlement.companyName,
                <Status key="status" value={settlement.status} />,
                formatCurrency(settlement.grossAmount),
                formatCurrency(settlement.commissionAmount),
                formatCurrency(settlement.refundHoldAmount),
                formatCurrency(settlement.payoutAmount),
                settlement.orderItemCount,
              ],
            }))}
          />
        </AdminPanel>
      </div>
      <div className="mt-4">
        <AdminPanel title="order_items settlement basis" eyebrow="Calculation preview">
          <DataTable
            columns={["Order", "company_id", "Product", "Qty", "Gross", "Commission", "Refund hold", "Payout"]}
            rows={adminSettlementItems.map((item) => ({
              id: item.id,
              cells: [
                item.orderNo,
                item.companyId,
                item.productName,
                item.quantity,
                formatCurrency(item.grossAmount),
                formatCurrency(item.commissionAmount),
                formatCurrency(item.refundHold),
                formatCurrency(item.payoutAmount),
              ],
            }))}
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

export function AdminIntegrationsPage() {
  return (
    <AdminShell
      title="External integration readiness"
      subtitle="Mock readiness board for notification, delivery, inventory, storage, and payment integrations."
    >
      <AdminSearchSortBar
        searchLabel="integration"
        searchValue="mock readiness"
        filters={["All", "Mock ready", "Official docs required", "Secret required", "Production blocked"]}
        sortOptions={["Category", "Blocked first", "Owner"]}
        activeSort="Blocked first"
        resultCount={adminExternalIntegrations.length}
      />
      <AdminPanel title="Integration status" eyebrow="Batch 12">
        <DataTable
          columns={["Integration", "Category", "Status", "Owner", "Last checked", "Blocker"]}
          rows={adminExternalIntegrations.map((integration) => ({
            id: integration.id,
            cells: [
              integration.name,
              integration.category,
              <Status key="status" value={integration.status} />,
              integration.owner,
              formatDateTime(integration.lastCheckedAt),
              integration.blocker,
            ],
          }))}
        />
        <AdminPagination page={1} pageSize={10} total={adminExternalIntegrations.length} />
      </AdminPanel>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminErrorState
          title="Secrets unavailable"
          description="No .env, secret key, service account, or production credential file is created in this track."
          code="SECRET_REQUIRED"
        />
        <AdminEmptyState
          title="No live adapter configured"
          description="Every external integration stays in mock/stub mode until official docs, credentials, and QA gates are complete."
        />
      </div>
    </AdminShell>
  );
}

export function AdminRisksPage() {
  return (
    <AdminShell
      title="Operations risk dashboard"
      subtitle="High, medium, and low risk status board for production blockers and mock mitigations."
    >
      <AdminSearchSortBar
        searchLabel="risk"
        searchValue="production blockers"
        filters={["All", "High", "Medium", "Low", "Open", "Watching", "Mock mitigated"]}
        sortOptions={["Severity", "Owner", "Status"]}
        activeSort="Severity"
        resultCount={adminOperationRisks.length}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminOperationRisks.map((risk) => (
          <AdminPanel
            key={risk.id}
            title={risk.title}
            eyebrow={risk.owner}
            action={<Status value={risk.severity} />}
          >
            <div className="mb-3">
              <Status value={risk.status} />
            </div>
            <div className="mb-3">
              <AdminRiskBadge
                status={
                  risk.status === "open"
                    ? "blocked"
                    : risk.status === "watching"
                      ? "needs_approval"
                      : "mock_ready"
                }
              />
            </div>
            <p className="text-sm leading-6 text-slate-600">{risk.mitigation}</p>
          </AdminPanel>
        ))}
      </div>
    </AdminShell>
  );
}

export function AdminSearchPage() {
  return (
    <AdminShell
      title="Unified admin search"
      subtitle="Static mock search across order numbers, QR codes, companies, nurseries, rooms, and tablet IDs."
    >
      <AdminDataSurface
        title="Search result surface"
        searchLabel="Global search"
        searchValue="SANHO701 / A5 / tablet"
        filters={["Order number", "QR code", "Company", "Nursery", "Room", "Tablet ID"]}
        sortOptions={["Relevance", "Newest", "Risk"]}
        activeSort="Relevance"
        columns={["Target", "Label", "Value", "Status", "Link"]}
        rows={adminSearchResults.map((result) => ({
          id: result.id,
          cells: [
            result.target,
            result.label,
            result.value,
            <Status key="status" value={result.status} />,
            <Link key="href" href={result.href} className="font-semibold text-blue-700">
              Open mock
            </Link>,
          ],
        }))}
        emptyTitle="No search results"
        emptyDescription="Search is a static mock. A real index is blocked until repository interfaces are approved."
        footer={
          <div className="grid gap-4 lg:grid-cols-2">
            <AdminNotice
              title="Search scope"
              description="This page documents expected search targets only. It does not query live data or store search history."
              tone="blue"
              label="Mock"
            />
            <AdminErrorState
              title="Search index unavailable"
              description="The unified search index is not connected to Firestore or any external search provider."
              code="SEARCH_INDEX_MOCK"
            />
          </div>
        }
      />
    </AdminShell>
  );
}

export function AdminPermissionsPage() {
  return (
    <AdminShell
      title="Role permission matrix mock"
      subtitle="Permission coverage for SUPER_ADMIN, COMPANY_ADMIN, NURSERY_ADMIN, and TABLET_DEVICE."
    >
      <AdminDataSurface
        title="Role permission matrix"
        searchLabel="role"
        searchValue="SUPER_ADMIN"
        filters={["SUPER_ADMIN", "COMPANY_ADMIN", "NURSERY_ADMIN", "TABLET_DEVICE"]}
        sortOptions={["Role", "Scope", "Production action"]}
        activeSort="Role"
        columns={["Role", "Scope", "View", "Mock approve", "Export", "Production action"]}
        rows={adminPermissionMatrix.map((row) => ({
          id: row.id,
          cells: [
            row.role,
            row.scope,
            row.canView ? "yes" : "no",
            row.canMockApprove ? "yes" : "no",
            row.canExport ? "yes" : "no",
            <Status key="action" value={row.productionAction} />,
          ],
        }))}
        emptyTitle="No permission rows"
        emptyDescription="No role permission rows are available."
      />
    </AdminShell>
  );
}

export function AdminExportsPage() {
  return (
    <AdminShell
      title="Export preview mock"
      subtitle="CSV, XLSX, and PDF exports are represented as disabled previews. No files are generated."
    >
      <AdminDataSurface
        title="Export preview"
        searchLabel="export"
        searchValue="orders / settlements / risk"
        filters={["csv", "xlsx", "pdf", "needs approval", "production forbidden"]}
        sortOptions={["Name", "Format", "Blocked first"]}
        activeSort="Blocked first"
        columns={["Name", "Format", "Status", "Rows", "Blocker"]}
        rows={adminExportPreviews.map((item) => ({
          id: item.id,
          cells: [
            item.name,
            item.format,
            <Status key="status" value={item.status} />,
            item.rows,
            item.blocker,
          ],
        }))}
        emptyTitle="No export previews"
        emptyDescription="Export preview rows are static and do not generate files."
      />
    </AdminShell>
  );
}

export function AdminSlaPage() {
  return (
    <AdminShell
      title="SLA aging mock"
      subtitle="Aging queue for approvals, refunds, settlements, and risks."
    >
      <AdminDataSurface
        title="SLA aging"
        searchLabel="queue"
        searchValue="refund / settlement"
        filters={["company approval", "product approval", "refund", "settlement", "risk"]}
        sortOptions={["Oldest", "Severity", "Owner"]}
        activeSort="Oldest"
        columns={["Queue", "Target", "Age hours", "Severity", "Owner", "Next action"]}
        rows={adminSlaAging.map((item) => ({
          id: item.id,
          cells: [
            item.queue,
            item.target,
            item.ageHours,
            <Status key="severity" value={item.severity} />,
            item.owner,
            item.nextAction,
          ],
        }))}
        emptyTitle="No SLA rows"
        emptyDescription="All mock queues are empty for this filter."
      />
    </AdminShell>
  );
}

export function AdminDataQualityPage() {
  return (
    <AdminShell
      title="Data quality dashboard"
      subtitle="Mock quality checks for QR source, rooms, settlement accounts, tablets, and product pricing."
    >
      <AdminDataSurface
        title="Data quality issues"
        searchLabel="issue"
        searchValue="missing source / stale tablet"
        filters={["QR source", "Room", "Settlement account", "Tablet", "Product price"]}
        sortOptions={["Count", "Blocked first", "Area"]}
        activeSort="Blocked first"
        columns={["Area", "Title", "Status", "Count", "Resolution"]}
        rows={adminDataQualityIssues.map((issue) => ({
          id: issue.id,
          cells: [
            issue.area,
            issue.title,
            <Status key="status" value={issue.status} />,
            issue.count,
            issue.resolution,
          ],
        }))}
        emptyTitle="No data quality issues"
        emptyDescription="No quality issues are available for this mock filter."
      />
    </AdminShell>
  );
}

export function AdminReleaseReadinessPage() {
  return (
    <AdminShell
      title="Release readiness mock"
      subtitle="Mock/test beta release readiness board. Production launch remains blocked by platform decisions."
    >
      <AdminDataSurface
        title="Release readiness"
        searchLabel="readiness"
        searchValue="blocked areas"
        filters={["Firebase", "PG", "Notification", "Admin UI"]}
        sortOptions={["Blocked first", "Owner", "Area"]}
        activeSort="Blocked first"
        columns={["Area", "Status", "Owner", "Note"]}
        rows={adminReleaseReadiness.map((item) => ({
          id: item.id,
          cells: [
            item.area,
            <Status key="status" value={item.status} />,
            item.owner,
            item.note,
          ],
        }))}
        emptyTitle="No readiness rows"
        emptyDescription="No release readiness rows are available."
      />
    </AdminShell>
  );
}

export function AdminQueueOwnershipPage() {
  const rows = [
    { id: "owner-finance", owner: "Finance", queue: "Refunds / settlements", open: 7, risk: "high" },
    { id: "owner-firebase", owner: "Firebase contract", queue: "Rules / claims / storage", open: 5, risk: "high" },
    { id: "owner-ops", owner: "Operations", queue: "Alimtalk / templates", open: 3, risk: "medium" },
    { id: "owner-logistics", owner: "Logistics", queue: "Delivery lookup", open: 2, risk: "medium" },
  ];

  return (
    <AdminShell
      title="Queue ownership mock"
      subtitle="Owner/team view for unresolved admin queues and production blockers."
    >
      <AdminDataSurface
        title="Queue owners"
        searchLabel="owner"
        searchValue="Finance / Firebase"
        filters={["Finance", "Firebase", "Operations", "Logistics"]}
        sortOptions={["Risk", "Open count", "Owner"]}
        activeSort="Risk"
        columns={["Owner", "Queue", "Open", "Risk"]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [row.owner, row.queue, row.open, <Status key="risk" value={row.risk} />],
        }))}
        emptyTitle="No queue owners"
        emptyDescription="No queue ownership rows are available."
      />
    </AdminShell>
  );
}

export function AdminChangeRequestsPage() {
  const rows = [
    { id: "cr-company-approve", request: "Approve company", target: "company-momtable", status: "needs_approval", risk: "medium" },
    { id: "cr-payout", request: "Unblock payout", target: "settlement-bebe-202605", status: "production_forbidden", risk: "high" },
    { id: "cr-product-price", request: "Approve price change", target: "product-care-kit", status: "needs_approval", risk: "medium" },
  ];

  return (
    <AdminShell
      title="Change request mock"
      subtitle="High-risk admin action requests are visual only and do not mutate data."
    >
      <AdminDataSurface
        title="Change requests"
        searchLabel="request"
        searchValue="approve / payout / price"
        filters={["Approval", "Payout", "Price", "Blocked"]}
        sortOptions={["Risk", "Status", "Target"]}
        activeSort="Risk"
        columns={["Request", "Target", "Status", "Risk"]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [row.request, row.target, <Status key="status" value={row.status} />, <Status key="risk" value={row.risk} />],
        }))}
        emptyTitle="No change requests"
        emptyDescription="No change requests are available for this mock filter."
        footer={
          <AdminConfirmModal
            title="Approve high-risk change?"
            description="This modal is static and does not save or call any server action."
            confirmLabel="Approve mock"
          />
        }
      />
    </AdminShell>
  );
}

export function AdminPrivacyReviewPage() {
  const rows = [
    { id: "privacy-customer", area: "Guest payer", status: "needs_approval", note: "No full phone or real customer data in mock." },
    { id: "privacy-account", area: "Settlement account", status: "blocked", note: "Masked account only; changes require audit." },
    { id: "privacy-export", area: "Exports", status: "production_forbidden", note: "Export preview only; no file generation." },
  ];

  return (
    <AdminShell
      title="Privacy review mock"
      subtitle="Privacy-sensitive admin surfaces and safe mock decisions."
    >
      <AdminDataSurface
        title="Privacy review"
        searchLabel="area"
        searchValue="payer / account / export"
        filters={["Guest payer", "Settlement account", "Export"]}
        sortOptions={["Blocked first", "Area", "Status"]}
        activeSort="Blocked first"
        columns={["Area", "Status", "Note"]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [row.area, <Status key="status" value={row.status} />, row.note],
        }))}
        emptyTitle="No privacy rows"
        emptyDescription="No privacy review rows are available."
      />
    </AdminShell>
  );
}

export function AdminIncidentsPage() {
  const rows = [
    { id: "incident-pg", area: "PG", status: "blocked", severity: "high", response: "Keep mock ledger only." },
    { id: "incident-firebase", area: "Firebase", status: "blocked", severity: "high", response: "Do not create rules/config files." },
    { id: "incident-notification", area: "Notification", status: "docs_required", severity: "medium", response: "Do not send Alimtalk." },
  ];

  return (
    <AdminShell
      title="Incident response mock"
      subtitle="Operational incident playbook preview for admin blockers."
    >
      <AdminDataSurface
        title="Incident response"
        searchLabel="incident"
        searchValue="PG / Firebase / notification"
        filters={["PG", "Firebase", "Notification"]}
        sortOptions={["Severity", "Status", "Area"]}
        activeSort="Severity"
        columns={["Area", "Status", "Severity", "Response"]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [row.area, <Status key="status" value={row.status} />, <Status key="severity" value={row.severity} />, row.response],
        }))}
        emptyTitle="No incidents"
        emptyDescription="No incident rows are available."
      />
    </AdminShell>
  );
}

export function AdminOnboardingPage() {
  const items = [
    { id: "onboard-route", label: "Route smoke reviewed", done: false, owner: "QA" },
    { id: "onboard-states", label: "State coverage reviewed", done: true, owner: "Admin track" },
    { id: "onboard-blockers", label: "High blockers assigned", done: true, owner: "Operations" },
    { id: "onboard-build", label: "Build/lint executed", done: false, owner: "QA" },
  ];

  return (
    <AdminShell
      title="Admin onboarding checklist"
      subtitle="Mock checklist for handing admin beta screens to QA and product reviewers."
    >
      <AdminPanel title="Onboarding checklist" eyebrow="Batch 65">
        <AdminChecklist items={items} />
      </AdminPanel>
    </AdminShell>
  );
}

export function AdminAccessibilityPage() {
  const rows = [
    { id: "a11y-badge", item: "Risk badges use text labels", status: "mock_ready", note: "Color is not the only signal." },
    { id: "a11y-table", item: "Tables retain text headers", status: "mock_ready", note: "DataTable headers remain visible." },
    { id: "a11y-focus", item: "Keyboard focus review", status: "needs_approval", note: "Needs browser QA after dev server is allowed." },
  ];

  return (
    <AdminShell title="Accessibility checklist mock" subtitle="Static accessibility review for admin beta screens.">
      <AdminDataSurface
        title="Accessibility checklist"
        searchLabel="a11y"
        searchValue="badge / table / focus"
        filters={["Badges", "Tables", "Focus"]}
        sortOptions={["Status", "Item", "Risk"]}
        activeSort="Status"
        columns={["Item", "Status", "Note"]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [row.item, <Status key="status" value={row.status} />, row.note],
        }))}
        emptyTitle="No accessibility rows"
        emptyDescription="No accessibility rows are available."
      />
    </AdminShell>
  );
}

export function AdminLocalizationPage() {
  const rows = [
    { id: "loc-ascii", area: "ASCII labels", status: "mock_ready", note: "English labels avoid worsening existing mojibake." },
    { id: "loc-ko", area: "Korean copy", status: "needs_approval", note: "Korean copy should be reintroduced after encoding cleanup." },
    { id: "loc-currency", area: "KRW formatting", status: "mock_ready", note: "formatCurrency keeps KRW display." },
  ];

  return (
    <AdminShell title="Localization checklist mock" subtitle="Static localization and encoding readiness review.">
      <AdminDataSurface
        title="Localization checklist"
        searchLabel="localization"
        searchValue="copy / currency"
        filters={["ASCII", "Korean copy", "KRW"]}
        sortOptions={["Status", "Area"]}
        activeSort="Status"
        columns={["Area", "Status", "Note"]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [row.area, <Status key="status" value={row.status} />, row.note],
        }))}
        emptyTitle="No localization rows"
        emptyDescription="No localization rows are available."
      />
    </AdminShell>
  );
}

export function AdminPerformanceBudgetPage() {
  const rows = [
    { id: "perf-static", area: "Static mock pages", status: "mock_ready", budget: "No runtime fetch" },
    { id: "perf-table", area: "Large tables", status: "needs_approval", budget: "Pagination required before real data" },
    { id: "perf-image", area: "Image placeholders", status: "mock_ready", budget: "No remote assets" },
  ];

  return (
    <AdminShell title="Performance budget mock" subtitle="Static budget review for admin mock screens.">
      <AdminDataSurface
        title="Performance budget"
        searchLabel="performance"
        searchValue="tables / images"
        filters={["Static", "Tables", "Images"]}
        sortOptions={["Status", "Area"]}
        activeSort="Status"
        columns={["Area", "Status", "Budget"]}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [row.area, <Status key="status" value={row.status} />, row.budget],
        }))}
        emptyTitle="No performance rows"
        emptyDescription="No performance rows are available."
      />
    </AdminShell>
  );
}

export function AdminMergeReadinessPage() {
  return (
    <AdminShell title="Merge readiness mock" subtitle="Admin track merge safety review.">
      <AdminDataSurface
        title="Merge readiness"
        searchLabel="merge"
        searchValue="admin-only"
        filters={["Admin scope", "Reports", "No git", "No build"]}
        sortOptions={["Risk", "Area"]}
        activeSort="Risk"
        columns={["Area", "Status", "Note"]}
        rows={[
          { id: "merge-scope", cells: ["Allowed paths", <Status key="status" value="mock_ready" />, "Only app/admin, components/admin, data/admin, types/admin.ts, reports/admin were used."] },
          { id: "merge-shared", cells: ["Shared layout", <Status key="status" value="needs_approval" />, "Shared sidebar mobile behavior was not modified."] },
          { id: "merge-build", cells: ["Build/lint", <Status key="status" value="blocked" />, "Forbidden in unattended mode."] },
        ]}
        emptyTitle="No merge rows"
        emptyDescription="No merge readiness rows are available."
      />
    </AdminShell>
  );
}

export function AdminHandoffPage() {
  return (
    <AdminShell title="Admin handoff summary" subtitle="Final mock handoff for QA, product, and Firebase contract review.">
      <div className="grid gap-4 xl:grid-cols-2">
        <AdminNotice
          title="Mock package ready for human review"
          description="Admin UI, data, state coverage, route map, and blockers are documented under reports/admin."
          tone="green"
          label="Mock ready"
        />
        <AdminErrorState
          title="Production still blocked"
          description="Firebase, PG, payout, refund, notification, delivery, inventory, deploy, build, lint, and git actions were not executed."
          code="PRODUCTION_BLOCKED"
        />
      </div>
      <div className="mt-4">
        <AdminPanel title="Handoff checklist" eyebrow="Batch 70">
          <AdminChecklist
            items={[
              { id: "handoff-report", label: "AUTO_REPORT updated", done: true, owner: "Admin track" },
              { id: "handoff-routes", label: "ROUTE_MAP updated", done: true, owner: "Admin track" },
              { id: "handoff-states", label: "STATE_COVERAGE updated", done: true, owner: "Admin track" },
              { id: "handoff-build", label: "Build/lint run", done: false, owner: "QA" },
            ]}
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

export function AdminPaymentDetailPage() {
  const payment = adminPayments[0];

  return (
    <AdminShell
      title="Payment detail mock"
      subtitle="Static payment ledger detail. No real PG call, capture, cancel, or refund execution exists here."
    >
      <AdminDefinitionGrid
        items={[
          { label: "payment_id", value: payment.paymentId },
          { label: "order_id", value: payment.orderId },
          { label: "mock_pg_tid", value: payment.mockTid },
          { label: "amount", value: formatCurrency(payment.amount) },
          { label: "status", value: payment.status, tone: statusTone[payment.status] },
          { label: "failed_reason", value: payment.failedReason ?? "-" },
        ]}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminErrorState
          title="Real PG call forbidden"
          description="Payment detail is a ledger mock. Real capture/cancel/refund methods are not imported or called."
          code="PG_FORBIDDEN"
        />
        <AdminConfirmModal
          title="Mark mock payment reviewed?"
          description="This is visual confirmation only and does not write to a database."
          confirmLabel="Reviewed mock"
        />
      </div>
    </AdminShell>
  );
}

export function AdminRefundDetailPage() {
  const refund = adminRefundRequests[0];

  return (
    <AdminShell
      title="Refund detail mock"
      subtitle="Static refund and partial-cancel review. Production PG reversal remains blocked."
    >
      <AdminDefinitionGrid
        items={[
          { label: "refund_id", value: refund.refundId },
          { label: "order_id", value: refund.orderId },
          { label: "order_no", value: refund.orderNo },
          { label: "payment_id", value: refund.paymentId },
          { label: "type", value: refund.type },
          { label: "status", value: refund.status, tone: statusTone[refund.status] },
          { label: "amount", value: formatCurrency(refund.amount) },
          { label: "company_id", value: refund.companyId },
        ]}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminNotice
          title="Review reason"
          description={refund.reason}
          tone="amber"
          label="Review"
        />
        <AdminErrorState
          title="Partial cancel blocked"
          description={refund.blockerNote ?? "Production refund rules are not approved."}
          code="REFUND_BLOCKED"
        />
      </div>
    </AdminShell>
  );
}

export function AdminSettlementDetailPage() {
  const settlement = adminSettlements[0];
  const items = adminSettlementItems.filter((item) => item.companyId === settlement.companyId);

  return (
    <AdminShell
      title="Settlement detail mock"
      subtitle="Static settlement detail using order_items. Real payout and bank transfer execution are forbidden."
    >
      <AdminDefinitionGrid
        items={[
          { label: "settlement_id", value: settlement.id },
          { label: "company_id", value: settlement.companyId },
          { label: "order_item_count", value: settlement.orderItemCount },
          { label: "amount", value: formatCurrency(settlement.grossAmount) },
          { label: "fee", value: formatCurrency(settlement.commissionAmount) },
          { label: "payout_status", value: settlement.status, tone: statusTone[settlement.status] },
        ]}
      />
      <div className="mt-4">
        <AdminPanel title="Settlement order_items" eyebrow="No payout execution">
          <DataTable
            columns={["Order", "Product", "Gross", "Commission", "Refund hold", "Payout"]}
            rows={items.map((item) => ({
              id: item.id,
              cells: [
                item.orderNo,
                item.productName,
                formatCurrency(item.grossAmount),
                formatCurrency(item.commissionAmount),
                formatCurrency(item.refundHold),
                formatCurrency(item.payoutAmount),
              ],
            }))}
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

export function AdminNotificationsPage() {
  return (
    <AdminShell
      title="Notification logs mock"
      subtitle="Notification event ledger for order, payment, delivery, and refund events. No Alimtalk send is connected."
    >
      <AdminDataSurface
        title="notification_logs"
        searchLabel="notification event"
        searchValue="failed_template_missing"
        filters={["order_created", "payment_success", "delivery_started", "refund_requested", "failed_template_missing"]}
        sortOptions={["Newest", "Failed first", "Event"]}
        activeSort="Failed first"
        columns={["Event", "Target", "Status", "Created", "Message"]}
        rows={adminNotificationLogs.map((log) => ({
          id: log.id,
          cells: [
            log.event,
            log.target,
            <Status key="status" value={log.status} />,
            formatDateTime(log.createdAt),
            log.message,
          ],
        }))}
        emptyTitle="No notification logs"
        emptyDescription="No notification rows exist for the selected mock filter."
      />
    </AdminShell>
  );
}

export function AdminDeliveryEventsPage() {
  return (
    <AdminShell
      title="Delivery and pickup event logs"
      subtitle="Delivery events and pickup events are separated. No live carrier tracking API is called."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <AdminPanel title="delivery_events" eyebrow="Carrier mock">
          <DataTable
            columns={["Order", "Carrier", "Status", "Occurred", "Memo"]}
            rows={adminDeliveryEvents.map((event) => ({
              id: event.id,
              cells: [
                event.orderNo,
                event.carrier,
                <Status key="status" value={event.status} />,
                formatDateTime(event.occurredAt),
                event.memo,
              ],
            }))}
          />
        </AdminPanel>
        <AdminPanel title="pickup_events" eyebrow="Nursery handoff mock">
          <DataTable
            columns={["Order", "nursery_id", "room_id", "Status", "Occurred", "Memo"]}
            rows={adminPickupEvents.map((event) => ({
              id: event.id,
              cells: [
                event.orderNo,
                event.nurseryId,
                event.roomId,
                <Status key="status" value={event.status} />,
                formatDateTime(event.occurredAt),
                event.memo,
              ],
            }))}
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

export function AdminInventorySyncPage() {
  return (
    <AdminShell
      title="External inventory sync mock"
      subtitle="External inventory API status board. No external stock API is called."
    >
      <AdminDataSurface
        title="external_inventory_sync"
        searchLabel="external code"
        searchValue="EXT / LUX / MOM"
        filters={["mock_ready", "official_docs_required", "secret_required", "blocked"]}
        sortOptions={["Blocked first", "Company", "Stock"]}
        activeSort="Blocked first"
        columns={["company_id", "External code", "Product", "Status", "Last checked", "Stock", "Blocker"]}
        rows={adminInventorySync.map((item) => ({
          id: item.id,
          cells: [
            item.companyId,
            item.externalCode,
            item.productName,
            <Status key="status" value={item.status} />,
            formatDateTime(item.lastCheckedAt),
            item.stockSnapshot,
            item.blocker,
          ],
        }))}
        emptyTitle="No inventory sync rows"
        emptyDescription="No external inventory mock rows are available."
      />
    </AdminShell>
  );
}

export function AdminAuditLogDetailPage() {
  return (
    <AdminShell
      title="Audit log detail mock"
      subtitle="Static audit detail for permission, amount, status, approval/rejection, and risk-button click events."
    >
      <AdminActionTimeline
        items={[
          ...adminDetailTimeline,
          {
            id: "timeline-risk-click",
            title: "Risk button clicked",
            at: "2026-05-20 11:10",
            actor: "SUPER_ADMIN",
            detail: "Danger action opened a confirmation modal only. No mutation was executed.",
            tone: "amber",
          },
        ]}
      />
    </AdminShell>
  );
}

export function AdminCompanyDetailPage() {
  const company = adminCompanies[0];
  const companyProducts = adminProductApprovals.filter((product) => product.companyId === company.id);
  const companyOrderItems = adminOrderItems.filter((item) => item.companyId === company.id);
  const companySettlements = adminSettlements.filter((settlement) => settlement.companyId === company.id);

  return (
    <AdminShell
      title="Company detail mock"
      subtitle="Static company detail view for approval, commission, settlement masking, and company_id-scoped review."
    >
      <AdminTabs
        tabs={["Basic", "Products", "Orders", "Settlements", "Logs", "Admin accounts"]}
        activeTab="Basic"
      />
      <AdminDefinitionGrid
        items={[
          { label: "company_id", value: company.id },
          { label: "Company", value: company.name },
          { label: "Manager", value: company.managerName },
          { label: "Status", value: company.status, tone: statusTone[company.status] },
          { label: "Commission", value: formatPercent(company.commissionRate) },
          { label: "Settlement account", value: company.maskedSettlementAccount },
          { label: "Order count", value: company.orderCount },
          { label: "Pending payout", value: formatCurrency(company.pendingSettlementAmount) },
        ]}
      />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <AdminPanel title="Company-scoped products" eyebrow="Filtered by company_id">
          <DataTable
            columns={["product_id", "Product", "Status", "Closed mall", "Stock"]}
            rows={companyProducts.map((product) => ({
              id: product.id,
              cells: [
                product.productId,
                product.name,
                <Status key="status" value={product.status} />,
                formatCurrency(product.closedMallPrice),
                product.stock,
              ],
            }))}
          />
          {companyProducts.length === 0 ? (
            <div className="mt-3">
              <AdminEmptyState title="No products" description="No product rows are available for this company_id." />
            </div>
          ) : null}
        </AdminPanel>
        <AdminPanel title="Review timeline" eyebrow="Mock detail">
          <AdminActionTimeline items={adminDetailTimeline} />
        </AdminPanel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel title="Orders tab" eyebrow="Filtered order_items">
          <DataTable
            columns={["Order", "Product", "Qty", "Delivery", "Settlement"]}
            rows={companyOrderItems.map((item) => ({
              id: item.id,
              cells: [
                item.orderNo,
                item.productName,
                item.quantity,
                <Status key="delivery" value={item.deliveryStatus} />,
                <Status key="settlement" value={item.settlementStatus} />,
              ],
            }))}
          />
        </AdminPanel>
        <AdminPanel title="Admin accounts tab" eyebrow="Mock accounts">
          <DataTable
            columns={["Account", "Role", "Status", "Last login"]}
            rows={[
              {
                id: "account-company-owner",
                cells: ["owner@sanho-care.test", "COMPANY_ADMIN", <Status key="status" value="approved" />, "2026-05-20 09:20"],
              },
              {
                id: "account-company-staff",
                cells: ["staff@sanho-care.test", "COMPANY_STAFF", <Status key="status" value="pending" />, "not logged in"],
              },
            ]}
          />
        </AdminPanel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <AdminLoadingState title="Products tab loading state" />
        <AdminErrorState
          title="Logs tab error state"
          description="A real audit query is not connected. This panel documents the error presentation only."
          code="MOCK_QUERY_ONLY"
        />
        <AdminNotice
          title="Risk badge sample"
          description="Suspension, rejected approval, payout block, and account mutation actions require human review."
          tone="red"
          label="high"
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminConfirmModal
          title="Approve company?"
          description="This modal is static. A real approval must update Auth claims and company documents through server-authorized code."
          confirmLabel="Approve mock"
        />
        <AdminPanel title="Settlement preview" eyebrow="Masked payout">
          <DataTable
            columns={["Period", "Status", "Gross", "Payout"]}
            rows={companySettlements.map((settlement) => ({
              id: settlement.id,
              cells: [
                settlement.period,
                <Status key="status" value={settlement.status} />,
                formatCurrency(settlement.grossAmount),
                formatCurrency(settlement.payoutAmount),
              ],
            }))}
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

export function AdminNurseryDetailPage() {
  const nursery = adminNurseries[0];
  const rooms = adminRooms.filter((room) => room.nurseryId === nursery.nurseryId);
  const tablets = adminTablets.filter((tablet) => tablet.nurseryId === nursery.nurseryId);
  const qrSources = adminQrSources.filter((source) => source.nurseryId === nursery.nurseryId);

  return (
    <AdminShell
      title="Nursery detail mock"
      subtitle="Static nursery detail view for room, tablet, pickup, and QR provenance review."
    >
      <AdminDefinitionGrid
        items={[
          { label: "nursery_id", value: nursery.nurseryId },
          { label: "Name", value: nursery.name },
          { label: "Region", value: nursery.region },
          { label: "Status", value: nursery.status, tone: statusTone[nursery.status] },
          { label: "Rooms", value: nursery.roomCount },
          { label: "Tablets", value: nursery.tabletCount },
        ]}
      />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel title="Rooms in nursery" eyebrow="room_id scope">
          <DataTable
            columns={["room_id", "Room", "Floor", "Tablet", "Pickup", "Status"]}
            rows={rooms.map((room) => ({
              id: room.id,
              cells: [
                room.roomId,
                room.roomNumber,
                room.floor,
                room.tabletId ?? "unassigned",
                room.pickupEnabled ? "enabled" : "disabled",
                <Status key="status" value={room.status} />,
              ],
            }))}
          />
        </AdminPanel>
        <AdminPanel title="Tablets in nursery" eyebrow="tablet_id scope">
          <DataTable
            columns={["tablet_id", "room_id", "Status", "Access", "Last seen"]}
            rows={tablets.map((tablet) => ({
              id: tablet.id,
              cells: [
                tablet.tabletId,
                tablet.roomId,
                <Status key="status" value={tablet.status} />,
                <Status key="access" value={tablet.accessState} />,
                formatDateTime(tablet.lastSeenAt),
              ],
            }))}
          />
        </AdminPanel>
      </div>
      <div className="mt-4">
        <AdminPanel title="QR provenance for nursery" eyebrow="Trace review">
          <DataTable
            columns={["short_code", "qr_session_id", "room_id", "tablet_id", "Status", "Order"]}
            rows={qrSources.map((source) => ({
              id: source.id,
              cells: [
                source.shortCode,
                source.qrSessionId,
                source.roomId,
                source.tabletId,
                <Status key="status" value={source.status} />,
                source.orderNo ?? "not ordered",
              ],
            }))}
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

export function AdminProductDetailPage() {
  const product = adminProductApprovals[0];

  return (
    <AdminShell
      title="Product approval detail mock"
      subtitle="Static approval detail view with price comparison, rejection reason, inventory state, and confirmation UI."
    >
      <AdminDefinitionGrid
        items={[
          { label: "product_id", value: product.productId },
          { label: "company_id", value: product.companyId },
          { label: "Company", value: product.companyName },
          { label: "Status", value: product.status, tone: statusTone[product.status] },
          { label: "List price", value: formatCurrency(product.listPrice) },
          { label: "Platform lowest", value: formatCurrency(product.platformLowestPrice) },
          { label: "Closed mall price", value: formatCurrency(product.closedMallPrice) },
          { label: "Price changed", value: product.priceChangedAfterApproval ? "yes" : "no", tone: product.priceChangedAfterApproval ? "amber" : "green" },
          { label: "Reapproval", value: product.reapprovalRequired ? "required" : "not required", tone: product.reapprovalRequired ? "red" : "green" },
        ]}
      />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <AdminPanel title="Approval review notes" eyebrow="Static mock">
          <div className="grid gap-3">
            <AdminImagePlaceholder label={product.name} tone={product.imagePlaceholderTone} />
            <AdminNotice
              title="Price comparison ready"
              description="The admin can inspect list price and closed mall price, but this screen does not write approval decisions."
              tone="blue"
              label="Review"
            />
            <AdminErrorState
              title="External stock adapter unavailable"
              description="Stock is mock-only. External mall inventory API calls are intentionally blocked in this admin track."
              code="MOCK_STOCK"
            />
          </div>
        </AdminPanel>
        <AdminConfirmModal
          title="Approve product?"
          description="Approving this product is represented as a static confirmation state. Real product writes require server-side approval logic."
          confirmLabel="Approve mock"
        />
      </div>
    </AdminShell>
  );
}

export function AdminOrderDetailPage() {
  const order = adminOrders[0];
  const payment = adminPayments.find((item) => item.orderNo === order.orderNo);
  const settlementItems = adminSettlementItems.filter((item) => item.orderNo === order.orderNo);

  return (
    <AdminShell
      title="Order detail mock"
      subtitle="Static order detail view with QR source, mock payment, receive method, and order_items settlement preview."
    >
      <AdminDefinitionGrid
        items={[
          { label: "order_no", value: order.orderNo },
          { label: "qr_session_id", value: order.qrSessionId },
          { label: "nursery_id", value: order.nurseryId },
          { label: "room_id", value: order.roomId },
          { label: "Order status", value: order.orderStatus, tone: statusTone[order.orderStatus] },
          { label: "Payment status", value: order.paymentStatus, tone: statusTone[order.paymentStatus] },
        ]}
      />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <AdminPanel title="order_items settlement preview" eyebrow="No payout execution">
          <DataTable
            columns={["company_id", "Product", "Qty", "Gross", "Refund hold", "Payout"]}
            rows={settlementItems.map((item) => ({
              id: item.id,
              cells: [
                item.companyId,
                item.productName,
                item.quantity,
                formatCurrency(item.grossAmount),
                formatCurrency(item.refundHold),
                formatCurrency(item.payoutAmount),
              ],
            }))}
          />
        </AdminPanel>
        <AdminPanel title="Payment snapshot" eyebrow="Mock PG">
          {payment ? (
            <AdminDefinitionGrid
              items={[
                { label: "Mock TID", value: payment.mockTid },
                { label: "Amount", value: formatCurrency(payment.amount) },
                { label: "Status", value: payment.status, tone: statusTone[payment.status] },
                { label: "Refund review", value: payment.refundReview, tone: statusTone[payment.refundReview] },
              ]}
            />
          ) : (
            <AdminEmptyState
              title="No payment snapshot"
              description="No mock payment was found for this static detail example."
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

export function AdminAuditLogsPage() {
  return (
    <AdminShell
      title="Audit and security logs"
      subtitle="Risk badges, security queue, empty/error states, and operation readiness checklist."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <AdminPanel title="Audit log" eyebrow="Day 5">
          <DataTable
            columns={["Time", "Role", "Actor", "Action", "Target", "Risk", "Message"]}
            rows={adminAuditLogs.map((log) => ({
              id: log.id,
              cells: [
                formatDateTime(log.createdAt),
                log.actorRole,
                log.actorName,
                log.action,
                log.target,
                <Status key="risk" value={log.riskLevel} />,
                log.message,
              ],
            }))}
          />
        </AdminPanel>
        <AdminPanel title="Operations checklist" eyebrow="Mock beta">
          <AdminChecklist items={adminChecklist} />
        </AdminPanel>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <AdminPanel title="Security log" eyebrow="Guardrail review">
          <DataTable
            columns={["Time", "Source", "Severity", "Message", "Resolution"]}
            rows={adminSecurityLogs.map((log) => ({
              id: log.id,
              cells: [
                formatDateTime(log.createdAt),
                log.source,
                <Status key="severity" value={log.severity} />,
                log.message,
                log.resolution,
              ],
            }))}
          />
        </AdminPanel>
        <div className="grid gap-4">
          <AdminConfirmModal
            title="Block settlement payout?"
            description="This modal is static UI only. Confirming would require a future server-authorized action and does not execute in the beta mock."
            confirmLabel="Keep blocked"
          />
          <AdminErrorState
            title="Adapter unavailable"
            description="Production Firebase, PG, payout, refund, delivery lookup, notification, and external stock adapters are intentionally unavailable."
            code="MOCK_ONLY"
          />
          <AdminEmptyState
            title="No unresolved UI error in admin mock"
            description="Runtime verification was intentionally skipped by instruction. QA should run the full route smoke after merge."
          />
        </div>
      </div>
    </AdminShell>
  );
}
