"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { publishStorefrontSnapshot, saveCmsRecord, uploadCmsFile } from "@/lib/firebase/contentRepository";
import { readPortalSession } from "@/lib/auth/session";
import { brandIdForProductBrand, brandNameKey, productBrandName } from "@/lib/storefront/brandRouting";
import { formatCurrency } from "@/lib/utils/format";
import type { Product } from "@/types/commerce";

type BrandOption = {
  name: string;
  routeId: string;
  productCount: number;
};

type BrandSectionDraft = {
  id: string;
  type: "hero" | "intro" | "product_grid" | "event" | "notice" | "cta";
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  productIds: string[];
  layout?: string;
  enabled: boolean;
};

const defaultMessage = "\uD3D0\uC1C4\uBAB0 \uBE0C\uB79C\uB4DC \uD61C\uD0DD\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.";

function inputClass() {
  return "w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
}

function brandOptionsForProducts(products: Product[]): BrandOption[] {
  const byBrand = new Map<string, Product[]>();

  for (const product of products) {
    const brandName = productBrandName(product);
    if (!brandName.trim()) continue;
    const key = brandNameKey(brandName);
    const current = byBrand.get(key) ?? [];
    current.push(product);
    byBrand.set(key, current);
  }

  return [...byBrand.values()]
    .map((items) => {
      const first = items[0];
      const name = productBrandName(first);
      return {
        name,
        routeId: brandIdForProductBrand(name, first.companyId),
        productCount: items.length,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));
}

function productsForBrand(products: Product[], brandName: string) {
  const key = brandNameKey(brandName);
  return products.filter((product) => brandNameKey(productBrandName(product)) === key);
}

function newSection(type: BrandSectionDraft["type"], brandName: string, productIds: string[] = []): BrandSectionDraft {
  const id = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  if (type === "product_grid") {
    return { id, type, title: "\uB300\uD45C\uC0C1\uD488", body: "\uBE0C\uB79C\uB4DC\uAD00\uC5D0 \uBCF4\uC5EC\uC904 \uC0C1\uD488\uC744 \uC120\uD0DD\uD569\uB2C8\uB2E4.", productIds, layout: "grid", enabled: true };
  }
  if (type === "event") {
    return { id, type, title: "\uBE0C\uB79C\uB4DC \uC774\uBCA4\uD2B8", body: "\uC774\uBCA4\uD2B8\uB098 \uD55C\uC815 \uD61C\uD0DD\uC744 \uC785\uB825\uD569\uB2C8\uB2E4.", ctaLabel: "\uC0C1\uD488 \uBCF4\uAE30", ctaHref: "", productIds: [], layout: "highlight", enabled: true };
  }
  if (type === "notice") {
    return { id, type, title: "\uC548\uB0B4\uC0AC\uD56D", body: "\uBC30\uC1A1, \uAD50\uD658, \uC8FC\uC758\uC0AC\uD56D\uC744 \uC785\uB825\uD569\uB2C8\uB2E4.", productIds: [], layout: "card", enabled: true };
  }
  if (type === "cta") {
    return { id, type, title: "\uC5F0\uACB0 \uBC84\uD2BC", body: "\uBC84\uD2BC \uBB38\uAD6C\uC640 \uC5F0\uACB0 \uC8FC\uC18C\uB97C \uC785\uB825\uD569\uB2C8\uB2E4.", ctaLabel: "\uC804\uCCB4 \uBCF4\uAE30", ctaHref: "", productIds: [], layout: "button", enabled: true };
  }
  if (type === "hero") {
    return { id, type, title: brandName || "\uBE0C\uB79C\uB4DC\uAD00", body: defaultMessage, ctaLabel: "\uC0C1\uD488 \uBCF4\uAE30", ctaHref: "", productIds: [], layout: "wide", enabled: true };
  }

  return { id, type, title: "\uBE0C\uB79C\uB4DC \uC18C\uAC1C", body: "\uBE0C\uB79C\uB4DC \uC774\uC57C\uAE30\uB97C \uC785\uB825\uD569\uB2C8\uB2E4.", productIds: [], layout: "text", enabled: true };
}

function defaultSections(brandName: string, products: Product[]): BrandSectionDraft[] {
  return [
    newSection("hero", brandName),
    newSection("intro", brandName),
    newSection("product_grid", brandName, products.slice(0, 4).map((product) => product.id)),
  ];
}

function sectionsForSave(sections: BrandSectionDraft[]) {
  return sections
    .filter((section) => section.enabled)
    .map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title.trim(),
      body: section.body.trim(),
      ctaLabel: section.ctaLabel?.trim() ?? "",
      ctaHref: section.ctaHref?.trim() ?? "",
      productIds: section.productIds,
      layout: section.layout,
    }));
}

function selectedProductIds(sections: ReturnType<typeof sectionsForSave>) {
  return [...new Set(sections.flatMap((section) => section.productIds ?? []))];
}

function sectionTypeLabel(type: BrandSectionDraft["type"]) {
  const labels: Record<BrandSectionDraft["type"], string> = {
    hero: "\uC0C1\uB2E8 \uC601\uC5ED",
    intro: "\uC18C\uAC1C",
    product_grid: "\uB300\uD45C\uC0C1\uD488",
    event: "\uC774\uBCA4\uD2B8",
    notice: "\uC548\uB0B4",
    cta: "\uBC84\uD2BC",
  };
  return labels[type];
}

function imagePreview(url: string, label: string) {
  if (!url) {
    return <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm font-normal text-slate-400">{label}</div>;
  }

  return <img src={url} alt={label} className="h-full min-h-32 w-full rounded-md object-cover" />;
}

export function CompanyBrandPageEditor({ companyId, products }: { companyId: string; products: Product[] }) {
  const session = typeof window === "undefined" ? null : readPortalSession("company");
  const effectiveCompanyId = session?.companyId || companyId;
  const brandOptions = useMemo(() => brandOptionsForProducts(products), [products]);
  const initialBrand = brandOptions[0]?.name ?? "";
  const initialBrandProducts = productsForBrand(products, initialBrand);
  const initialSections = defaultSections(initialBrand, initialBrandProducts);
  const [selectedBrandValue, setSelectedBrandValue] = useState(initialBrand);
  const [title, setTitle] = useState(initialBrand || "\uBE0C\uB79C\uB4DC\uAD00");
  const [subtitle, setSubtitle] = useState(defaultMessage);
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [sections, setSections] = useState<BrandSectionDraft[]>(initialSections);
  const [activeSectionId, setActiveSectionId] = useState(initialSections[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const selectedProducts = useMemo(() => productsForBrand(products, selectedBrandValue), [products, selectedBrandValue]);
  const routeId = brandIdForProductBrand(selectedBrandValue, effectiveCompanyId);
  const savedSections = useMemo(() => sectionsForSave(sections), [sections]);
  const previewProductIds = selectedProductIds(savedSections);
  const previewProducts = previewProductIds.length
    ? previewProductIds.map((id) => selectedProducts.find((product) => product.id === id)).filter((product): product is Product => Boolean(product))
    : selectedProducts.slice(0, 4);
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];

  function selectBrand(nextBrand: string) {
    const nextProducts = productsForBrand(products, nextBrand);
    const nextSections = defaultSections(nextBrand, nextProducts);
    setSelectedBrandValue(nextBrand);
    setTitle(nextBrand || "\uBE0C\uB79C\uB4DC\uAD00");
    setSections(nextSections);
    setActiveSectionId(nextSections[0]?.id ?? "");
  }

  function addSection(type: BrandSectionDraft["type"]) {
    const section = newSection(type, selectedBrandValue, type === "product_grid" ? selectedProducts.slice(0, 4).map((product) => product.id) : []);
    setSections((current) => [...current, section]);
    setActiveSectionId(section.id);
  }

  function updateSection(sectionId: string, patch: Partial<BrandSectionDraft>) {
    setSections((current) => current.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)));
  }

  function toggleProduct(sectionId: string, productId: string) {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        const productIds = new Set(section.productIds);
        if (productIds.has(productId)) productIds.delete(productId);
        else productIds.add(productId);
        return { ...section, productIds: [...productIds] };
      }),
    );
  }

  async function uploadIfNeeded(file: File | null, purpose: string, currentUrl: string) {
    if (!file) return { url: currentUrl, path: "" };
    return uploadCmsFile("company_brand_pages", `${effectiveCompanyId}-${purpose}-${Date.now().toString(36)}`, file, { companyId: effectiveCompanyId });
  }

  async function saveBrandPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBrandValue.trim()) {
      setStatusMessage("\uBE0C\uB79C\uB4DC\uB97C \uBA3C\uC800 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
      return;
    }

    setSaving(true);
    setStatusMessage("\uBE0C\uB79C\uB4DC\uAD00\uC744 \uC800\uC7A5\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.");

    try {
      const recordId = `${effectiveCompanyId}__${brandNameKey(selectedBrandValue)}`;
      const logo = await uploadIfNeeded(logoFile, "logo", logoUrl);
      const banner = await uploadIfNeeded(bannerFile, "banner", bannerImageUrl);
      const sectionsPayload = sectionsForSave(sections);
      const productIds = selectedProductIds(sectionsPayload);
      const hero = sectionsPayload.find((section) => section.type === "hero");
      const eventSection = sectionsPayload.find((section) => section.type === "event");

      await saveCmsRecord("company_brand_pages", {
        id: recordId,
        brand_id: routeId,
        brand_name: selectedBrandValue,
        company_id: effectiveCompanyId,
        title: title.trim() || selectedBrandValue,
        subtitle: subtitle.trim(),
        logo_url: logo.url,
        logo_asset_path: logo.path,
        asset_url: banner.url,
        asset_path: banner.path,
        asset_type: "brand_page",
        template: "basic",
        status: "live",
        sections: sectionsPayload,
        notice_cards: sectionsPayload
          .filter((section) => section.type === "notice" || section.type === "event")
          .map((section) => ({ title: section.title, body: section.body })),
        event_title: eventSection?.title ?? "",
        event_body: eventSection?.body ?? "",
        event_cta_label: eventSection?.ctaLabel ?? "",
        event_cta_href: eventSection?.ctaHref ?? "",
        published_snapshot: {
          title: hero?.title || title.trim() || selectedBrandValue,
          subtitle: hero?.body || subtitle.trim(),
          sections: sectionsPayload,
          productIds,
          publishedAt: new Date().toISOString(),
        },
        version: Date.now(),
        product_ids: productIds,
        product_count: selectedProducts.length,
        source_app: "company",
        source_channel: "company_brand_page_editor",
      });

      await publishStorefrontSnapshot("company-brand-page-save");
      setLogoUrl(logo.url);
      setBannerImageUrl(banner.url);
      setLogoFile(null);
      setBannerFile(null);
      setStatusMessage("\uBE0C\uB79C\uB4DC\uAD00 \uC800\uC7A5\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "\uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setSaving(false);
    }
  }

  if (!brandOptions.length) {
    return <section className="rounded-md border border-slate-200 bg-white p-6 text-sm font-normal text-slate-600 shadow-sm">{"\uC0C1\uD488\uC744 \uBA3C\uC800 \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694."}</section>;
  }

  return (
    <form onSubmit={saveBrandPage} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">{"\uBE0C\uB79C\uB4DC\uAD00"}</p>
            <h2 className="mt-1 text-xl font-normal text-slate-950">{"\uBE0C\uB79C\uB4DC\uAD00 \uAFB8\uBBF8\uAE30"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{"\uB85C\uACE0, \uBC30\uB108, \uB300\uD45C\uC0C1\uD488, \uBE0C\uB79C\uB4DC \uC18C\uAC1C\uB97C \uAD00\uB9AC\uD569\uB2C8\uB2E4."}</p>
          </div>
          <button type="submit" disabled={saving} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white disabled:opacity-50">
            {saving ? "\uC800\uC7A5 \uC911" : "\uC800\uC7A5"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            {"\uBE0C\uB79C\uB4DC"}
            <select value={selectedBrandValue} onChange={(event) => selectBrand(event.target.value)} className={inputClass()}>
              {brandOptions.map((option) => (
                <option key={option.routeId} value={option.name}>{`${option.name} (${option.productCount})`}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            {"\uC81C\uBAA9"}
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass()} />
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800 md:col-span-2">
            {"\uC124\uBA85 \uBB38\uAD6C"}
            <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className={inputClass()} />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            {"\uB85C\uACE0 \uC774\uBBF8\uC9C0"}
            <input type="file" accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => setLogoFile(event.target.files?.[0] ?? null)} className={inputClass()} />
          </label>
          <label className="grid gap-2 text-sm font-normal text-slate-800">
            {"\uBC30\uB108 \uC774\uBBF8\uC9C0"}
            <input type="file" accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => setBannerFile(event.target.files?.[0] ?? null)} className={inputClass()} />
          </label>
        </div>

        <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-normal text-slate-950">{"\uD654\uBA74 \uAD6C\uC131"}</h3>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <button key={section.id} type="button" onClick={() => setActiveSectionId(section.id)} className={`rounded-md border px-3 py-2 text-sm font-normal ${activeSection?.id === section.id ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-600"}`}>
                {section.title || section.type}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["hero", "intro", "product_grid", "event", "notice", "cta"] as BrandSectionDraft["type"][]).map((type) => (
              <button key={type} type="button" onClick={() => addSection(type)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-normal text-slate-600">
                {sectionTypeLabel(type)} {"\uCD94\uAC00"}
              </button>
            ))}
          </div>

          {activeSection ? (
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm font-normal text-slate-800">
                <input type="checkbox" checked={activeSection.enabled} onChange={(event) => updateSection(activeSection.id, { enabled: event.target.checked })} />
                {"\uD654\uBA74\uC5D0 \uD45C\uC2DC"}
              </label>
              <label className="grid gap-2 text-sm font-normal text-slate-800">
                {"\uC601\uC5ED \uC81C\uBAA9"}
                <input value={activeSection.title} onChange={(event) => updateSection(activeSection.id, { title: event.target.value })} className={inputClass()} />
              </label>
              <label className="grid gap-2 text-sm font-normal text-slate-800">
                {"\uC601\uC5ED \uB0B4\uC6A9"}
                <textarea value={activeSection.body} onChange={(event) => updateSection(activeSection.id, { body: event.target.value })} className={`${inputClass()} min-h-28`} />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={activeSection.ctaLabel ?? ""} onChange={(event) => updateSection(activeSection.id, { ctaLabel: event.target.value })} className={inputClass()} placeholder="\uBC84\uD2BC \uBB38\uAD6C" />
                <input value={activeSection.ctaHref ?? ""} onChange={(event) => updateSection(activeSection.id, { ctaHref: event.target.value })} className={inputClass()} placeholder="\uC5F0\uACB0 \uC8FC\uC18C" />
              </div>
              {activeSection.type === "product_grid" ? (
                <div className="max-h-56 overflow-auto rounded-md border border-slate-200 bg-white">
                  {selectedProducts.map((product) => (
                    <label key={product.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm font-normal text-slate-700 last:border-b-0">
                      <span>{product.name}<span className="ml-2 text-xs text-slate-400">{formatCurrency(product.price)}</span></span>
                      <input type="checkbox" checked={activeSection.productIds.includes(product.id)} onChange={() => toggleProduct(activeSection.id, product.id)} />
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {statusMessage ? <p className="rounded-md bg-slate-50 p-3 text-sm font-normal text-slate-700">{statusMessage}</p> : null}
      </section>

      <aside className="grid gap-4 self-start rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">{"\uBBF8\uB9AC\uBCF4\uAE30"}</p>
          <h3 className="mt-1 text-lg font-normal text-slate-950">{"\uD3D0\uC1C4\uBAB0 \uBE0C\uB79C\uB4DC\uAD00"}</h3>
        </div>
        <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-950 text-white">
          <div className="h-40">{imagePreview(bannerFile ? URL.createObjectURL(bannerFile) : bannerImageUrl, "\uBC30\uB108 \uC774\uBBF8\uC9C0")}</div>
          <div className="grid gap-3 p-4">
            <p className="text-lg font-normal">{title || selectedBrandValue}</p>
            <p className="text-sm font-normal text-white/70">{subtitle}</p>
          </div>
        </div>
        <div className="grid gap-2 rounded-md border border-slate-200 p-3">
          <p className="text-sm font-normal text-slate-700">{"\uB300\uD45C\uC0C1\uD488"}</p>
          {previewProducts.length ? previewProducts.slice(0, 4).map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm font-normal last:border-b-0">
              <span className="truncate text-slate-800">{product.name}</span>
              <span className="shrink-0 text-slate-500">{formatCurrency(product.price)}</span>
            </div>
          )) : <p className="text-sm font-normal text-slate-500">{"\uC120\uD0DD\uB41C \uB300\uD45C\uC0C1\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>}
        </div>
      </aside>
    </form>
  );
}
