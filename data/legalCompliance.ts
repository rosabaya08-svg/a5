import type { ComplianceField, ComplianceGateResult, LegalComplianceItem, ProductComplianceState } from "@/types/compliance";

export const sellerDisclosureFields: ComplianceField[] = [
  { id: "companyName", label: "상호", required: true, helper: "상품 상세와 주문 조회 화면에 노출되는 판매자 상호입니다." },
  { id: "representativeName", label: "대표자명", required: true, helper: "입점 심사와 판매자 표시 정보에 사용합니다." },
  { id: "businessRegistrationNumber", label: "사업자등록번호", required: true, helper: "사업자등록증 서류와 일치해야 합니다." },
  { id: "mailOrderRegistrationNumber", label: "통신판매업 신고번호", required: true, helper: "통신판매업자 표시 정보로 관리합니다." },
  { id: "address", label: "사업장 주소", required: true, helper: "사업자등록증상 주소를 기준으로 입력합니다." },
  { id: "phone", label: "대표 전화번호", required: true, helper: "판매자 연락 가능 번호입니다." },
  { id: "email", label: "이메일", required: true, helper: "입점/정산/상품 승인 안내 수신 주소입니다." },
  { id: "csPhone", label: "고객 응대 연락처", required: true, helper: "모든 상품 상세와 주문 상세에 잘 보이게 표시합니다." },
  { id: "returnAddress", label: "반품지 주소", required: true, helper: "교환/반품 처리 시 고객에게 안내되는 주소입니다." },
];

export const productNoticeFields: ComplianceField[] = [
  { id: "productName", label: "상품명", required: true, helper: "고객 화면과 주문 snapshot에 저장되는 상품명입니다." },
  { id: "modelName", label: "모델명", required: true, helper: "상품 고시와 인증서류 대조에 사용합니다." },
  { id: "manufacturerOrImporter", label: "제조사/수입사", required: true, helper: "국내 제조 또는 수입 책임 주체를 표시합니다." },
  { id: "originCountry", label: "제조국", required: true, helper: "상품 상세 고시 영역에 표시합니다." },
  { id: "manufacturedAtOrExpiration", label: "제조연월 또는 사용기한", required: true, helper: "카테고리에 따라 제조연월/사용기한 중 필요한 값을 입력합니다." },
  { id: "warrantyStandard", label: "품질보증기준", required: true, helper: "품질보증과 교환/AS 기준을 고객에게 고지합니다." },
  { id: "asOwnerAndContact", label: "A/S 책임자 및 연락처", required: true, helper: "판매자 또는 제조사 A/S 책임 연락처입니다." },
];

export const deliveryReturnFields: ComplianceField[] = [
  { id: "shippingFee", label: "배송비", required: true, helper: "무료/유료/조건부 배송비를 명확히 표시합니다." },
  { id: "remoteAreaFee", label: "도서산간 추가비", required: true, helper: "추가 비용이 있으면 별도 고지합니다." },
  { id: "dispatchSchedule", label: "발송 예정일", required: true, helper: "결제 후 출고 기준일 또는 배송 예정일입니다." },
  { id: "exchangeReturnPeriod", label: "교환/반품 가능 기간", required: true, helper: "고객이 신청 가능한 기간을 표시합니다." },
  { id: "exchangeReturnRestriction", label: "교환/반품 제한 사유", required: true, helper: "개봉, 사용, 훼손 등 제한 사유를 명확히 적습니다." },
  { id: "damageMisdeliveryStandard", label: "파손/오배송 처리 기준", required: true, helper: "파손, 오배송, 누락 발생 시 책임과 처리 절차입니다." },
  { id: "refundStandard", label: "환불 처리 기준", required: true, helper: "A5에서는 실제 환불 실행 전 관리자/PG 승인 절차가 필요합니다." },
];

export const restrictedProductItems: LegalComplianceItem[] = [
  { id: "firearms", title: "총포", description: "총포류 또는 유사 위험 물품은 입점 상품으로 승인할 수 없습니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "swords", title: "도검", description: "도검류와 날붙이 위험 물품은 전문가 검토 전 판매를 차단합니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "gunpowder", title: "화약류", description: "화약류와 관련 원재료/부품은 판매 금지 항목으로 처리합니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "explosives", title: "폭발물", description: "폭발물 또는 폭발 위험 물품은 승인 요청을 비활성화합니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "narcotics", title: "마약류", description: "마약류는 판매 금지 항목이며 등록 즉시 관리자 차단 대상입니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "psychotropic", title: "향정신성의약품", description: "향정신성의약품은 판매 금지 항목으로 처리합니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "illegal-medicine", title: "불법 의약품", description: "허가되지 않은 의약품, 효능 과장 의약품은 승인할 수 없습니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "uncertified-electric", title: "미인증 전기용품", description: "KC 등 필수 인증이 필요한 전기용품은 인증번호와 증빙 없이는 승인할 수 없습니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "uncertified-children", title: "미인증 어린이제품", description: "어린이제품 인증 대상인데 인증번호/증빙이 없으면 승인 요청을 차단합니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "false-certification", title: "허위/과장 인증 상품", description: "인증번호 허위 표시, 과장된 안전성 문구는 관리자 반려 대상입니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "counterfeit", title: "위조상품", description: "상표권 침해 또는 위조 의심 상품은 판매할 수 없습니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "illegal-import", title: "불법 수입품", description: "수입 신고 또는 인증 절차가 불명확한 상품은 승인할 수 없습니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "privacy", title: "개인정보 침해 상품", description: "개인정보 수집/유출/도청/감시 목적 상품은 판매 금지 후보입니다.", riskLevel: "blocked", lawReviewRequired: true },
  { id: "gambling", title: "사행성/불법 도박 관련 상품", description: "사행성 또는 불법 도박 관련 상품/서비스는 승인 요청을 차단합니다.", riskLevel: "blocked", lawReviewRequired: true },
];

export const certificationChecklist: LegalComplianceItem[] = [
  { id: "kc-target", title: "KC 인증 대상 여부", description: "전기용품, 생활용품, 어린이제품 등 안전관리 대상 여부를 먼저 선택합니다.", riskLevel: "required", lawReviewRequired: true },
  { id: "kc-number", title: "KC 인증번호", description: "인증 대상이면 KC 인증번호 또는 신고/확인번호 입력이 필요합니다.", riskLevel: "required", lawReviewRequired: true },
  { id: "cert-type", title: "안전인증/안전확인/공급자적합성 구분", description: "상품군별 인증 구분과 증빙 파일을 같이 관리합니다.", riskLevel: "required", lawReviewRequired: true },
  { id: "evidence", title: "인증서류 업로드 모의 화면", description: "현재는 Storage 경로와 상태만 표시하며 실제 uploadBytes는 별도 승인 전까지 차단합니다.", riskLevel: "warning", lawReviewRequired: true },
];

export const legalReviewSources = [
  {
    label: "공정거래위원회 전자상거래 판매자 정보 표시 참고",
    url: "https://www.ftc.go.kr/www/selectBbsNttView.do?bordCd=1&key=5&nttSn=32961",
  },
  {
    label: "국가기술표준원 전기용품 안전관리대상 표시",
    url: "https://kats.go.kr/content.do?cmsid=227",
  },
  {
    label: "국가기술표준원 어린이제품 안전인증",
    url: "https://www.kats.go.kr/content.do?cmsid=496",
  },
];

export const sampleComplianceState: ProductComplianceState = {
  prohibitedProductConfirmed: true,
  selectedRestrictedItemIds: [],
  sellerDisclosureCompleted: true,
  productNoticeCompleted: true,
  returnPolicyCompleted: true,
  certification: {
    kcTarget: true,
    kcNumber: "KC-TEST-2026-0001",
    certificationType: "safety_confirmation",
    childrenProduct: false,
    electricOrLivingProduct: true,
    foodHealthBeautyMedical: false,
    evidenceUploadRequired: true,
    evidenceUploaded: true,
  },
  expertReviewRequired: true,
};

export function evaluateComplianceGate(state: ProductComplianceState): ComplianceGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (state.selectedRestrictedItemIds.length > 0) blockers.push("금지/제한 상품 항목이 선택되었습니다.");
  if (!state.prohibitedProductConfirmed) blockers.push("금지상품 아님 확인 체크가 필요합니다.");
  if (!state.sellerDisclosureCompleted) blockers.push("판매자 정보와 통신판매업 신고번호 입력이 필요합니다.");
  if (!state.productNoticeCompleted) blockers.push("상품 고시 필수값 입력이 필요합니다.");
  if (!state.returnPolicyCompleted) blockers.push("반품/교환/AS/배송 고지 입력이 필요합니다.");

  if (state.certification.kcTarget && !state.certification.kcNumber?.trim()) {
    blockers.push("KC 인증 대상 상품은 KC 인증번호가 필요합니다.");
  }

  if (state.certification.evidenceUploadRequired && !state.certification.evidenceUploaded) {
    blockers.push("인증 대상 상품은 증빙 파일 업로드 모의 상태가 필요합니다.");
  }

  if (state.expertReviewRequired) warnings.push("최종 법률 판단은 전문가 검토 후 확정해야 합니다.");

  return {
    approvalRequestEnabled: blockers.length === 0,
    blockers,
    warnings,
  };
}
