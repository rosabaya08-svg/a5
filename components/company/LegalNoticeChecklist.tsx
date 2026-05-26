import {
  certificationChecklist,
  deliveryReturnFields,
  evaluateComplianceGate,
  legalReviewSources,
  productNoticeFields,
  restrictedProductItems,
  sampleComplianceState,
  sellerDisclosureFields,
} from "@/data/legalCompliance";
import type { ComplianceField, LegalComplianceItem } from "@/types/compliance";

export function LegalNoticeChecklist() {
  const gate = evaluateComplianceGate(sampleComplianceState);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">legal approval gate</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">법적 고지 / 금지상품 / KC 인증 체크</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            판매자 정보, 통신판매업 신고번호, 상품 고시, 배송/교환/환불/AS, KC 인증 여부를 채워야 승인 요청이 가능합니다.
            금지상품이 선택되면 승인 요청은 즉시 비활성화됩니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${gate.approvalRequestEnabled ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
          {gate.approvalRequestEnabled ? "승인 요청 가능 조건 충족" : "승인 요청 차단"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChecklistGroup title="판매자 정보" items={sellerDisclosureFields} />
        <ChecklistGroup title="상품 고시" items={productNoticeFields} />
        <ChecklistGroup title="반품/교환/AS/배송 고지" items={deliveryReturnFields} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <RestrictedItemsPanel />
        <CertificationPanel />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <h3 className="font-black">전문가 검토 필요</h3>
          <p className="mt-2 text-sm leading-6">
            시스템은 입력 누락과 명백한 금지 후보를 차단하지만, 실제 판매 가능 여부와 법률 판단은 운영자/전문가 검토 후 확정해야 합니다.
          </p>
        </section>
        <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-black text-slate-950">공식 문서 확인 후보</h3>
          <ul className="mt-2 grid gap-2 text-sm text-slate-700">
            {legalReviewSources.map((source) => (
              <li key={source.url}>
                <a href={source.url} className="font-bold text-blue-700 underline underline-offset-2">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

function ChecklistGroup({ title, items }: { title: string; items: ComplianceField[] }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <h3 className="font-black text-slate-950">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item.id} className="rounded-md bg-white p-3">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <div>
                <p className="font-bold text-slate-950">
                  {item.label}
                  {item.required ? <span className="ml-1 text-red-600">*</span> : null}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.helper}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RestrictedItemsPanel() {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 p-4">
      <h3 className="font-black text-red-950">판매 금지/제한 항목</h3>
      <p className="mt-2 text-xs leading-5 text-red-800">아래 항목 중 하나라도 해당하면 승인 요청 버튼은 비활성화되어야 합니다.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {restrictedProductItems.map((item) => (
          <ComplianceItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function CertificationPanel() {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <h3 className="font-black text-amber-950">KC 인증 / 증빙</h3>
      <div className="mt-3 grid gap-2">
        {certificationChecklist.map((item) => (
          <ComplianceItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ComplianceItemCard({ item }: { item: LegalComplianceItem }) {
  const tone =
    item.riskLevel === "blocked"
      ? "border-red-200 bg-white text-red-950"
      : item.riskLevel === "required"
        ? "border-amber-200 bg-white text-amber-950"
        : "border-slate-200 bg-white text-slate-950";

  return (
    <label className={`flex gap-2 rounded-md border p-3 text-sm ${tone}`}>
      <input type="checkbox" disabled className="mt-1" />
      <span>
        <strong>{item.title}</strong>
        <span className="mt-1 block text-xs leading-5 opacity-80">{item.description}</span>
      </span>
    </label>
  );
}
