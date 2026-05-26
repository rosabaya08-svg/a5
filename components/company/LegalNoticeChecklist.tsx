import { certificationChecklist, deliveryReturnFields, productNoticeFields, restrictedProductItems, sellerDisclosureFields } from "@/data/legalCompliance";

export function LegalNoticeChecklist() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-blue-600">legal gate</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">승인 요청 전 법적 고지 체크</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            판매자 정보, 상품 고시, 배송/교환/환불, 인증 증빙을 모두 채워야 상품 승인 요청이 가능합니다.
          </p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">금지상품 guard</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChecklistGroup title="판매자 정보" items={sellerDisclosureFields} />
        <ChecklistGroup title="상품 고시" items={productNoticeFields} />
        <ChecklistGroup title="배송/교환/환불" items={deliveryReturnFields} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <h3 className="font-black text-red-950">판매 금지/제한 품목</h3>
          <div className="mt-3 grid gap-2">
            {restrictedProductItems.map((item) => (
              <label key={item.id} className="flex gap-2 rounded-md bg-white p-3 text-sm text-red-950">
                <input type="checkbox" disabled className="mt-1" />
                <span>
                  <strong>{item.title}</strong>
                  <span className="block text-xs leading-5 text-red-700">{item.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-black text-amber-950">KC/인증 확인</h3>
          <div className="mt-3 grid gap-2">
            {certificationChecklist.map((item) => (
              <div key={item.id} className="rounded-md bg-white p-3 text-sm">
                <p className="font-bold text-slate-950">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChecklistGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <h3 className="font-black text-slate-950">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
