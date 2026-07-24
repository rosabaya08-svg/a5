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

const priceButton = read("components/storefront/PriceAnalysisButton.tsx");
const tabletMall = read("components/storefront/TabletMallPages.tsx");
const productCardStart = tabletMall.indexOf("function ProductCard");
const productCardEnd = tabletMall.indexOf("function categoryAnchorId");
const productCard = tabletMall.slice(productCardStart, productCardEnd);

assert(/>\s*AI 분석\s*<\/button>/.test(priceButton), "AI 분석 버튼이 없습니다.");
assert(priceButton.includes("const comparisonReady = verified"), "검증된 비교가격 판정이 없습니다.");
assert(priceButton.includes("비교가격 확인 전"), "검증 전 안내가 없습니다.");
assert(priceButton.includes("검증된 오픈몰 판매가"), "검증된 오픈몰가 표시가 없습니다.");
assert(priceButton.includes("폐쇄몰 판매가는 변경하지 않습니다."), "업로드 판매가 보존 안내가 없습니다.");
assert(!priceButton.includes("if (!verified"), "검증 전 버튼을 숨기는 경로가 남아 있습니다.");

assert(productCardStart >= 0 && productCardEnd > productCardStart, "상품 카드 범위를 찾지 못했습니다.");
assert(!productCard.includes("profile.review.count"), "상품 카드에 후기 임시 정보가 남아 있습니다.");
assert(!productCard.includes("profile.review.rating"), "상품 카드에 평점 임시 정보가 남아 있습니다.");
assert(tabletMall.includes(">등록 상품<"), "등록 상품 제목이 정상 문구로 표시되지 않습니다.");
assert(tabletMall.includes("전체보기 {categoryProducts.length}개"), "전체보기 상품 수 문구가 정상화되지 않았습니다.");
assert(!tabletMall.includes(">\\\\uB4F1\\\\uB85D"), "고객 화면에 노출되는 유니코드 이스케이프가 남아 있습니다.");

console.log("PASS storefront AI price button and product card contract");
