import Link from "next/link";

const safetyBadges = ["Firebase beta live", "Firestore commerce ready", "PG module pending", "No production payment"];

const primaryCards = [
  {
    href: "/admin/dashboard",
    title: "최고관리자",
    description: "입점사, 조리원, QR, 정산, 감사 로그를 확인하는 mock 관리자 영역입니다.",
  },
  {
    href: "/company/dashboard",
    title: "기업 Admin",
    description: "상품, 재고, 주문, 매출, 입금 예정 상태를 확인하는 mock 기업 영역입니다.",
  },
  {
    href: "/nursery/dashboard",
    title: "조리원 Admin",
    description: "객실, 태블릿, 현장수령, QR 이력을 확인하는 mock 조리원 영역입니다.",
  },
  {
    href: "/tablet/products",
    title: "태블릿 폐쇄몰",
    description: "상품 탐색, 장바구니, QR 생성 흐름을 확인하는 태블릿 mock 화면입니다.",
  },
  {
    href: "/q/SANHO701",
    title: "고객 QR",
    description: "비회원 QR 랜딩과 checkout mock 흐름을 확인하는 고객 모바일 화면입니다.",
  },
  {
    href: "/orders/guest",
    title: "비회원 주문조회",
    description: "주문번호 기반 mock 주문조회와 주문 상세 상태를 확인합니다.",
  },
];

const launcherCards = [
  {
    href: "/products",
    title: "고객 상품 목록 alias",
    description: "404가 발생하던 /products를 /tablet/products와 같은 고객 상품 목록으로 연결했습니다.",
  },
  {
    href: "/mock-ui/status",
    title: "통합 진행 상태 대시보드",
    description: "worktree route 상태, 404 기록, 파일 그룹, blockers, next tasks를 한 화면에서 봅니다.",
  },
  {
    href: "/mock-ui",
    title: "mock UI hub",
    description: "생성된 preview route를 모아보는 mock/test beta 허브입니다.",
  },
  {
    href: "/mock-ui/smoke",
    title: "visual smoke checklist",
    description: "브라우저에서 어떤 순서로 눌러볼지 확인하는 수동 체크리스트입니다.",
  },
  {
    href: "/mock-ui/merge",
    title: "merge handoff",
    description: "다른 worktree 결과를 main에 합치기 전 확인할 항목입니다.",
  },
  {
    href: "/tablet/products",
    title: "태블릿 상품 목록",
    description: "폐쇄몰 상품 카드, 가격 비교, 재고/수령 상태를 확인합니다.",
  },
  {
    href: "/tablet/cart",
    title: "태블릿 장바구니",
    description: "수량, 옵션, 수령방식, 합계금액, QR 생성 진입을 확인합니다.",
  },
  {
    href: "/tablet/qr",
    title: "태블릿 QR 생성",
    description: "QR short code, 만료 안내, 모바일 결제 진입 링크를 확인합니다.",
  },
  {
    href: "/q/SANHO701",
    title: "고객 QR 랜딩",
    description: "고객이 모바일에서 보는 QR 결제 진입 화면입니다.",
  },
  {
    href: "/q/SANHO701/checkout",
    title: "고객 checkout mock",
    description: "실제 PG 없이 결제 전 확인 흐름만 확인합니다.",
  },
  {
    href: "/orders/guest",
    title: "비회원 주문조회 입력",
    description: "주문번호/휴대폰번호 mock 입력 UI를 확인합니다.",
  },
  {
    href: "/orders/guest/A5-20260519-001",
    title: "비회원 주문조회 상세",
    description: "비회원 주문 상세 mock 결과를 확인합니다.",
  },
  {
    href: "/company/dashboard",
    title: "기업 dashboard",
    description: "입점사 상품/주문/재고/매출 mock 운영 화면으로 이동합니다.",
  },
  {
    href: "/company/products",
    title: "기업 상품 관리",
    description: "기업 Admin의 상품 목록과 승인 상태 mock 화면을 확인합니다.",
  },
  {
    href: "/nursery/dashboard",
    title: "조리원 dashboard",
    description: "조리원 객실/태블릿/현장수령 mock 운영 화면으로 이동합니다.",
  },
  {
    href: "/nursery/rooms",
    title: "조리원 객실 관리",
    description: "객실 목록과 태블릿 연결 상태 mock 화면을 확인합니다.",
  },
];

function SafetyBadges() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {safetyBadges.map((badge) => (
        <span
          key={badge}
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

function LauncherCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="rounded-md bg-white p-5 text-slate-950 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{href}</p>
      <h2 className="mt-2 text-xl font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <SafetyBadges />
    </Link>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-7">
        <section className="rounded-md border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Mock/Test Beta</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">
            산후조리원 폐쇄몰 기반 QR 결제 쇼핑몰 mock/test beta
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            실제 Firebase, PG, 알림톡, 배송조회, 외부 재고 API 연결 없이 문서 기반 mock 데이터와
            preview 화면으로 진행 상황을 확인하는 개발용 베타입니다.
          </p>
          <SafetyBadges />
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {primaryCards.map((card) => (
            <LauncherCard key={card.href} {...card} />
          ))}
        </section>

        <section className="rounded-md border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">Local launcher</p>
              <h2 className="mt-2 text-3xl font-black">자동 생성 결과 확인</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                localhost:3000에서 바로 눌러 확인할 수 있는 mock/test beta route index입니다.
              </p>
            </div>
            <Link
              href="/mock-ui/status"
              className="rounded-md bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950"
            >
              진행 상태 보기
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {launcherCards.map((card) => (
              <LauncherCard key={card.href} {...card} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
