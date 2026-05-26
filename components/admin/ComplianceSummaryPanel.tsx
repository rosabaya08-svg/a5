import {
  certificationChecklist,
  deliveryReturnFields,
  evaluateComplianceGate,
  productNoticeFields,
  restrictedProductItems,
  sampleComplianceState,
  sellerDisclosureFields,
} from "@/data/legalCompliance";

export function ComplianceSummaryPanel() {
  const gate = evaluateComplianceGate(sampleComplianceState);
  const summaryCards = [
    { label: "판매자 정보", value: `${sellerDisclosureFields.length}개 필수`, tone: "blue" },
    { label: "상품 고시", value: `${productNoticeFields.length}개 필수`, tone: "blue" },
    { label: "반품/교환/AS/배송", value: `${deliveryReturnFields.length}개 필수`, tone: "amber" },
    { label: "금지상품 차단", value: `${restrictedProductItems.length}개 차단`, tone: "red" },
    { label: "KC/인증", value: `${certificationChecklist.length}개 점검`, tone: "amber" },
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-red-600">승인 게이트</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">상품 승인 법적 고지 / KC 검토 요약</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            최고관리자는 상품 승인 전 판매자 정보, 통신판매업 신고번호, 상품 고시, 반품/교환/AS/배송 고지, 금지상품 여부, KC 인증번호와 증빙을 함께 확인합니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${gate.approvalRequestEnabled ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
          {gate.approvalRequestEnabled ? "입점사 제출값 통과 예시" : "승인 차단 예시"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-md border p-3 ${card.tone === "red" ? "border-red-200 bg-red-50" : card.tone === "amber" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
            <p className="text-xs font-black text-slate-500">{card.label}</p>
            <p className="mt-1 text-lg font-black text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-md border border-red-200 bg-red-50 p-3">
          <h3 className="font-black text-red-950">위험 표시 목록</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {restrictedProductItems.map((item) => (
              <div key={item.id} className="rounded-md bg-white p-3 text-sm text-red-950">
                <strong>{item.title}</strong>
                <p className="mt-1 text-xs leading-5 text-red-700">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <h3 className="font-black text-amber-950">관리자 승인 전 확인</h3>
          <ul className="mt-3 grid gap-2 text-sm text-amber-900">
            <li className="rounded-md bg-white p-3 font-bold">KC 인증 대상이면 인증번호와 증빙이 있어야 합니다.</li>
            <li className="rounded-md bg-white p-3 font-bold">판매자 정보와 CS/반품지 주소가 상품 상세에 표시되어야 합니다.</li>
            <li className="rounded-md bg-white p-3 font-bold">금지상품 의심 항목은 승인 요청 자체를 반려합니다.</li>
            <li className="rounded-md bg-white p-3 font-bold">최종 법률 판단은 전문가 검토 blocker로 유지합니다.</li>
          </ul>
        </section>
      </div>
    </section>
  );
}
