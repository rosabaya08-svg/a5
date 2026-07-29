import { AppShell } from "@/components/layout/AppShell";
import { adminNavItems } from "@/components/layout/navigation";
import { PayupAdminWorkspace, type PayupAdminView } from "@/components/admin/PayupAdminWorkspace";
import {
  PayupLogsLivePanel,
  PayupSettlementsLivePanel,
  PayupTransactionsLivePanel,
} from "@/components/admin/PayupReconciliationWorkspace";

const pageCopy: Record<PayupAdminView, { title: string; subtitle: string }> = {
  overview: {
    title: "PayUp 통합 관제",
    subtitle: "연결, 하위사업자, 장바구니 차액분배, 거래대사, 정산, 전체취소와 로그를 한 곳에서 관리합니다.",
  },
  connection: {
    title: "PayUp PG 연결 설정",
    subtitle: "대표 merchantId, 서버 Secret, 고정 IP와 테스트·운영 연결 준비상태를 확인합니다.",
  },
  switchboard: {
    title: "PayUp 운영 배전판",
    subtitle: "신규 주문, 인증, 최종승인, 분배, 대사, 전체취소와 안전장치를 토글로 제어합니다.",
  },
  submerchants: {
    title: "PayUp 하위사업자",
    subtitle: "공급사, A5WS 판매 파트너와 위드커머스 본사를 간편 등록하고 PayUp 원장과 대사합니다.",
  },
  transactions: {
    title: "PayUp 거래·분배",
    subtitle: "원거래와 하위거래, 상품대금·A5S 이용료·파트너 차액·배송비를 엑셀형 원장으로 확인합니다.",
  },
  settlements: {
    title: "PayUp 정산 대사",
    subtitle: "지급예정·보류·완료, 수수료·부가세·실지급액을 하위사업자별로 검산합니다.",
  },
  cancellations: {
    title: "PayUp 전체취소",
    subtitle: "정산 HOLD, 전체취소, 거래 재대사, 역분개와 1003 수동처리 큐를 관리합니다.",
  },
  logs: {
    title: "PayUp 통합 로그",
    subtitle: "API 연동로그, 관리자 감사로그와 공급사·파트너 사업 이벤트를 상관ID로 추적합니다.",
  },
};

function workspace(view: PayupAdminView) {
  if (view === "transactions") return <PayupTransactionsLivePanel />;
  if (view === "settlements") return <PayupSettlementsLivePanel />;
  if (view === "logs") return <PayupLogsLivePanel />;
  return <PayupAdminWorkspace view={view} />;
}

export function PayupAdminPageShell({ view }: { view: PayupAdminView }) {
  const copy = pageCopy[view];

  return (
    <AppShell
      sectionTitle="A5S 기업관리자"
      title={copy.title}
      subtitle={copy.subtitle}
      scopeLabel="A5S 기업관리자 / PayUp 장바구니 PG"
      navItems={adminNavItems}
      accent="admin"
    >
      {workspace(view)}
    </AppShell>
  );
}
