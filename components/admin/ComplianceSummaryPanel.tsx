import { certificationChecklist, restrictedProductItems } from "@/data/legalCompliance";

export function ComplianceSummaryPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-red-600">approval gate</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">상품 승인 법적 고지/KC 검토 요약</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            승인 화면에서 금지상품 red flag, 인증 증빙, 판매자/CS/반품지 고지를 함께 확인해야 합니다.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200">
          전문가 검토 필요
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <h3 className="font-black text-red-950">red flag</h3>
          <ul className="mt-2 grid gap-2 text-sm text-red-900">
            {restrictedProductItems.map((item) => (
              <li key={item.id}>- {item.title}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <h3 className="font-black text-amber-950">인증/KC</h3>
          <ul className="mt-2 grid gap-2 text-sm text-amber-900">
            {certificationChecklist.map((item) => (
              <li key={item.id}>- {item.title}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
