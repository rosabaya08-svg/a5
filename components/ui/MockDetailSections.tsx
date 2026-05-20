import type { DetailSection } from "@/types/mockUi";

type MockDetailSectionsProps = {
  sections: DetailSection[];
};

export function MockDetailSections({ sections }: MockDetailSectionsProps) {
  return (
    <div className="grid gap-4">
      {sections.map((section) => (
        <section key={section.id} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-950">{section.title}</h3>
            {section.description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">{section.description}</p>
            ) : null}
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.fields.map((field) => (
              <div key={field.label} className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{field.label}</dt>
                <dd className="mt-1 text-sm font-black text-slate-950">{field.value}</dd>
                {field.helper ? <p className="mt-1 text-xs leading-5 text-slate-500">{field.helper}</p> : null}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

