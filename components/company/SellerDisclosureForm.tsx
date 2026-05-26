import { sellerDisclosureFields } from "@/data/legalCompliance";

const sampleSellerValues: Record<string, string> = {
  companyName: "산호케어 주식회사",
  representativeName: "김대표",
  businessRegistrationNumber: "123-45-67890",
  mailOrderRegistrationNumber: "2026-서울강남-0000",
  address: "서울특별시 강남구 테헤란로 00",
  phone: "02-0000-0000",
  email: "seller@example.com",
  csPhone: "010-0000-0000",
  returnAddress: "경기도 성남시 분당구 반품로 00",
};

export function SellerDisclosureForm() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">seller disclosure</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">판매자 정보 / 통신판매업 신고번호</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            기업 등록 시 입력한 상호, 대표자명, 사업자등록번호, 통신판매업 신고번호, CS 연락처, 반품지 주소를 상품 상세에 노출할 수 있게 관리합니다.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-800 ring-1 ring-blue-200">상품 상세 노출 필수</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sellerDisclosureFields.map((field) => (
          <label key={field.id} className="grid gap-2 text-sm font-bold text-slate-700">
            <span>
              {field.label}
              {field.required ? <span className="ml-1 text-red-600">*</span> : null}
            </span>
            <input
              readOnly
              value={sampleSellerValues[field.id] ?? "입점사 프로필에서 불러올 값"}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-700"
            />
            <span className="text-xs font-normal leading-5 text-slate-500">{field.helper}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
