import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const management = read("components/company/CompanyProductManagementPanel.tsx");
const repository = read("lib/repositories/firebase/firebaseProductRepository.ts");
const preview = read("components/company/CompanyProductDraftPreview.tsx");
const registration = read("components/company/CompanyProductRegistrationWorkspace.tsx");
const priceForm = read("components/company/ProductPricePolicyForm.tsx");
const excel = read("components/company/CompanyExcelExportPanel.tsx");
const productDraft = read("lib/company/productDraft.ts");

assert(management.includes("A5 MALL AI 가격 비교"), "AI 가격 비교 제목이 없습니다.");
assert(management.includes("comparisonCandidateListPrice"), "원판매가 후보 조회가 없습니다.");
assert(management.includes("comparisonCandidateOpenMallPrice"), "오픈몰가 후보 조회가 없습니다.");
assert(management.includes("comparisonVerificationSource?.trim()"), "검증 출처 확인이 없습니다.");
assert(management.includes('["할인율", comparisonVerified ?'), "검증 전 할인율 차단 표시가 없습니다.");

assert(repository.includes("comparison_candidate_list_price"), "저장된 원판매가 후보 매핑이 없습니다.");
assert(repository.includes("comparison_candidate_open_mall_price"), "저장된 오픈몰가 후보 매핑이 없습니다.");
assert(repository.includes("comparison_price_verification_source"), "비교가격 검증 출처 매핑이 없습니다.");

for (const forbidden of ["기업 ID", "상품 ID", "분류 코드", "운영 단계", "진열관", "고시 템플릿", "SKU", "외부 상품코드"]) {
  assert(!preview.includes(forbidden), `상품 미리보기에 내부 문구가 남아 있습니다: ${forbidden}`);
}
assert(preview.includes("대표 이미지 미등록"), "대표 이미지 빈 상태 문구가 없습니다.");
assert(preview.includes("comparisonVerificationSource?.trim()"), "상품 미리보기의 검증 출처 확인이 없습니다.");
assert(preview.includes('["폐쇄몰 판매가", formatCurrency(draft.pricing.closedMallPrice)]'), "폐쇄몰 판매가 표시가 초안 판매가와 연결되지 않았습니다.");

const livePreviewStart = registration.indexOf("function ProductRegistrationLivePreview");
const livePreviewEnd = registration.indexOf("function directPublishBlockers");
assert(livePreviewStart >= 0 && livePreviewEnd > livePreviewStart, "상품등록 미리보기 범위를 찾지 못했습니다.");
const livePreview = registration.slice(livePreviewStart, livePreviewEnd);
for (const forbidden of ["SKU", "section.type", "editProductId", "상품 할인율", "플랫폼 대비"]) {
  assert(!livePreview.includes(forbidden), `상품등록 미리보기에 내부/미검증 문구가 남아 있습니다: ${forbidden}`);
}
assert(livePreview.includes("AI 가격 비교는 출처 검증 후 표시됩니다."), "미리보기의 비교가격 검증 안내가 없습니다.");

assert(priceForm.includes("comparisonVerified: false"), "기업 입력만으로 비교가격을 검증 완료 처리하는 경로가 남아 있습니다.");
assert(priceForm.includes("원판매가 후보") && priceForm.includes("오픈몰 판매가 후보"), "비교가격 후보 입력 구분이 없습니다.");
assert(excel.includes("출처 검증 전 할인율과 차액은 표시하지 않습니다."), "엑셀 안내가 검증 전 계산 차단 원칙과 다릅니다.");

assert(productDraft.includes("price: closedMallPrice"), "상품 판매가가 폐쇄몰 판매가에서 저장되지 않습니다.");
assert(productDraft.includes("comparison_candidate_list_price"), "원판매가 후보 저장 필드가 없습니다.");
assert(productDraft.includes("comparison_candidate_open_mall_price"), "오픈몰가 후보 저장 필드가 없습니다.");
assert(productDraft.includes("price_comparison_verified: false"), "기업 등록 시 비교가격 확인 전 저장 계약이 없습니다.");

console.log("PASS company AI price comparison and product preview contract");
