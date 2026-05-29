import { deliveryReturnFields } from "@/data/legalCompliance";

const samplePolicyValues: Record<string, string> = {
  shippingFee: "3,000원 / 50,000원 이상 무료",
  remoteAreaFee: "도서산간 지역 3,000원 추가",
  dispatchSchedule: "결제 확인 후 영업일 기준 2일 이내 출고",
  exchangeReturnPeriod: "수령 후 7일 이내 신청",
  exchangeReturnRestriction: "개봉/사용/상품 훼손/구성품 누락 시 제한",
  damageMisdeliveryStandard: "사진 증빙 접수 후 동일 상품 재발송 또는 환불 검토",
  refundStandard: "결제 취소/환불은 관리자 검토 및 정산 보류 정책에 따름",
};

export function ReturnPolicyForm() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-orange-600">return policy</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">반품/교환/AS/배송 고지</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            모든 상품은 배송비, 도서산간 추가비, 출고 예정일, 교환/반품 제한 사유, 파손/오배송 처리, 환불 기준을 승인 전 입력해야 합니다.
          </p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">미입력 시 승인 요청 불가</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {deliveryReturnFields.map((field) => (
          <label key={field.id} className="grid gap-2 text-sm font-bold text-slate-700">
            <span>
              {field.label}
              {field.required ? <span className="ml-1 text-red-600">*</span> : null}
            </span>
            <textarea
              readOnly
              value={samplePolicyValues[field.id] ?? "입점사 책임 범위와 고객 안내 문구를 입력합니다."}
              className="min-h-20 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-700"
            />
            <span className="text-xs font-normal leading-5 text-slate-500">{field.helper}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
