import type { A5AuthRole } from "@/types/authClaims";

const roles: Array<{ role: A5AuthRole; scope: string; note: string }> = [
  { role: "SUPER_ADMIN", scope: "all", note: "전체 운영자. 최소 인원만 부여합니다." },
  { role: "COMPANY_ADMIN", scope: "company_id", note: "자기 입점사 상품/주문/정산만 접근합니다." },
  { role: "NURSERY_ADMIN", scope: "nursery_id", note: "자기 조리원 객실/태블릿/주문만 접근합니다." },
  { role: "TABLET_DEVICE", scope: "nursery_id + room_id + tablet_id", note: "객실 태블릿 폐쇄몰 접근용 기기 claim입니다." },
  { role: "seed_admin", scope: "seed/admin write", note: "초기 seed 및 베타 운영 write 권한입니다." },
];

export function AdminInvitePanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-blue-600">auth claims</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">관리자 계정 발급 설계</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            평문 비밀번호 저장은 금지하고 Firebase Auth 초대/비밀번호 재설정과 Custom Claims로 권한을 분리합니다.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
          비밀번호 평문 저장 금지
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((item) => (
          <article key={item.role} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-black text-slate-950">{item.role}</p>
            <p className="mt-1 text-xs font-bold text-blue-700">{item.scope}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
