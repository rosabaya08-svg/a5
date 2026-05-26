type FilterBarProps = {
  title: string;
  filters: string[];
  searchPlaceholder?: string;
  sortOptions?: string[];
  resultCount?: number;
  mode?: "compact" | "toolbar";
};

export function FilterBar({
  title,
  filters,
  searchPlaceholder = "검색어 입력",
  sortOptions = ["최신순", "상태순", "위험순"],
  resultCount,
  mode = "compact",
}: FilterBarProps) {
  return (
    <div className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">{title}</p>
          {typeof resultCount === "number" ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">{resultCount}개 모의 결과</p>
          ) : null}
        </div>
        {mode === "toolbar" ? (
          <div className="grid w-full gap-2 md:w-auto md:grid-cols-[260px_160px]">
            <input
              readOnly
              value={searchPlaceholder}
              className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600"
            />
            <select
              disabled
              value={sortOptions[0]}
              className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600"
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {filters.map((filter, index) => (
          <span
            key={filter}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              index === 0
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {filter}
          </span>
        ))}
      </div>
    </div>
  );
}
