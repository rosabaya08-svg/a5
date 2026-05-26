import type { StorefrontCategory } from "@/types/mockStorefrontView";

export function MockCategoryRail({ categories }: { categories: StorefrontCategory[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {categories.map((category) => (
        <article key={category.id} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">카테고리</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{category.label}</h2>
            </div>
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
              {category.itemCount}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{category.helper}</p>
        </article>
      ))}
    </section>
  );
}
