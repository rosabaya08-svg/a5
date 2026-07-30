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
expect("functions/src/payup/reconciliation.ts", '"auth-list"', "거래조회 자동대사");
expect("functions/src/payup/reconciliation.ts", '"closing-list"', "정산조회 자동대사");
expect("functions/src/payup/accessSecure.ts", "APPROVAL_SELF_APPROVAL_BLOCKED", "요청자·승인자 분리 기반");
expect("components/auth/RoleGuard.tsx", "payupBootstrapAccess", "서버 승인 초기 관리자 부트스트랩");
reject("components/auth/RoleGuard.tsx", "rosabaya08@gmail.com", "관리자 이메일 하드코딩 제거");
expect("components/storefront/PayupTabletCartPage.tsx", "createPayupQrSession", "장바구니 전체 PayUp QR 생성");
expect("app/tablet/cart/page.tsx", 'import { PayupTabletCartPage }', "PayUp 통합 장바구니 활성");
reject("app/tablet/cart/page.tsx", /import\s*\{\s*TabletCartPage\s*\}/, "기존 기업별 QR 장바구니 비활성");
expect("app/q/live/page.tsx", "PayupQrCheckoutPage", "정적 배포용 런타임 QR 입구");
expect("data/admin/payupSandbox.ts", 'key: "PARTIAL_CANCEL"', "부분취소 회로 존재");
expect("data/admin/payupSandbox.ts", /key:\s*"PARTIAL_CANCEL"[\s\S]{0,300}locked:\s*true/, "부분취소 영구 잠금");
expect("data/admin/payupSandbox.ts", /key:\s*"LOCAL_PAID_FALLBACK"[\s\S]{0,300}locked:\s*true/, "local paid fallback 영구 잠금");
reject("components/storefront/PayupQrCheckoutPage.tsx", "approveBackendMockPayment", "PayUp 고객결제에서 mock 승인 제거");
expect("components/storefront/PayupQrCheckoutPage.tsx", "readPayupPublicQr", "QR 조회 Cloud Functions Gateway 사용");
reject("components/storefront/PayupQrCheckoutPage.tsx", "readLiveShopQrSessionByShortCode", "QR 금융세션 Firestore 직접조회 제거");
expect("functions/src/payup/privateOrder.ts", "ORDER_PII_READ", "주문 개인정보 서버 권한검사");
expect("functions/src/payup/privateOrder.ts", "PAYUP.ORDER_PRIVATE.READ", "주문 개인정보 감사로그");
expect("functions/src/payup/distribution.ts", 'actionType: "DISTRIBUTION_POLICY_CHANGE"', "분배정책 2인 승인");
expect("functions/src/access/requestGuards.ts", "requireFirebaseAppCheck", "결제 브라우저 App Check");
expect("functions/src/payup/paymentOrder.ts", "encryptPrivateSnapshot", "주문 개인정보 암호화");
expect("functions/src/payup/paymentApproval.ts", "PAYUP_RECONCILIATION_REQUIRED", "승인 불명확 시 재호출 금지");
expect("functions/src/payup/paymentApproval.ts", 'providerResponseCode === "9108"', "9108 하위가맹점 등록 오류 운영큐 전환");
expect("functions/src/payup/paymentOrder.ts", "SUBMERCHANT_CHECKOUT_PREFLIGHT", "결제창 전 운영 하위가맹점 조회");
expect("functions/src/payup/paymentOrder.ts", "PAYUP_SUBMERCHANT_NOT_REGISTERED", "운영 목록 미등록 시 결제창 차단");
expect("functions/src/payup/cartApiV12.ts", "PAYUP_SUBMERCHANT_NOT_SYNCED", "내부 ACTIVE만으로 승인하지 않음");
expect("functions/src/payup/cartApiV12.ts", "apiKey.length !== 32", "장바구니 API KEY 32자 계약");
expect("functions/src/payup/cartApiV12.ts", "PAYUP_RESPONSE_CONTRACT_INVALID", "성공 목록 JSON 배열 계약");
expect("functions/src/payup/cartApiV12.ts", "accountNumberMasked", "정산 계좌번호 마스킹");
expect("functions/src/payup/runtimeV2.ts", 'config.environment === "production"', "고정 IP 조건을 운영 환경에만 적용");
expect("functions/src/payup/adminSecure.ts", 'payup_sync_status: "NOT_FOUND"', "운영 목록 누락 하위가맹점 차단");
expect("functions/src/payup/paymentOrder.ts", "buildSubmerchantListPayload", "결제 전 하위가맹점 조회 v1.2 계약 공통화");
expect("functions/src/payup/reconciliation.ts", "buildTransactionListPayload", "예약 거래대사 v1.2 계약 공통화");
expect("functions/src/payup/reconciliation.ts", "projectSettlementSummary", "예약 정산대사 안전 응답 공통화");
reject("components/admin/PayupAdminWorkspace.tsx", 'const prefix = role.includes("파트너")', "subMerchantId 역할 기반 자동생성 제거");

reject("firestore.rules", "rosabaya08@gmail.com", "Firestore 관리자 이메일 하드코딩 제거");
reject("firestore.rules", "isMasterEmail", "Firestore 이메일 기반 최고관리자 함수 제거");
expect("firestore.rules", 'hasRole("SUPER_ADMIN")', "Firestore Custom Claims 최고관리자 판정");
expect("firestore.rules", 'hasRole("TABLET_DEVICE")', "Firestore TABLET_DEVICE Claim 판정");
expect("firestore.rules", 'match /payment_transactions/{document=**} { allow read, write: if false; }', "결제거래 클라이언트 직접접근 차단");
expect("firestore.rules", 'match /payment_distribution_lines/{document=**} { allow read, write: if false; }', "차액분배원장 클라이언트 직접접근 차단");
expect("firestore.rules", 'match /payup_submerchants/{document=**} { allow read, write: if false; }', "PayUp 하위업체 원장 클라이언트 직접접근 차단");
expect("firestore.rules", 'match /settlements/{document=**} { allow read, write: if false; }', "정산원장 클라이언트 직접접근 차단");
expect("firestore.rules", 'match /access_members/{document=**} { allow read, write: if false; }', "권한원장 클라이언트 직접접근 차단");

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
