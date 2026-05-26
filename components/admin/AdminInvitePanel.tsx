import type { A5AuthRole } from "@/types/authClaims";

const rolePlans: Array<{
  role: A5AuthRole;
  label: string;
  scope: string;
  access: string;
  write: string;
  risk: string;
}> = [
  {
    role: "SUPER_ADMIN",
    label: "최고관리자",
    scope: "전체 운영 범위",
    access: "입점사, 조리원, 객실, 태블릿, 상품, CMS, 주문, 결제 모니터를 전체 조회합니다.",
    write: "seed/admin write 가능. 실제 결제, 환불, 정산 지급은 별도 승인 게이트를 유지합니다.",
    risk: "소수 인원만 부여하고 2단계 인증과 계정 회수 정책이 필요합니다.",
  },
  {
    role: "COMPANY_ADMIN",
    label: "기업 관리자",
    scope: "company_id 필수",
    access: "자기 입점사의 상품, 옵션, 재고, 주문 item, 광고 소재, 정산 예정 데이터만 봅니다.",
    write: "자기 company_id 범위의 상품 초안, 승인 요청, 광고 신청만 허용합니다.",
    risk: "다른 입점사의 매출, 주문자 정보, 정산 정보 접근은 차단해야 합니다.",
  },
  {
    role: "NURSERY_ADMIN",
    label: "조리원 관리자",
    scope: "nursery_id 필수",
    access: "자기 조리원의 객실, 태블릿, QR 이력, 주문, 현장수령 상태만 봅니다.",
    write: "자기 nursery_id 범위의 객실/태블릿 운영 상태와 현장수령 처리만 허용합니다.",
    risk: "입점사 정산 정보와 타 조리원 데이터 접근은 차단해야 합니다.",
  },
  {
    role: "TABLET_DEVICE",
    label: "객실 태블릿",
    scope: "nursery_id + room_id + tablet_id 필수",
    access: "자기 객실 태블릿의 산후조리원 핫딜 탐색, cart, QR 세션 생성 흐름만 허용합니다.",
    write: "주문/결제 확정 write는 태블릿이 직접 하지 않고 Functions 서버 흐름으로 넘깁니다.",
    risk: "일반 브라우저 접근과 다른 객실 QR 생성은 scope mismatch로 차단해야 합니다.",
  },
  {
    role: "CUSTOMER_GUEST",
    label: "비회원 고객",
    scope: "Firebase Auth 계정 없음",
    access: "QR short code, 주문번호, 휴대폰 hash 같은 최소 검증값으로 제한된 화면만 봅니다.",
    write: "고객 계정 claim을 만들지 않습니다. 결제/주문 변경은 서버 검증 후 처리합니다.",
    risk: "비회원 흐름은 token 만료, 중복 사용, 금액 변조 방지가 핵심입니다.",
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

export function AdminInvitePanel() {
  return (
    <section className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-blue-600">파이어베이스 권한 클레임</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">관리자 계정 발급 및 권한 설계</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              A5 산후조리원 핫딜은 비밀번호를 운영자가 평문으로 만들거나 전달하지 않습니다. 계정 발급은 Firebase Auth 초대 또는
              비밀번호 재설정 링크를 사용하고, 실제 접근 범위는 Custom Claims의 role과 scope로 제한합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
              평문 비밀번호 저장 금지
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
              대량 사용자 생성 금지
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {rolePlans.map((item) => (
            <article key={item.role} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950">{item.label}</p>
                  <p className="mt-1 text-xs font-black text-blue-700">{item.role}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                  {item.scope}
                </span>
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <p>{item.access}</p>
                <p>{item.write}</p>
                <p className="font-bold text-rose-700">{item.risk}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">초대 흐름</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">계정 발급 절차</h3>
          <ol className="mt-4 space-y-3">
            {inviteFlow.map((item, index) => (
              <li key={item} className="flex gap-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">권한 범위 예시</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">필수 claim 예시</h3>
          <div className="mt-4 space-y-3">
            {scopeExamples.map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-950 p-3">
                <p className="text-xs font-black text-slate-300">{item.label}</p>
                <code className="mt-2 block break-words text-xs font-bold leading-6 text-emerald-200">{item.claim}</code>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-800 ring-1 ring-rose-100">
            CUSTOMER_GUEST는 Auth 계정을 만들지 않습니다. 고객 결제자는 QR 세션과 주문 조회 검증으로만 제한합니다.
          </p>
        </section>
      </div>
    </section>
  );
}
