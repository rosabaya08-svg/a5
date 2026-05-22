import { TabletProductsPage } from "@/components/pages/tabletPages";

const badges = ["mock/test beta", "Firebase 연결 없음", "PG 연결 없음", "운영 배포 아님"];

export default async function ProductsPage() {
  return (
    <>
      <section className="bg-slate-950 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">Products alias</p>
            <h1 className="mt-1 text-xl font-black">고객용 상품 목록 mock/test beta</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge} className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-950">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>
      <TabletProductsPage />
    </>
  );
}

