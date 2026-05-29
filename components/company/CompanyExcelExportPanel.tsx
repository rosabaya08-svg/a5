"use client";

type CsvCell = string | number | null | undefined;

type Header<T> = {
  key: keyof T;
  label: string;
};

export type CompanyExcelOrderRow = {
  orderNo: string;
  orderedAt: string;
  paidAt: string;
  orderStatus: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  receiverName: string;
  receiverPhone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  productCode: string;
  productName: string;
  optionName: string;
  quantity: number;
  salePrice: number;
  productAmount: number;
  shippingFee: number;
  totalPaidAmount: number;
  paymentMethod: string;
  carrier: string;
  invoiceNo: string;
  deliveryMemo: string;
  companyId: string;
  supplierName: string;
  settlementStatus: string;
};

export type CompanyExcelProductRow = {
  a5ProductCode: string;
  sabangnetProductCode: string;
  productName: string;
  optionName: string;
  normalPrice: number;
  platformLowestPrice: number;
  closedMallPrice: number;
  stock: number;
  status: string;
  companyId: string;
  supplierName: string;
};

const orderHeaders: Header<CompanyExcelOrderRow>[] = [
  { key: "orderNo", label: "주문번호" },
  { key: "orderedAt", label: "주문일시" },
  { key: "paidAt", label: "결제일시" },
  { key: "orderStatus", label: "주문상태" },
  { key: "buyerName", label: "구매자명" },
  { key: "buyerPhone", label: "연락처" },
  { key: "buyerEmail", label: "이메일" },
  { key: "receiverName", label: "수령자명" },
  { key: "receiverPhone", label: "수령자 연락처" },
  { key: "postalCode", label: "우편번호" },
  { key: "address", label: "주소" },
  { key: "addressDetail", label: "상세주소" },
  { key: "productCode", label: "상품코드" },
  { key: "productName", label: "상품명" },
  { key: "optionName", label: "옵션명" },
  { key: "quantity", label: "수량" },
  { key: "salePrice", label: "판매가" },
  { key: "productAmount", label: "상품금액" },
  { key: "shippingFee", label: "배송비" },
  { key: "totalPaidAmount", label: "총결제금액" },
  { key: "paymentMethod", label: "결제수단" },
  { key: "carrier", label: "택배사" },
  { key: "invoiceNo", label: "송장번호" },
  { key: "deliveryMemo", label: "배송메모" },
  { key: "companyId", label: "입점사ID" },
  { key: "supplierName", label: "공급사명" },
  { key: "settlementStatus", label: "정산상태" },
];

const productHeaders: Header<CompanyExcelProductRow>[] = [
  { key: "a5ProductCode", label: "A5 상품코드" },
  { key: "sabangnetProductCode", label: "사방넷 상품코드" },
  { key: "productName", label: "상품명" },
  { key: "optionName", label: "옵션명" },
  { key: "normalPrice", label: "정상가" },
  { key: "platformLowestPrice", label: "플랫폼 최저가" },
  { key: "closedMallPrice", label: "산후조리원 핫딜가" },
  { key: "stock", label: "재고" },
  { key: "status", label: "상태" },
  { key: "companyId", label: "입점사ID" },
  { key: "supplierName", label: "공급사명" },
];

const invoiceHeaders: Header<CompanyExcelOrderRow>[] = [
  { key: "orderNo", label: "주문번호" },
  { key: "productCode", label: "상품코드" },
  { key: "productName", label: "상품명" },
  { key: "optionName", label: "옵션명" },
  { key: "quantity", label: "수량" },
  { key: "carrier", label: "택배사" },
  { key: "invoiceNo", label: "송장번호" },
  { key: "deliveryMemo", label: "배송메모" },
  { key: "companyId", label: "입점사ID" },
  { key: "supplierName", label: "공급사명" },
];

function csvValue(value: CsvCell) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv<T extends object>(headers: Header<T>[], rows: T[]) {
  const headerLine = headers.map((header) => csvValue(header.label)).join(",");
  const body = rows.map((row) => headers.map((header) => csvValue(row[header.key] as CsvCell)).join(","));
  return ["\uFEFF" + headerLine, ...body].join("\r\n");
}

function downloadCsv<T extends object>(filename: string, headers: Header<T>[], rows: T[]) {
  const blob = new Blob([buildCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function CompanyExcelExportPanel({
  orderRows,
  productRows,
}: {
  orderRows: CompanyExcelOrderRow[];
  productRows: CompanyExcelProductRow[];
}) {
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">무료 반자동 연동</p>
          <h2 className="mt-1 text-xl font-black">사방넷 업로드용 엑셀 다운로드</h2>
          <p className="mt-2 text-sm leading-6">
            결제 완료 주문을 운영 데이터로 뽑기 위한 엑셀 호환 CSV입니다. 사방넷/사방넷 미니 최종 양식 확인 전까지는 A5 표준 필드를 기준으로 출력합니다.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
          API 연동 전 단계
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => downloadCsv(`a5-company-orders-${today()}.csv`, orderHeaders, orderRows)}
          className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          주문 엑셀 다운로드
        </button>
        <button
          type="button"
          onClick={() => downloadCsv(`a5-company-products-${today()}.csv`, productHeaders, productRows)}
          className="rounded-md bg-white px-4 py-3 text-sm font-black text-slate-950 ring-1 ring-emerald-200"
        >
          상품 엑셀 다운로드
        </button>
        <button
          type="button"
          onClick={() => downloadCsv(`a5-invoice-upload-template-${today()}.csv`, invoiceHeaders, orderRows)}
          className="rounded-md bg-white px-4 py-3 text-sm font-black text-slate-950 ring-1 ring-emerald-200"
        >
          송장 업로드 양식 다운로드
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ["주문 행", `${orderRows.length}건`],
          ["상품/옵션 행", `${productRows.length}건`],
          ["필수 관리 필드", "입점사ID / 공급사명 / 정산상태"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-white p-3 ring-1 ring-emerald-100">
            <p className="text-xs font-black text-emerald-700">{label}</p>
            <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-md bg-white p-3 text-xs font-bold leading-5 text-slate-700 ring-1 ring-emerald-100">
        주의: 실제 사방넷 미니 무료 요금제의 주문 엑셀 업로드 허용 여부와 최종 컬럼명은 운영자가 확인해야 합니다. 현재 기능은 API 유료 연동 전 수동 업로드 테스트용입니다.
      </p>
    </section>
  );
}
