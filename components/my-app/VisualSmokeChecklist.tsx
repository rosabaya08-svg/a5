import Link from "next/link";
import { smokeRoutes } from "@/data/my-app/statusMock";

const smokeSteps = [
  {
    id: "smoke-home",
    title: "홈 런처 열기",
    route: "/",
    checks: ["기존 6개 영역 카드가 보임", "자동 생성 결과 확인 섹션이 보임", "안전 상태 배지가 보임"],
  },
  {
    id: "smoke-status",
    title: "통합 상태 열기",
    route: "/mock-ui/status",
    checks: ["진행률 카드가 보임", "파일 그룹이 보임", "작업 폴더 포트 안내가 보임"],
  },
  {
    id: "smoke-hub",
    title: "모의 UI 허브 열기",
    route: "/mock-ui",
    checks: ["경로 카드가 보임", "빈 상태/오류/위험 미리보기가 보임", "필터 컨트롤을 읽을 수 있음"],
  },
  {
    id: "smoke-tablet",
    title: "태블릿 흐름 열기",
    route: "/products",
    checks: [
      "/products가 더 이상 404를 반환하지 않음",
      "/tablet/products가 열림",
      "/tablet/cart가 열림",
      "/tablet/qr가 열림",
      "실결제처럼 오해되는 문구가 없음",
    ],
  },
  {
    id: "smoke-customer",
    title: "고객 QR 흐름 열기",
    route: "/q/SANHO701",
    checks: ["/q/SANHO701/checkout이 열림", "비회원 결제는 모의 전용임", "고객 로그인이 필요하지 않음"],
  },
  {
    id: "smoke-guest",
    title: "비회원 주문 상세 열기",
    route: "/orders/guest/A5-20260519-001",
    checks: ["주문 상태를 읽을 수 있음", "환불/정산은 모의 상태로 유지됨", "개인정보 실검증처럼 보이지 않음"],
  },
  {
    id: "smoke-company",
    title: "기업 경로 열기",
    route: "/company/dashboard",
    checks: ["/company/products가 열림", "기업 경로가 모의/테스트 베타 상태임", "실제 입금 실행이 없음"],
  },
  {
    id: "smoke-nursery",
    title: "조리원 경로 열기",
    route: "/nursery/dashboard",
    checks: ["/nursery/rooms가 열림", "조리원 경로가 모의/테스트 베타 상태임", "실제 고객 데이터를 조회하지 않음"],
  },
];

export function VisualSmokeChecklist() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">화면 점검 체크리스트</p>
          <h1 className="mt-3 text-4xl font-black">localhost:3000 수동 클릭 순서</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            브라우저에서 눈으로 확인하는 전용 체크리스트입니다. 이 화면은 린트, 빌드, git,
            Firebase, PG, 배포, 알림톡, 배송조회, 외부 재고 명령을 실행하지 않습니다.
          </p>
        </header>

        <section className="grid gap-3 lg:grid-cols-2">
          {smokeSteps.map((step, index) => (
            <article key={step.id} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{index + 1}단계</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{step.title}</h2>
                </div>
                <Link href={step.route} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
                  {step.route}
                </Link>
              </div>
              <ul className="mt-4 grid gap-2">
                {step.checks.map((check) => (
                  <li key={check} className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    {check}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">경로 목록</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">클릭 가능한 화면 점검 경로</h2>
            </div>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
              수동 확인 전용
            </span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {smokeRoutes.map((route) => (
              <Link key={route.id} href={route.route} className="rounded-md bg-slate-50 p-3 hover:bg-white">
                <p className="font-black text-slate-950">{route.route}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{route.purpose}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
