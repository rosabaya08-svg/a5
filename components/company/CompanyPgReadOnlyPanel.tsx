import { mockCompanies } from "@/data/mockCompanies";
import {
  A5_PLATFORM_FEE_RATE,
  INFINY_PG_FEE_RATE,
  INFINY_PROVIDER_LABEL,
  INFINY_TOTAL_FEE_RATE,
  getCompanyPgProfile,
} from "@/lib/payments/infinySettlementPolicy";
import { formatPercent } from "@/lib/utils/format";
import type { PgMerchantStatus } from "@/types/commerce";

const statusLabels: Record<PgMerchantStatus, string> = {
  not_applied: "가입 전",
  in_review: "인피니 심사 중",
  mid_issued: "MID 발급",
  active: "운영 가능",
  blocked: "차단",
};

export function CompanyPgReadOnlyPanel({ companyId }: { companyId: string }) {
  const company = mockCompanies.find((item) => item.id === companyId);
  const profile = getCompanyPgProfile(companyId, mockCompanies);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">PG 가맹점 정보</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{company?.name ?? companyId} 인피니 PG 상태</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기업 어드민은 PG사와 MID 발급 상태만 확인합니다. MID 등록과 변경은 최고관리자 전용입니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">읽기 전용</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ["PG사", profile.providerLabel || INFINY_PROVIDER_LABEL],
          ["MID", profile.merchantIdMasked],
          ["상태", statusLabels[profile.merchantStatus]],
          ["입력 권한", profile.companyEditable ? "기업 입력 가능" : "최고관리자 전용"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900">
        정산 지급은 우리 시스템에서 실행하지 않습니다. 인피니가 결제 수수료 {formatPercent(INFINY_PG_FEE_RATE)}와
        주문 수수료 {formatPercent(A5_PLATFORM_FEE_RATE)}를 합산해 총 {formatPercent(INFINY_TOTAL_FEE_RATE)} 공제 후 정산합니다.
      </div>
    </section>
  );
}
