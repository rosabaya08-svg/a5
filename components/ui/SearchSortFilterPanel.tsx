import type { FilterGroup, SortOption } from "@/types/mockUi";

type SearchSortFilterPanelProps = {
  title: string;
  description?: string;
  searchPlaceholder: string;
  filterGroups: FilterGroup[];
  sortOptions: SortOption[];
};

export function SearchSortFilterPanel({
  title,
  description,
  searchPlaceholder,
  filterGroups,
  sortOptions,
}: SearchSortFilterPanelProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        <label className="w-full max-w-sm">
          <span className="sr-only">{searchPlaceholder}</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-950"
            placeholder={searchPlaceholder}
            type="search"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="grid gap-3 md:grid-cols-3">
          {filterGroups.map((group) => (
            <div key={group.id} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{group.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <span
                    key={option.value}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    {option.label}
                    {typeof option.count === "number" ? ` ${option.count}` : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md bg-slate-950 p-3 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-300">Sort</p>
          <div className="mt-2 grid gap-2">
            {sortOptions.map((option) => (
              <span key={option.value} className="rounded-md bg-white/10 px-2.5 py-2 text-xs font-semibold">
                {option.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

