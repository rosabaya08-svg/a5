import { sellerDisclosureFields } from "@/data/legalCompliance";

export function SellerDisclosureForm() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-slate-500">seller disclosure</p>
      <h2 className="mt-1 text-lg font-black text-slate-950">판매자/CS/반품지 정보</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sellerDisclosureFields.map((field) => (
          <label key={field} className="grid gap-2 text-sm font-bold text-slate-700">
            {field}
            <input
              readOnly
              value="Firestore company profile 연결 예정"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-500"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
