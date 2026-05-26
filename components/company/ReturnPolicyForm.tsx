import { deliveryReturnFields } from "@/data/legalCompliance";

export function ReturnPolicyForm() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-orange-600">return policy</p>
      <h2 className="mt-1 text-lg font-black text-slate-950">배송/교환/환불/AS 책임 고지</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {deliveryReturnFields.map((field) => (
          <label key={field} className="grid gap-2 text-sm font-bold text-slate-700">
            {field}
            <textarea
              readOnly
              value="입점사 책임 범위와 운영 검수 문구를 입력해야 승인 요청 가능"
              className="min-h-20 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
