type FilterBarProps = {
  title: string;
  filters: string[];
};

export function FilterBar({ title, filters }: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <span
            key={filter}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
          >
            {filter}
          </span>
        ))}
      </div>
    </div>
  );
}
