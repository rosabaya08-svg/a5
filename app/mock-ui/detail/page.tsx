import { MockMallProductCard } from "@/components/ui/MockMallProductCard";
import { MockOrderTimeline } from "@/components/ui/MockOrderTimeline";
import { MockQrSessionCard } from "@/components/ui/MockQrSessionCard";
import { mockMallProducts, mockOrderTimeline, mockQrSessionCards } from "@/data/mockCommerceView";

export default function MockUiDetailPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">상세 모의 화면</p>
          <h1 className="mt-2 text-3xl font-black">쇼핑, QR, 주문 상세 화면 패턴</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            상품 카드, QR 세션 요약, 주문 타임라인 상태를 미리보기로 확인합니다.
            Firebase, PG, 알림톡, 배송조회, 외부 재고 API는 연결하지 않습니다.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mockMallProducts.map((product) => (
            <MockMallProductCard key={product.id} product={product} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4">
            {mockQrSessionCards.map((session) => (
              <MockQrSessionCard key={session.id} session={session} />
            ))}
          </div>
          <MockOrderTimeline steps={mockOrderTimeline} />
        </section>
      </div>
    </main>
  );
}
