import type { DeviceContext, PayerHandoff, SessionLifecycleStep } from "@/types/mockSessionLifecycle";

export const sessionLifecycleSteps: SessionLifecycleStep[] = [
  {
    id: "step-cart",
    state: "draft_cart",
    title: "태블릿 장바구니 snapshot",
    description: "태블릿이 상품, 옵션, 수량, 수령 방식, 객실 정보를 모의 데이터로 모읍니다.",
    actor: "tablet",
    riskStatuses: ["mock_only"],
  },
  {
    id: "step-qr",
    state: "qr_active",
    title: "QR 세션 활성",
    description: "짧은 코드와 만료 안내를 표시합니다. 이 화면에서 실제 서버 세션은 생성하지 않습니다.",
    actor: "system_mock",
    riskStatuses: ["mock_only", "integration_pending"],
  },
  {
    id: "step-handoff",
    state: "handoff_opened",
    title: "모바일 결제자가 링크 열기",
    description: "고객 또는 보호자가 고객 로그인 없이 모바일 결제 미리보기를 확인합니다.",
    actor: "guest_mobile",
    riskStatuses: ["mock_only"],
  },
  {
    id: "step-paid",
    state: "paid_mock",
    title: "모의 결제 결과",
    description: "PG 요청 없이 성공 또는 실패 상태를 UI로 표시할 수 있습니다.",
    actor: "system_mock",
    riskStatuses: ["payment_failed", "mock_only"],
  },
  {
    id: "step-expired",
    state: "expired",
    title: "만료 또는 이미 사용됨",
    description: "만료와 1회용 사용 완료 케이스는 실연동 전 서버 로직에서 차단되어야 합니다.",
    actor: "system_mock",
    riskStatuses: ["expired", "blocked"],
  },
];

export const deviceContexts: DeviceContext[] = [
  {
    id: "device-room-701",
    nurseryName: "산호 산후조리원",
    roomName: "701호",
    tabletLabel: "태블릿 701-A",
    lastSeenAt: "2026-05-20 21:25",
    sourcePolicy: "태블릿 전용 산후조리원 핫딜 진입입니다. 일반 브라우저 접근은 모의 차단 상태로 표시합니다.",
    riskStatuses: ["mock_only"],
  },
  {
    id: "device-room-808",
    nurseryName: "산호 산후조리원",
    roomName: "808호",
    tabletLabel: "태블릿 808-B",
    lastSeenAt: "2026-05-20 19:42",
    sourcePolicy: "점검 상태에서는 직원 검토 전까지 QR 생성이 막혀야 합니다.",
    riskStatuses: ["needs_review", "mock_only"],
  },
];

export const payerHandoffs: PayerHandoff[] = [
  {
    id: "handoff-purchase",
    shortCode: "SANHO701",
    type: "purchase",
    payerRole: "비회원 모바일 결제자",
    displayMessage: "결제 미리보기 진입 전 상품 snapshot과 모의 결제 예정 금액을 확인합니다.",
    expiryMessage: "2026-05-20 23:10 만료",
    riskStatuses: ["mock_only", "integration_pending"],
  },
  {
    id: "handoff-ask",
    shortCode: "ASKMOM88",
    type: "ask",
    payerRole: "보호자 결제자",
    displayMessage: "조리원 객실 밖의 보호자에게 전달하는 조르기 결제 링크 미리보기입니다.",
    expiryMessage: "만료된 세션은 안전한 차단 상태를 보여줘야 합니다.",
    riskStatuses: ["expired", "mock_only"],
  },
];
