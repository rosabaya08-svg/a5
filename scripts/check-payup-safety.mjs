import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];

function expect(file, pattern, label) {
  const content = read(file);
  const ok = typeof pattern === "string" ? content.includes(pattern) : pattern.test(content);
  checks.push({ label, ok, file });
}

function reject(file, pattern, label) {
  const content = read(file);
  const ok = typeof pattern === "string" ? !content.includes(pattern) : !pattern.test(content);
  checks.push({ label, ok, file });
}

expect("functions/src/payup/paymentApproval.ts", 'cartPayFlag: "Y"', "최종승인 cartPayFlag=Y");
expect("functions/src/payup/paymentApproval.ts", 'amount: String(integer(line.amount', "cartPayList amount String 변환");
expect("functions/src/payup/paymentApproval.ts", "PAYUP_TRANSACTION_ID_MISSING", "transactionId 누락 차단");
expect("functions/src/payup/paymentLedger.ts", 'status: "paid"', "승인 후 서버 주문 paid 원장");
expect("functions/src/payup/paymentLedger.ts", "commitPayupApproval", "승인 원장 단일 커밋 함수");
expect("functions/src/payup/cancelFinal.ts", 'actionType: "FULL_CANCEL"', "전체취소 2인 승인");
expect("functions/src/payup/cancellationLedger.ts", 'event_type: "PARTNER.SALE.REVERSED"', "파트너 취소 음수 이벤트");
expect("functions/src/payup/reconciliation.ts", "/cartpay/api/auth/", "거래조회 자동대사");
expect("functions/src/payup/reconciliation.ts", "/cartpay/api/closing/", "정산조회 자동대사");
expect("functions/src/access/policy.ts", "APPROVAL_SELF_APPROVAL", "요청자·승인자 분리 기반");
expect("components/auth/RoleGuard.tsx", "payupBootstrapAccess", "서버 승인 초기 관리자 부트스트랩");
reject("components/auth/RoleGuard.tsx", "rosabaya08@gmail.com", "관리자 이메일 하드코딩 제거");
expect("components/storefront/PayupTabletCartPage.tsx", "createPayupQrSession", "장바구니 전체 PayUp QR 생성");
reject("app/tablet/cart/page.tsx", "TabletCartPage", "기존 기업별 QR 장바구니 비활성");
expect("app/q/live/page.tsx", "PayupQrCheckoutPage", "정적 배포용 런타임 QR 입구");
expect("data/admin/payupSandbox.ts", 'key: "PARTIAL_CANCEL"', "부분취소 회로 존재");
expect("data/admin/payupSandbox.ts", /key:\s*"PARTIAL_CANCEL"[\s\S]{0,300}locked:\s*true/, "부분취소 영구 잠금");
expect("data/admin/payupSandbox.ts", /key:\s*"LOCAL_PAID_FALLBACK"[\s\S]{0,300}locked:\s*true/, "local paid fallback 영구 잠금");
reject("components/storefront/PayupQrCheckoutPage.tsx", "approveBackendMockPayment", "PayUp 고객결제에서 mock 승인 제거");
expect("functions/src/payup/privateOrder.ts", "ORDER_PII_READ", "주문 개인정보 서버 권한검사");
expect("functions/src/payup/privateOrder.ts", "PAYUP.ORDER_PRIVATE.READ", "주문 개인정보 감사로그");

let failed = false;
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label} (${check.file})`);
  if (!check.ok) failed = true;
}
if (failed) {
  console.error("[check-payup-safety] PayUp 안전조건을 충족하지 못했습니다.");
  process.exitCode = 1;
} else {
  console.log(`[check-payup-safety] OK. ${checks.length}개 안전조건 통과.`);
}
