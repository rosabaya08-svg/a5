import { MockCheckoutSummary } from "@/components/ui/MockCheckoutSummary";
import { MockGuestOrderLookup } from "@/components/ui/MockGuestOrderLookup";
import { mockCheckoutSummary, mockGuestLookupResult } from "@/data/mockCheckoutView";

export default function MockCheckoutPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">결제 미리보기</p>
          <h1 className="mt-2 text-3xl font-black">QR 결제와 비회원 주문조회</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            모바일과 태블릿 화면에서 쓰는 결제 확인, 비회원 주문조회 패턴을 모의로 보여줍니다.
            Firebase Auth, Firestore, PG, 알림톡, 배송조회, 외부 재고 API 호출은 실행하지 않습니다.
          </p>
        </header>

        <MockCheckoutSummary summary={mockCheckoutSummary} />
        <MockGuestOrderLookup result={mockGuestLookupResult} />
      </div>
    </main>
  );
}
