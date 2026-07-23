export type CompanyCarrier = {
  code: string;
  name: string;
  shippingEnabled: boolean;
};

export const companyCarriers: readonly CompanyCarrier[] = [
  { code: "1001", name: "한진택배", shippingEnabled: true },
  { code: "1002", name: "롯데택배", shippingEnabled: true },
  { code: "1004", name: "로젠택배", shippingEnabled: true },
  { code: "1007", name: "우체국택배", shippingEnabled: true },
  { code: "1008", name: "일양로지스", shippingEnabled: true },
  { code: "1010", name: "KGB택배", shippingEnabled: true },
  { code: "1011", name: "편의점택배", shippingEnabled: true },
  { code: "1012", name: "직접배송", shippingEnabled: true },
  { code: "1013", name: "천일택배", shippingEnabled: true },
  { code: "1014", name: "경동택배", shippingEnabled: true },
  { code: "1015", name: "대신택배", shippingEnabled: true },
  { code: "1016", name: "EMS", shippingEnabled: true },
  { code: "1018", name: "고려택배", shippingEnabled: true },
  { code: "1019", name: "CJ대한통운", shippingEnabled: true },
  { code: "1020", name: "합동택배", shippingEnabled: true },
  { code: "1021", name: "건영택배", shippingEnabled: true },
  { code: "1022", name: "성화택배", shippingEnabled: true },
  { code: "1023", name: "호남택배", shippingEnabled: true },
  { code: "1025", name: "삼성전자상품", shippingEnabled: true },
  { code: "1026", name: "SLX 택배사", shippingEnabled: true },
  { code: "1027", name: "농협택배", shippingEnabled: true },
  { code: "1028", name: "큐런택배", shippingEnabled: true },
  { code: "1029", name: "TPM코리아", shippingEnabled: true },
  { code: "1030", name: "로지스밸리", shippingEnabled: true },
  { code: "1031", name: "대체출고", shippingEnabled: false },
  { code: "1032", name: "계좌환불", shippingEnabled: false },
  { code: "1033", name: "오늘의픽업", shippingEnabled: true },
  { code: "1034", name: "대림통운", shippingEnabled: true },
  { code: "1035", name: "HY", shippingEnabled: true },
  { code: "1036", name: "제니엘시스템", shippingEnabled: true },
] as const;

const companyCarrierByCode = new Map(companyCarriers.map((carrier) => [carrier.code, carrier]));

export function normalizeCarrierCode(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

export function findCompanyCarrier(value: unknown) {
  return companyCarrierByCode.get(normalizeCarrierCode(value));
}

export function requireShippingCarrier(value: unknown) {
  const carrier = findCompanyCarrier(value);
  if (!carrier) {
    throw new Error("CARRIER_CODE_INVALID:등록되지 않은 택배사 코드입니다.");
  }
  if (!carrier.shippingEnabled) {
    throw new Error("CARRIER_CODE_NOT_SHIPPING:배송 송장에 사용할 수 없는 업무 코드입니다.");
  }
  return carrier;
}
