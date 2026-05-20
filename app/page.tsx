export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="rounded-md border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
            Mock/Test Beta
          </p>
          <h1 className="mt-3 text-4xl font-bold">
            산후조리원 폐쇄몰 기반 QR 결제 쇼핑몰
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            실제 Firebase, PG, 알림톡, 배송조회, 외부 재고 API 없이 문서 기반 mock 데이터로 구성한 개발용 베타입니다.
          </p>
        </section>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["/admin/dashboard", "최고관리자", "입점사, 조리원, QR, 정산, 감사 로그"],
            ["/company/dashboard", "기업 Admin", "상품, 재고, 주문, 매출, 입금"],
            ["/nursery/dashboard", "조리원 Admin", "객실, 태블릿, 현장수령, QR 이력"],
            ["/tablet/products", "태블릿 폐쇄몰", "상품 탐색, 장바구니, QR 생성"],
            ["/q/SANHO701", "고객 QR", "비회원 QR 랜딩과 mock 결제"],
            ["/orders/guest", "비회원 주문조회", "주문번호 기반 mock 조회"],
          ].map(([href, title, description]) => (
            <a key={href} href={href} className="rounded-md bg-white p-5 text-slate-950 transition hover:-translate-y-0.5">
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
