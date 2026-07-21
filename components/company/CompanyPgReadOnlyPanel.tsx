import {
  INFINY_PROVIDER_LABEL,
  defaultInfinyPgProfile,
} from "@/lib/payments/infinySettlementPolicy";
import { A5_SALES_COMMISSION_RATE, PAYUP_PROVIDER_LABEL } from "@/lib/payments/payupReconciliation";
import { formatPercent } from "@/lib/utils/format";
import type { Company, PgMerchantStatus } from "@/types/commerce";

const statusLabels: Record<PgMerchantStatus, string> = {
  not_applied: "신청 전",
  in_review: "인피니 심사 중",
  mid_issued: "MID 발급",
  active: "운영 가능",
  blocked: "차단",
};

export function CompanyPgReadOnlyPanel({ companyId, company }: { companyId: string; company?: Company }) {
  const profile = company?.pgProfile ?? defaultInfinyPgProfile();
  const ready = profile.merchantStatus === "active";

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-normal tracking-[0.14em] text-emerald-700">PG 가맹점 상태</p>
          <h2 className="mt-1 text-lg font-normal text-slate-950">{company?.name ?? companyId} PG 상태</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            결제 승인에 필요한 MID와 PG 설정은 최고관리자가 관리합니다. 기업 어드민에서는 운영 가능 여부와 정산 기준만 확인합니다.
          </p>
        </div>
        <span className={`rounded-md px-3 py-1 text-xs font-normal ${ready ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
          {ready ? "운영 가능" : "연동 대기"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["PG사", profile.providerLabel || INFINY_PROVIDER_LABEL],
          ["MID", profile.merchantIdMasked],
          ["시리얼", profile.merchantSerialNoMasked ?? "시리얼 대기"],
          ["모듈키", profile.moduleKeyMasked ?? "모듈키 대기"],
          ["상태", statusLabels[profile.merchantStatus]],
          ["입력 권한", profile.companyEditable ? "기업 입력 가능" : "최고관리자 전용"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-normal text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-normal text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        기업 정산금은 {PAYUP_PROVIDER_LABEL}에서 기업과 직접 처리합니다. A5는 주문 총액과 Payup 원장을 읽기 전용으로 대조하고 A5 영업 수수료
        {formatPercent(A5_SALES_COMMISSION_RATE)} 기준 금액만 확인합니다. 기업 어드민에는 지급 실행 버튼을 제공하지 않습니다.
      </div>
    </section>
  );
}
