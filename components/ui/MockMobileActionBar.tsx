type MockMobileActionBarProps = {
  primaryLabel: string;
  secondaryLabel?: string;
  helper: string;
};

export function MockMobileActionBar({ primaryLabel, secondaryLabel, helper }: MockMobileActionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:static md:mx-0 md:rounded-md md:border md:shadow-sm">
      <p className="mb-2 text-xs font-semibold text-slate-500">{helper}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {secondaryLabel ? (
          <button
            className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-950"
            type="button"
          >
            {secondaryLabel}
          </button>
        ) : null}
        <button className="rounded-md bg-red-600 px-4 py-3 text-sm font-black text-white" type="button">
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}

