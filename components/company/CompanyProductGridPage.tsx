import { CompanyPgReadOnlyPanel } from "@/components/company/CompanyPgReadOnlyPanel";
import { CompanyProductOperationsGrid } from "@/components/company/CompanyProductOperationsGrid";
import { AppShell } from "@/components/layout/AppShell";
import { companyNavItems } from "@/components/layout/navigation";
import { readPortalServerSession } from "@/lib/auth/serverSession";
import {
  getLiveCompanyById,
  getLiveCompanyOrderItems,
  getLiveCompanyOrders,
  getLiveCompanyProductOptions,
  getLiveCompanyProducts,
} from "@/lib/repositories/liveCommerceRepository";

const preservedTestCompanyId = "company-test-1004";
const preservedTestBusinessNo = "7592901311";
const missingCompanyScopeId = "__missing_company_scope__";

function CompanyGridShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sectionTitle="기업 관리자"
      title="상품관리"
      subtitle="상품 현황과 상품 목록을 엑셀형으로 보고, 행 단위로 수정과 URL 관리를 처리합니다."
      scopeLabel="입점사 운영 콘솔"
      navItems={companyNavItems}
      accent="company"
    >
      {children}
    </AppShell>
  );
}

async function readCompanyScope() {
  const session = await readPortalServerSession("company");
  const sessionCompanyId = session?.companyId;
  const isPreservedTestCompany = session?.businessNo === preservedTestBusinessNo || sessionCompanyId === preservedTestCompanyId;
  const companyId = isPreservedTestCompany ? preservedTestCompanyId : sessionCompanyId || missingCompanyScopeId;

  return {
    companyId,
    isPreservedTestCompany,
  };
}

export async function CompanyProductGridPage() {
  const scope = await readCompanyScope();
  const companyId = scope.companyId;
  const [companyRead, productsRead, productOptionsRead, orderItemsRead, ordersRead] = await Promise.all([
    getLiveCompanyById(companyId),
    getLiveCompanyProducts(companyId),
    getLiveCompanyProductOptions(companyId),
    getLiveCompanyOrderItems(companyId),
    getLiveCompanyOrders(companyId),
  ]);
  void ordersRead;
  const editableProductIds = productsRead.data
    .filter((product) => product.companyId === companyId || scope.isPreservedTestCompany)
    .map((product) => product.id);

  return (
    <CompanyGridShell>
      <CompanyPgReadOnlyPanel companyId={companyId} company={companyRead.data} />
      <div className="mt-4" />
      <CompanyProductOperationsGrid
        products={productsRead.data}
        options={productOptionsRead.data}
        orderItems={orderItemsRead.data}
        editableProductIds={editableProductIds}
      />
    </CompanyGridShell>
  );
}
