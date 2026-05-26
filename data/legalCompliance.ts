import type { LegalComplianceItem } from "@/types/compliance";

export const sellerDisclosureFields = [
  "상호",
  "대표자명",
  "사업자등록번호",
  "통신판매업 신고번호",
  "주소",
  "전화번호",
  "이메일",
  "CS 연락처",
  "반품지 주소",
];

export const productNoticeFields = [
  "상품명",
  "모델명",
  "제조사/수입사",
  "제조국",
  "제조연월 또는 사용기한",
  "품질보증기준",
  "A/S 책임자 및 연락처",
];

export const deliveryReturnFields = [
  "배송비",
  "도서산간 추가비",
  "발송 예정일",
  "교환/반품 가능 기간",
  "교환/반품 제한 사유",
  "파손/오배송 처리 기준",
  "환불 처리 기준",
];

export const restrictedProductItems: LegalComplianceItem[] = [
  { id: "weapon", title: "총포/도검/화약류/폭발물", description: "법령상 허가 없이 판매할 수 없는 위험 품목입니다.", riskLevel: "blocked" },
  { id: "spray-shocker", title: "분사기/전자충격기/석궁", description: "개별 허가와 법령 검토가 필요한 제한 품목입니다.", riskLevel: "blocked" },
  { id: "drug", title: "마약류/향정신성의약품/불법 의약품", description: "폐쇄몰 판매 금지 품목으로 관리자 승인 요청이 차단됩니다.", riskLevel: "blocked" },
  { id: "uncertified-electric", title: "미인증 전기용품/어린이제품", description: "KC 인증번호와 증빙이 없으면 승인 요청이 불가합니다.", riskLevel: "blocked" },
  { id: "fake", title: "위조상품/불법 수입품", description: "상표권과 수입 통관 증빙 확인 전 판매할 수 없습니다.", riskLevel: "blocked" },
  { id: "privacy-gambling", title: "개인정보 침해/사행성 상품", description: "법령상 판매 제한 또는 서비스 정책 위반 위험이 있습니다.", riskLevel: "blocked" },
];

export const certificationChecklist: LegalComplianceItem[] = [
  { id: "kc-target", title: "KC 인증 대상 여부", description: "어린이제품, 전기용품, 생활용품은 인증 대상 여부를 먼저 표시합니다.", riskLevel: "required" },
  { id: "kc-number", title: "KC 인증번호", description: "인증 대상 상품은 번호와 증빙 업로드 mock이 필요합니다.", riskLevel: "required" },
  { id: "type", title: "안전인증/안전확인/공급자적합성 구분", description: "상품군별 인증 구분을 명확히 선택합니다.", riskLevel: "required" },
  { id: "expert", title: "전문가 검토 필요", description: "법률 판단은 시스템이 확정하지 않고 운영 검토로 넘깁니다.", riskLevel: "warning" },
];
