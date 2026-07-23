import { AppShell } from "@/components/layout/AppShell";
import { companyNavItems } from "@/components/layout/navigation";

export default function Page() {
  return (
    <AppShell sectionTitle="기업관리자" scopeLabel="입점사 운영 콘솔" navItems={companyNavItems} accent="company" title="PayUp 관리자" subtitle="결제 거래와 입금 내역은 PayUp 관리자에서 확인합니다.">
      <section className="rounded-md border border-blue-200 bg-blue-50 p-6">
        <h2 className="text-xl text-slate-950">PayUp 관리자 연결</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          A5 Mall은 별도 정산액을 계산하지 않습니다. 승인, 취소, 입금과 거래 조회는 업체가 직접 계약한 PayUp 관리자에서 확인합니다.
        </p>
        <a
          href="https://cp.payup.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex rounded-md bg-blue-700 px-5 py-3 text-sm text-white"
        >
          PayUp 관리자 새 창으로 열기
        </a>
        <p className="mt-3 text-xs text-slate-500">MID와 인증키는 외부 이동 주소에 포함하지 않습니다.</p>
      </section>
    </AppShell>
  );
}
