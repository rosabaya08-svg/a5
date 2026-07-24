import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const modal = read("components/storefront/PriceComparisonAnalysisButton.tsx");
const tablet = read("components/storefront/TabletMallPages.tsx");
const brand = read("components/storefront/BrandProductCollectionClient.tsx");

assert(modal.includes("}, 1_000);"), "1초 로딩 시간이 없습니다.");
assert(modal.includes("AI 가격 비교 분석 중"), "AI 가격 비교 로딩 화면이 없습니다.");
assert(modal.includes("원가와 오픈몰 가격을 비교하고 있습니다."), "로딩 설명이 없습니다.");
assert(modal.includes("Boolean(verificationSource.trim())"), "검증 출처 확인이 없습니다.");
assert(modal.includes("listPrice >= platformLowestPrice"), "가격 순서 검증이 없습니다.");
assert(modal.includes("platformLowestPrice > closedMallPrice"), "오픈몰 대비 절약 검증이 없습니다.");
assert(modal.includes(">원가</dt>"), "원가 행이 없습니다.");
assert(modal.includes(">오픈몰</dt>"), "오픈몰 행이 없습니다.");
assert(modal.includes(">산후조리원 판매가</dt>"), "산후조리원 판매가 행이 없습니다.");
assert(modal.includes("오픈몰보다 {formatCurrency(savings)} 저렴합니다."), "절약 금액 문구가 없습니다.");
assert(!modal.includes("비교가격 확인 전"), "삭제 대상 비교가격 안내 블록이 남아 있습니다.");
assert(tablet.includes("산후조리원 판매가 {formatCurrency(closedMallPrice)}"), "상품 카드 판매가 명칭이 바뀌지 않았습니다.");
assert(tablet.includes("listPrice={listPrice}"), "상품 카드가 원가를 전달하지 않습니다.");
assert(tablet.includes("verificationSource={product.comparisonVerificationSource}"), "상품 카드가 검증 출처를 전달하지 않습니다.");
assert(brand.includes("listPrice={product.comparison.listPrice}"), "브랜드 카드가 원가를 전달하지 않습니다.");
assert(!tablet.includes("@/components/storefront/PriceAnalysisButton"), "상품 목록이 이전 가격 비교 컴포넌트를 사용합니다.");
assert(!brand.includes("@/components/storefront/PriceAnalysisButton"), "브랜드 목록이 이전 가격 비교 컴포넌트를 사용합니다.");

console.log("PASS storefront AI price comparison v2 contract");
