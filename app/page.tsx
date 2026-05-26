import Link from "next/link";

const entryCards = [
  {
    href: "/admin",
    eyebrow: "SUPER ADMIN",
    title: "최고관리자",
    description: "입점사, 조리원, 상품 승인, 주문, 결제, 정산, 외부 연동을 관리합니다.",
  },
  {
    href: "/company",
    eyebrow: "COMPANY",
    title: "기업 관리자",
    description: "상품 등록, 주문 처리, 재고, 배송, 매출과 입금 예정 내역을 확인합니다.",
  },
  {
    href: "/nursery",
    eyebrow: "NURSERY",
    title: "조리원 관리자",
    description: "객실, 태블릿, QR 이력, 현장수령, 주문 이력을 조리원 기준으로 확인합니다.",
  },
  {
    href: "/tablet",
    eyebrow: "TABLET",
    title: "태블릿 폐쇄몰",
    description: "객실에 고정된 태블릿에서 상품을 담고 고객 결제 QR을 생성합니다.",
  },
  {
    href: "/orders/guest",
    eyebrow: "ORDER",
    title: "비회원 주문조회",
    description: "주문번호와 휴대폰 정보로 주문 상태를 확인합니다.",
  },
];

const featureSections = [
  {
    title: "최고관리자",
    href: "/admin/feature-status",
    features: ["기능 현황", "입점사", "조리원", "상품 승인", "주문", "외부 연동", "결제", "정산"],
  },
  {
    title: "기업 관리자",
    href: "/company",
    features: ["입점 신청", "상품", "상품 등록", "주문", "재고", "배송/수령", "매출", "입금"],
  },
  {
    title: "조리원 관리자",
    href: "/nursery",
    features: ["대시보드", "객실", "태블릿", "현장수령", "QR 이력", "주문 이력"],
  },
  {
    title: "태블릿 / 고객",
    href: "/tablet",
    features: ["태블릿 로그인", "객실 선택", "상품 목록", "장바구니", "QR 생성", "비회원 주문조회"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">A5 CLOSED MALL</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">산후조리원 객실 기반 QR 결제 폐쇄몰</h1>
          <p className="mt-5 text-base leading-7 text-slate-300">
            역할에 맞는 로그인 후 상품, 주문, 객실, 태블릿, 정산, 외부 연동 업무를 진행합니다.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entryCards.map((card) => (
            <Link key={card.href} href={card.href} className="rounded-md bg-white p-5 text-slate-950 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{card.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-black">{card.title}</h2>
              <p className="mt-3 min-h-16 text-sm leading-6 text-slate-600">{card.description}</p>
              <span className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">이동</span>
            </Link>
          ))}
        </div>

        <section className="mt-8 rounded-md border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-300">FEATURE MAP</p>
              <h2 className="mt-2 text-2xl font-black">전체 기능 바로가기</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">역할별 로그인 이후 사용할 기능들을 한눈에 확인합니다.</p>
            </div>
            <Link href="/admin/feature-status" className="rounded-md bg-white px-4 py-3 text-sm font-black text-slate-950">
              기능 현황 전체 보기
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureSections.map((section) => (
              <Link key={section.title} href={section.href} className="rounded-md border border-white/10 bg-slate-900 p-4 transition hover:-translate-y-1 hover:bg-slate-800">
                <h3 className="text-lg font-black">{section.title}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.features.map((feature) => (
                    <span key={feature} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-100 ring-1 ring-white/10">
                      {feature}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
