import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems } from "@/components/layout/navigation";
import { OperationsTable, type OperationsTableColumn } from "@/components/ui/OperationsTable";
import { commerceRepositories } from "@/lib/repositories";
import type { RepositoryResult } from "@/lib/repositories/types";
import { productMobilePath, productTabletPath } from "@/lib/storefront/productUrls";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { Company, Product } from "@/types/commerce";

type AdminGridData = {
  companies: Company[];
  products: Product[];
};

function repositoryDataOr<T>(result: RepositoryResult<T>, fallback: T): T {
  return result.ok ? result.data : fallback;
}

async function readAdminGridData(): Promise<AdminGridData> {
  const [companiesRead, productsRead] = await Promise.all([
    commerceRepositories.companies.listCompanies(),
    commerceRepositories.products.listProducts(),
  ]);

  return {
    companies: repositoryDataOr(companiesRead, []),
    products: repositoryDataOr(productsRead, []),
  };
}

function AdminGridShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sectionTitle="최고관리자"
      title={title}
      subtitle={subtitle}
      scopeLabel="운영 관리 콘솔"
      navItems={adminNavItems}
      accent="admin"
    >
      {children}
    </AppShell>
  );
}

function statusPill(label: string, tone: "green" | "amber" | "red" | "slate" = "slate") {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    red: "bg-rose-50 text-rose-800 ring-rose-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[tone];

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-normal ring-1 ${toneClass}`}>{label}</span>;
}

function companyStatus(company: Company) {
  if (company.status === "approved") return statusPill("운영중", "green");
  if (company.status === "pending") return statusPill("검토중", "amber");
  return statusPill("중지", "red");
}

function companyPgStatus(company: Company) {
  const status = company.pgProfile?.merchantStatus;
  if (status === "active") return statusPill("사용 가능", "green");
  if (status === "mid_issued") return statusPill("가맹점 입력", "amber");
  if (status === "in_review") return statusPill("심사중", "amber");
  if (status === "blocked") return statusPill("차단", "red");
  return statusPill("미등록", "slate");
}

function productStatus(product: Product) {
  if (product.status === "approved") return statusPill("판매중", "green");
  if (product.status === "pending_approval") return statusPill("예외 검토", "amber");
  if (product.status === "suspended" || product.status === "rejected") return statusPill("중지", "red");
  return statusPill(product.status, "slate");
}

function discountRate(product: Product) {
  if (product.priceComparisonVerified !== true) return 0;
  const listPrice = product.comparison?.listPrice ?? 0;
  const closedPrice = product.comparison?.closedMallPrice || product.price;
  if (!(listPrice > closedPrice && closedPrice > 0)) return 0;
  return Math.max(0, Math.round(((listPrice - closedPrice) / listPrice) * 100));
}

function discountBucket(rate: number) {
  if (rate >= 51) return "51% 이상";
  if (rate >= 36) return "36~50%";
  if (rate >= 21) return "21~35%";
  if (rate >= 10) return "10~20%";
  return "해당 없음";
}

function actionLink(href: string, label: string, primary = false) {
  return (
    <Link
      href={href}
      className={`inline-flex rounded-md px-3 py-2 text-xs font-normal ${
        primary ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

const companyColumns: OperationsTableColumn[] = [
  { key: "no", label: "번호", width: "56px", align: "right", sticky: "left" },
  { key: "status", label: "상태", width: "92px" },
  { key: "company", label: "입점기업", width: "220px", sticky: "left" },
  { key: "businessNo", label: "사업자번호", width: "130px" },
  { key: "representative", label: "대표자", width: "130px" },
  { key: "companyId", label: "기업 ID", width: "210px" },
  { key: "manager", label: "담당자", width: "130px" },
  { key: "contact", label: "연락처/이메일", width: "190px" },
  { key: "profile", label: "기본정보", width: "230px" },
  { key: "pg", label: "PG 상태", width: "120px" },
  { key: "merchant", label: "가맹점 ID", width: "150px" },
  { key: "fee", label: "수수료", width: "90px", align: "right" },
  { key: "products", label: "상품", width: "80px", align: "right" },
  { key: "pending", label: "예외", width: "80px", align: "right" },
  { key: "actions", label: "설정", width: "190px", sticky: "right" },
];

const productColumns: OperationsTableColumn[] = [
  { key: "no", label: "번호", width: "56px", align: "right", sticky: "left" },
  { key: "status", label: "상태", width: "100px" },
  { key: "product", label: "상품명", width: "250px", sticky: "left" },
  { key: "company", label: "입점기업", width: "180px" },
  { key: "businessNo", label: "사업자번호", width: "130px" },
  { key: "category", label: "카테고리", width: "140px" },
  { key: "listPrice", label: "원판매가", width: "120px", align: "right" },
  { key: "openPrice", label: "오픈몰가", width: "120px", align: "right" },
  { key: "closedPrice", label: "폐쇄몰가", width: "120px", align: "right" },
  { key: "discount", label: "할인율", width: "90px", align: "right" },
  { key: "bucket", label: "자동 배너", width: "110px" },
  { key: "stock", label: "재고", width: "80px", align: "right" },
  { key: "urls", label: "URL", width: "170px" },
  { key: "actions", label: "설정", width: "190px", sticky: "right" },
];

export async function AdminCompaniesGridPage() {
  const data = await readAdminGridData();
  const productCountByCompany = new Map<string, number>();

  for (const product of data.products) {
    productCountByCompany.set(product.companyId, (productCountByCompany.get(product.companyId) ?? 0) + 1);
  }

  return (
    <AdminGridShell
      title="입점기업 관리"
      subtitle="업체 목록을 엑셀형으로 보고, 업체 단위로 PG 설정과 상품 현황을 처리합니다."
    >
      <OperationsTable
        caption={`등록 업체 ${data.companies.length}개 / 업체별 설정은 오른쪽 설정 칸에서 처리`}
        columns={companyColumns}
        rows={data.companies.map((company, index) => ({
          id: company.id,
          cells: {
            no: index + 1,
            status: companyStatus(company),
            company: <span className="font-normal text-slate-950">{company.name}</span>,
            businessNo: company.businessRegistrationNumberNormalized || company.businessRegistrationNumber || "확인 전",
            representative: company.representativeName || "확인 전",
            companyId: <span className="font-mono text-xs font-normal text-slate-600">{company.id}</span>,
            manager: company.managerName || "확인 전",
            contact: (
              <span className="grid gap-1 text-xs font-normal text-slate-600">
                <span>{company.publicContactPhone || "확인 전"}</span>
                <span>{company.publicEmail || "확인 전"}</span>
              </span>
            ),
            profile: (
              <span className="grid gap-1 text-xs font-normal text-slate-600">
                <span>통신판매 {company.commerceLicenseNo || "확인 전"}</span>
                <span>사업장 {company.businessAddress ? "등록됨" : "확인 전"}</span>
                <span>반품지 {company.returnAddress ? "등록됨" : "확인 전"}</span>
                <span>제출서류 {company.signupDocumentStatus === "uploaded" ? "연결됨" : "미연결"}</span>
              </span>
            ),
            pg: companyPgStatus(company),
            merchant: company.pgProfile?.merchantIdMasked ?? "-",
            fee: formatPercent(company.commissionRate),
            products: productCountByCompany.get(company.id) ?? company.productCount,
            pending: company.pendingProductCount,
            actions: (
              <div className="flex flex-wrap gap-2">
                {actionLink(`/admin/pg-settings/a5mall/?companyId=${encodeURIComponent(company.id)}`, "PG 설정", true)}
                {actionLink(`/admin/products/list?companyId=${encodeURIComponent(company.id)}`, "상품")}
              </div>
            ),
          },
        }))}
        emptyMessage="등록된 입점기업이 없습니다."
      />
    </AdminGridShell>
  );
}

export async function AdminProductsGridPage() {
  const data = await readAdminGridData();
  const companyById = new Map(data.companies.map((company) => [company.id, company]));

  return (
    <AdminGridShell
      title="상품 관리"
      subtitle="상품을 엑셀형으로 비교하고, 업체 단위 URL 확인과 운영 설정을 처리합니다."
    >
      <OperationsTable
        caption={`등록 상품 ${data.products.length}개 / 가격, 할인율, 자동 배너 구간, URL을 한 줄에서 확인`}
        columns={productColumns}
        rows={data.products.map((product, index) => {
          const comparisonVerified = product.priceComparisonVerified === true;
          const rate = discountRate(product);
          const company = companyById.get(product.companyId);

          return {
            id: product.id,
            cells: {
              no: index + 1,
              status: productStatus(product),
              product: (
                <span className="grid gap-1">
                  <span className="font-normal text-slate-950">{product.name}</span>
                  <span className="font-mono text-xs font-normal text-slate-500">{product.id}</span>
                </span>
              ),
              company: company?.name ?? product.sellerCompanyName ?? product.companyId,
              businessNo:
                product.sellerBusinessNoNormalized ||
                product.sellerBusinessNo ||
                company?.businessRegistrationNumberNormalized ||
                company?.businessRegistrationNumber ||
                "-",
              category: product.category || "-",
              listPrice: comparisonVerified ? formatCurrency(product.comparison.listPrice) : "확인 전",
              openPrice: comparisonVerified ? formatCurrency(product.comparison.platformLowestPrice) : "확인 전",
              closedPrice: <span className="font-normal text-rose-600">{formatCurrency(product.comparison?.closedMallPrice || product.price)}</span>,
              discount: comparisonVerified ? `${rate}%` : "확인 전",
              bucket: comparisonVerified ? discountBucket(rate) : "확인 전",
              stock: product.stock,
              urls: (
                <span className="grid gap-1 text-xs font-normal">
                  <Link href={productTabletPath(product)} className="text-blue-700">PC 상품</Link>
                  <Link href={productMobilePath(product)} className="text-emerald-700">모바일 상품</Link>
                </span>
              ),
              actions: (
                <div className="flex flex-wrap gap-2">
                  {actionLink(`/admin/products?productId=${encodeURIComponent(product.id)}`, "운영 설정", true)}
                  {actionLink(`/company/products/preview?productId=${encodeURIComponent(product.id)}`, "미리보기")}
                </div>
              ),
            },
          };
        })}
        emptyMessage="등록된 상품이 없습니다."
      />
    </AdminGridShell>
  );
}
