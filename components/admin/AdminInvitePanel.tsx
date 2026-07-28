import type { A5AuthRole } from "@/types/authClaims";

const rolePlans: Array<{
  role: A5AuthRole;
  label: string;
  scope: string;
  access: string;
  write: string;
  risk: string;
  href?: string;
}> = [
  {
    role: "SUPER_ADMIN",
    label: "최고관리자",
    scope: "전체 운영 범위",
    access: "입점사, 조리원, 객실, 태블릿, 상품, CMS, 주문, 결제 모니터를 전체 조회합니다.",
    write: "seed/admin write 가능. 실제 결제, 환불, 정산 지급은 별도 승인 게이트를 유지합니다.",
    risk: "소수 인원만 부여하고 2단계 인증과 계정 회수 정책이 필요합니다.",
    href: "/admin/dashboard/",
  },
  {
    role: "COMPANY_ADMIN",
    label: "기업 관리자",
    scope: "company_id 필수",
    access: "자기 입점사의 상품, 옵션, 재고, 주문 item, 광고 소재, Payup 대조 데이터만 봅니다.",
    write: "자기 company_id 범위의 상품 초안, 승인 요청, 광고 신청만 허용합니다.",
    risk: "다른 입점사의 매출, 주문자 정보, 정산 정보 접근은 차단해야 합니다.",
    href: "/company/login/",
  },
  {
    role: "NURSERY_ADMIN",
    label: "조리원 관리자",
    scope: "nursery_id 필수",
    access: "자기 조리원의 객실, 태블릿, QR 이력, 주문, 현장수령 상태만 봅니다.",
    write: "자기 nursery_id 범위의 객실/태블릿 운영 상태와 현장수령 처리만 허용합니다.",
    risk: "입점사 정산 정보와 타 조리원 데이터 접근은 차단해야 합니다.",
    href: "/nursery/login/",
  },
  {
    role: "TABLET_DEVICE",
    label: "객실 태블릿",
    scope: "nursery_id + room_id + tablet_id 필수",
    access: "자기 객실 태블릿의 산후조리원 핫딜 탐색, cart, QR 세션 생성 흐름만 허용합니다.",
    write: "주문/결제 확정 write는 태블릿이 직접 하지 않고 Functions 서버 흐름으로 넘깁니다.",
    risk: "일반 브라우저 접근과 다른 객실 QR 생성은 scope mismatch로 차단해야 합니다.",
    href: "/tablet/login/",
  },
  {
    role: "CUSTOMER_GUEST",
    label: "비회원 고객",
    scope: "Firebase Auth 계정 없음",
    access: "QR short code, 주문번호, 휴대폰 hash 같은 최소 검증값으로 제한된 화면만 봅니다.",
    write: "고객 계정 claim을 만들지 않습니다. 결제/주문 변경은 서버 검증 후 처리합니다.",
    risk: "비회원 흐름은 token 만료, 중복 사용, 금액 변조 방지가 핵심입니다.",
    href: "/orders/guest/",
  },
  {
    role: "seed_admin",
    label: "초기 seed 관리자",
    scope: "seed_admin=true 또는 role=seed_admin",
    access: "초기 베타 seed, 데이터 이관, 관리자 write 검증에만 임시 사용합니다.",
    write: "seed/admin write 가능. 운영 전 장기 계정으로 남기지 않는 것이 원칙입니다.",
    risk: "권한 회수 일정과 audit log 기록이 필요합니다.",
  },
];

const portalQuickLinks = [
  { label: "기업관리자", href: "/company/login/", helper: "입점사 상품, 주문, 정산 관리" },
  { label: "조리원 관리자", href: "/nursery/login/", helper: "객실, 태블릿, QR 현장 운영" },
  { label: "객실 테블릿", href: "/tablet/login/", helper: "폐쇄몰 로그인 및 객실 고정" },
  { label: "비회원고객", href: "/orders/guest/", helper: "주문번호 기반 조회" },
  { label: "모바일 둘러보기", href: "/m/shop/?sessionId=dev-mobile-preview&adminPreview=1", helper: "관리자용 모바일 미리보기" },
];

const inviteFlow = [
  "최고관리자가 이메일과 role, scope(company_id/nursery_id/room_id/tablet_id)를 입력합니다.",
  "서버가 role별 필수 scope 누락 여부를 검증합니다.",
  "Firebase Auth 초대 또는 비밀번호 재설정 링크로 사용자가 직접 비밀번호를 설정합니다.",
  "서버가 Custom Claims를 설정하고 audit log에 권한 변경 이력을 남깁니다.",
  "대량 사용자 생성, 평문 비밀번호 전달, Secret Key 노출은 금지합니다.",
];

const scopeExamples = [
  { label: "기업 관리자", claim: `{ role: "COMPANY_ADMIN", company_id: "company-sanho-care" }` },
  { label: "조리원 관리자", claim: `{ role: "NURSERY_ADMIN", nursery_id: "nursery-sanho-01" }` },
  {
    label: "객실 태블릿",
    claim: `{ role: "TABLET_DEVICE", nursery_id: "nursery-sanho-01", room_id: "room-701", tablet_id: "tablet-701-a" }`,
  },
];

const mockStatusFunctions: Array<{
  area: string;
  functionName: string;
  route: string;
  status: "mock" | "hybrid" | "live" | "blocked";
  stateLabel: string;
  currentBehavior: string;
  nextGate: string;
}> = [
  {
    area: "입점사 승인",
    functionName: "가입 요청 조회 / 승인 처리",
    route: "/admin/companies",
    status: "hybrid",
    stateLabel: "Firestore + 목업 병행",
    currentBehavior: "회사 신청 문서, 승인 상태, MID 입력 상태를 보여주고 테스트 계정 1004 테스트는 approved로 준비했습니다.",
    nextGate: "운영 승인 버튼은 SUPER_ADMIN claim, audit_logs, companySignupReview Functions 검증 후에만 실제 쓰기로 열어야 합니다.",
  },
  {
    area: "권한/계정",
    functionName: "기업관리자 Auth claim",
    route: "/admin/permissions",
    status: "live",
    stateLabel: "Firebase Auth 반영",
    currentBehavior: "test1004@example.com에 COMPANY_ADMIN / company-test-1004 claim을 부여하고 권한 발급 기록을 남겼습니다.",
    nextGate: "운영 계정은 평문 비밀번호 없이 초대 또는 재설정 링크로만 발급해야 합니다.",
  },
  {
    area: "기업 관리자 로그인",
    functionName: "7592901311 테스트 계정",
    route: "/company/login",
    status: "hybrid",
    stateLabel: "베타 로그인 + Auth 권한",
    currentBehavior: "사업자번호 7592901311, 비밀번호 1004로 기업관리자 화면 진입용 베타 계정이 준비되어 있습니다.",
    nextGate: "정식 운영 전에는 Firebase Auth 세션 기준 로그인으로 전환하고 브라우저 세션 목업 의존을 제거해야 합니다.",
  },
  {
    area: "상품 업로드",
    functionName: "테스트 1004 상품 노출",
    route: "/admin/products",
    status: "live",
    stateLabel: "Firestore 상품 반영",
    currentBehavior: "products/product-test-1004와 product_detail_pages/product-detail-test-1004를 승인 상태로 생성했습니다.",
    nextGate: "입점사 상품 등록 UI에서 제출한 draft를 관리자 승인 후 products 문서로 승격하는 서버 흐름이 필요합니다.",
  },
  {
    area: "폐쇄몰 QR 결제",
    functionName: "TEST1004 QR 조회 / 결제 준비",
    route: "/q/TEST1004",
    status: "hybrid",
    stateLabel: "Functions 연결 + PG 테스트",
    currentBehavior: "qrLookup과 paymentsReady는 1004원 상품, 수량 1, 인피니 테스트 MID를 반환합니다.",
    nextGate: "실 MID, Merchant-Key, licenseKey, Noti URL을 받아 실 PG 승인/취소/Noti 검증까지 통과해야 합니다.",
  },
  {
    area: "결제/정산",
    functionName: "실 결제 확정 / 정산 지급",
    route: "/admin/payments",
    status: "blocked",
    stateLabel: "운영 차단",
    currentBehavior: "금액 재계산과 PG 준비 응답은 가능하지만 실 승인, 환불, 정산 지급은 운영 키 없이는 열지 않습니다.",
    nextGate: "실 PG 키 입력, 서버 secret 보관, webhook 서명 검증, 환불/정산 승인 게이트가 필요합니다.",
  },
];

const statusStyles: Record<(typeof mockStatusFunctions)[number]["status"], string> = {
  mock: "bg-slate-100 text-slate-700 ring-slate-200",
  hybrid: "bg-amber-50 text-amber-800 ring-amber-200",
  live: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  blocked: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function AdminInvitePanel() {
  return (
    <section className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal uppercase text-blue-600">파이어베이스 권한 클레임</p>
            <h2 className="mt-1 text-xl font-normal text-slate-950">관리자 계정 발급 및 권한 설계</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              위드커머스는 비밀번호를 운영자가 평문으로 만들거나 전달하지 않습니다. 계정 발급은 Firebase Auth 초대 또는
              비밀번호 재설정 링크를 사용하고, 실제 접근 범위는 Custom Claims의 role과 scope로 제한합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-normal text-emerald-700 ring-1 ring-emerald-200">
              평문 비밀번호 저장 금지
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-normal text-amber-700 ring-1 ring-amber-200">
              대량 사용자 생성 금지
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {portalQuickLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group rounded-md border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-normal text-slate-950">{item.label}</span>
                <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-sm font-normal text-slate-700 transition group-hover:bg-blue-600 group-hover:text-white">
                  →
                </span>
              </span>
              <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">{item.helper}</span>
            </a>
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {rolePlans.map((item) => (
            <a
              key={item.role}
              href={item.href ?? "/admin/permissions/"}
              aria-disabled={item.href ? undefined : true}
              className={`group rounded-md border border-slate-200 bg-slate-50 p-4 transition ${
                item.href ? "hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" : "cursor-default"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-normal text-slate-950">{item.label}</p>
                  <p className="mt-1 text-xs font-normal text-blue-700">{item.role}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-normal text-slate-700 ring-1 ring-slate-200">
                    {item.scope}
                  </span>
                  {item.href ? (
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-sm font-normal text-slate-600 ring-1 ring-slate-200 transition group-hover:bg-blue-600 group-hover:text-white">
                      →
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <p>{item.access}</p>
                <p>{item.write}</p>
                <p className="font-normal text-rose-700">{item.risk}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal text-blue-600">목업 상태 목록</p>
            <h3 className="mt-1 text-lg font-normal text-slate-950">입점사 관리 / 권한 계정 기능 상태</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              최고관리자가 헷갈리지 않도록 현재 화면에서 목업, 실제 Firebase 반영, Functions 연결, 운영 차단 항목을 분리해 표시합니다.
            </p>
          </div>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-normal text-white">
            운영 전 점검표
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <div className="min-w-[980px]">
          <div className="grid grid-cols-[130px_170px_130px_1fr_1fr] gap-0 bg-slate-50 px-3 py-3 text-xs font-normal text-slate-500">
            <span>구역</span>
            <span>기능</span>
            <span>상태</span>
            <span>현재 동작</span>
            <span>운영 전 필요</span>
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            {mockStatusFunctions.map((item) => (
              <div key={`${item.area}-${item.functionName}`} className="grid grid-cols-[130px_170px_130px_1fr_1fr] gap-0 px-3 py-4 text-sm leading-6">
                <div>
                  <p className="font-normal text-slate-950">{item.area}</p>
                  <p className="mt-1 text-xs font-normal text-blue-700">{item.route}</p>
                </div>
                <p className="font-normal text-slate-800">{item.functionName}</p>
                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-normal ring-1 ${statusStyles[item.status]}`}>
                    {item.stateLabel}
                  </span>
                </div>
                <p className="text-slate-700">{item.currentBehavior}</p>
                <p className="font-normal text-slate-700">{item.nextGate}</p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-normal uppercase text-slate-500">초대 흐름</p>
          <h3 className="mt-1 text-lg font-normal text-slate-950">계정 발급 절차</h3>
          <ol className="mt-4 space-y-3">
            {inviteFlow.map((item, index) => (
              <li key={item} className="flex gap-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-normal text-white">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-normal uppercase text-slate-500">권한 범위 예시</p>
          <h3 className="mt-1 text-lg font-normal text-slate-950">필수 claim 예시</h3>
          <div className="mt-4 space-y-3">
            {scopeExamples.map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-950 p-3">
                <p className="text-xs font-normal text-slate-300">{item.label}</p>
                <code className="mt-2 block break-words text-xs font-normal leading-6 text-emerald-200">{item.claim}</code>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-normal leading-6 text-rose-800 ring-1 ring-rose-100">
            CUSTOMER_GUEST는 Auth 계정을 만들지 않습니다. 고객 결제자는 QR 세션과 주문 조회 검증으로만 제한합니다.
          </p>
        </section>
      </div>
    </section>
  );
}
