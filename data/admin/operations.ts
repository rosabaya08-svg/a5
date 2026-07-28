import type {
  RepositoryConnectionItem,
} from "@/types/admin";

export const repositoryConnectionItems: RepositoryConnectionItem[] = [
  {
    id: "repo-companies",
    label: "입점사 승인",
    firestoreCollection: "companies",
    currentMode: "repository_ready",
    writePolicy: "SUPER_ADMIN_required",
    note: "승인/반려 쓰기는 SUPER_ADMIN 권한 클레임과 감사 로그가 필요합니다.",
  },
  {
    id: "repo-products",
    label: "상품 승인",
    firestoreCollection: "products, product_detail_pages",
    currentMode: "repository_ready",
    writePolicy: "SUPER_ADMIN_required",
    note: "상품 승인 상태 변경은 법적 고지/KC 검토 summary와 함께 기록해야 합니다.",
  },
  {
    id: "repo-content",
    label: "CMS 편성",
    firestoreCollection: "marketing_banners, marketing_videos, home_sections, media_assets",
    currentMode: "repository_ready",
    writePolicy: "SUPER_ADMIN_required",
    note: "노출 기간, 정렬, 대상, 링크 설정을 승인 후 published/scheduled로 전환합니다.",
  },
  {
    id: "repo-payments",
    label: "결제 모니터",
    firestoreCollection: "payment_intents, payments, payment_events",
    currentMode: "server_write_only",
    writePolicy: "Functions_only",
    note: "관리자 화면은 read/monitor만 수행하며 실제 승인/환불 write는 Functions/PG 정책이 필요합니다.",
  },
  {
    id: "repo-orders",
    label: "주문 모니터",
    firestoreCollection: "orders, order_items",
    currentMode: "server_write_only",
    writePolicy: "Functions_only",
    note: "주문 생성과 상태 변경은 QR/결제 transaction 경로를 우선합니다.",
  },
];
