"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { ThemeModeToggle } from "@/components/firebase/ThemeModeToggle";
import { getFirebaseRuntimeStatus } from "@/lib/firebase/client";
import {
  createCmsId,
  saveCmsRecord,
  subscribeCmsRecords,
  uploadCmsFile,
  type CmsCollectionName,
  type CmsRecord,
} from "@/lib/firebase/contentRepository";

type CmsMode = "admin" | "company" | "nursery" | "tablet";
type CmsTab = "banners" | "videos" | "detail" | "theme" | "exposure";

type FormState = {
  id: string;
  title: string;
  placement: string;
  target: string;
  link: string;
  status: string;
  body: string;
  startsAt: string;
  endsAt: string;
  order: string;
  productId: string;
  themeMode: string;
};

const tabs: Array<{
  id: CmsTab;
  label: string;
  collection: CmsCollectionName;
  prefix: string;
  helper: string;
}> = [
  {
    id: "banners",
    label: "Banner",
    collection: "banner_campaigns",
    prefix: "banner",
    helper: "Main hero, popup, tablet banner, brand strip exposure.",
  },
  {
    id: "videos",
    label: "Video",
    collection: "ad_video_campaigns",
    prefix: "video",
    helper: "Video ad slot, poster, schedule, target and approval status.",
  },
  {
    id: "detail",
    label: "Detail",
    collection: "product_detail_pages",
    prefix: "detail",
    helper: "Company product detail draft with live desktop/tablet/mobile preview data.",
  },
  {
    id: "theme",
    label: "Theme",
    collection: "theme_configs",
    prefix: "theme",
    helper: "Dark, white and system mode token selection.",
  },
  {
    id: "exposure",
    label: "Exposure",
    collection: "content_targets",
    prefix: "target",
    helper: "Nursery, room, tablet and QR audience targeting rules.",
  },
];

const emptyForm: FormState = {
  id: "",
  title: "",
  placement: "shopping_home_top",
  target: "all_nurseries",
  link: "/tablet/products",
  status: "draft",
  body: "",
  startsAt: "",
  endsAt: "",
  order: "1",
  productId: "",
  themeMode: "light",
};

function valueOf(record: CmsRecord, key: string) {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function FirebaseCmsManager({
  mode,
  defaultTab = "banners",
  compact = false,
}: {
  mode: CmsMode;
  defaultTab?: CmsTab;
  compact?: boolean;
}) {
  const runtime = useMemo(() => getFirebaseRuntimeStatus(), []);
  const [activeTab, setActiveTab] = useState<CmsTab>(defaultTab);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<Record<CmsCollectionName, CmsRecord[]>>({
    banner_campaigns: [],
    ad_video_campaigns: [],
    product_detail_pages: [],
    theme_configs: [],
    content_targets: [],
    media_assets: [],
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  useEffect(() => {
    if (!runtime.configured) {
      return;
    }

    const unsubscribers = tabs.map((tab) =>
      subscribeCmsRecords(
        tab.collection,
        (next) => setRecords((current) => ({ ...current, [tab.collection]: next })),
        setMessage,
      ),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [runtime.configured]);

  function updateForm(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editRecord(record: CmsRecord) {
    setForm({
      id: record.id,
      title: valueOf(record, "title"),
      placement: valueOf(record, "placement") || valueOf(record, "scope_type") || emptyForm.placement,
      target: valueOf(record, "target") || valueOf(record, "scope_id") || emptyForm.target,
      link: valueOf(record, "click_target") || valueOf(record, "preview_path") || emptyForm.link,
      status: valueOf(record, "approval_status") || valueOf(record, "status") || emptyForm.status,
      body: valueOf(record, "body") || valueOf(record, "description"),
      startsAt: valueOf(record, "starts_at"),
      endsAt: valueOf(record, "ends_at"),
      order: valueOf(record, "display_order") || emptyForm.order,
      productId: valueOf(record, "product_id"),
      themeMode: valueOf(record, "mode") || emptyForm.themeMode,
    });
    setActiveTab(activeTab);
    setMessage(`Editing ${record.id}`);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!runtime.configured) {
      setMessage(`Missing Firebase env: ${runtime.missing.join(", ")}`);
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const id = form.id || createCmsId(active.prefix);
      const payload: CmsRecord = {
        id,
        title: form.title || `${active.label} draft`,
        placement: form.placement,
        target: form.target,
        click_target: form.link,
        approval_status: form.status,
        status: form.status,
        body: form.body,
        starts_at: form.startsAt,
        ends_at: form.endsAt,
        display_order: Number(form.order) || 1,
        product_id: form.productId,
        mode: form.themeMode,
        scope_type: mode,
        scope_id: form.target,
        source_app: mode,
      };

      await saveCmsRecord(active.collection, payload);

      if (file) {
        const uploaded = await uploadCmsFile(active.collection, id, file);
        await saveCmsRecord(active.collection, {
          id,
          asset_url: uploaded.url,
          asset_path: uploaded.path,
          asset_type: uploaded.assetType,
        });
        await saveCmsRecord("media_assets", {
          id: `asset-${id}`,
          title: file.name,
          asset_type: uploaded.assetType,
          asset_url: uploaded.url,
          asset_path: uploaded.path,
          source_collection: active.collection,
          source_record_id: id,
          owner_type: mode,
          status: "uploaded",
        });
      }

      setForm(emptyForm);
      setFile(null);
      setMessage(`Saved ${id} to ${active.collection}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Firebase save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(record: CmsRecord, status: string) {
    try {
      await saveCmsRecord(active.collection, {
        id: record.id,
        approval_status: status,
        status,
        source_app: mode,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Status update failed.");
    }
  }

  return (
    <section className="my-5 rounded-md border border-slate-200 bg-white p-4 text-slate-950 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Firebase live CMS</p>
          <h2 className="mt-1 text-2xl font-black">a5-closed-mall content control</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Firestore CMS records can be reviewed in beta, but Firebase Storage upload is blocked in this phase.
            Use mock placeholders until a separate Storage approval is recorded.
          </p>
        </div>
        <ThemeModeToggle />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Project</p>
          <p className="mt-1 font-black">{runtime.projectId}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Storage</p>
          <p className="mt-1 break-all text-sm font-bold">{runtime.storageBucket}</p>
        </div>
        <div className={`rounded-md p-3 ${runtime.configured ? "bg-emerald-50" : "bg-amber-50"}`}>
          <p className="text-xs font-bold uppercase text-slate-500">Connection</p>
          <p className="mt-1 font-black">{runtime.configured ? "Ready" : "Env required"}</p>
        </div>
      </div>

      {!runtime.configured ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Add Firebase web app values to `.env.local`: {runtime.missing.join(", ")}. The code is ready but live writes are
          disabled until those values exist.
        </div>
      ) : null}

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-black ${
              activeTab === tab.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{active.helper}</p>

      <div className={`mt-4 grid gap-4 ${compact ? "" : "lg:grid-cols-[0.9fr_1.1fr]"}`}>
        <form onSubmit={submitForm} className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-bold">
              Title
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2"
                placeholder="Campaign or detail title"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold">
                Placement
                <input
                  value={form.placement}
                  onChange={(event) => updateForm("placement", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                Target
                <input
                  value={form.target}
                  onChange={(event) => updateForm("target", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold">
                Link / preview path
                <input
                  value={form.link}
                  onChange={(event) => updateForm("link", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                Status
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                >
                  {["draft", "pending_approval", "approved", "scheduled", "live", "paused", "rejected"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-sm font-bold">
                Start
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => updateForm("startsAt", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                End
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => updateForm("endsAt", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                Order
                <input
                  value={form.order}
                  onChange={(event) => updateForm("order", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold">
                Product ID
                <input
                  value={form.productId}
                  onChange={(event) => updateForm("productId", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                  placeholder="product-care-kit"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                Theme mode
                <select
                  value={form.themeMode}
                  onChange={(event) => updateForm("themeMode", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                >
                  {["light", "dark", "system"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm font-bold">
              Body / JSON note
              <textarea
                value={form.body}
                onChange={(event) => updateForm("body", event.target.value)}
                className="min-h-24 rounded-md border border-slate-200 px-3 py-2"
                placeholder="Detail blocks, campaign note, rejection reason or targeting policy."
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Image / video file
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={saving || !runtime.configured}
                className="rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? "Saving..." : form.id ? "Update Firebase" : "Create Firebase"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setFile(null);
                }}
                className="rounded-md bg-white px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200"
              >
                Reset
              </button>
            </div>
          </div>
        </form>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">Live records</p>
              <h3 className="text-lg font-black">{active.collection}</h3>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
              {records[active.collection].length}
            </span>
          </div>
          {message ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">{message}</p> : null}
          <div className="mt-3 grid gap-3">
            {records[active.collection].length === 0 ? (
              <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                No live Firestore documents yet. Create one from the form after `.env.local` is configured.
              </div>
            ) : (
              records[active.collection].map((record) => (
                <article key={record.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400">{record.id}</p>
                      <h4 className="mt-1 font-black">{valueOf(record, "title") || "Untitled"}</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {valueOf(record, "placement") || valueOf(record, "scope_type")} /{" "}
                        {valueOf(record, "target") || valueOf(record, "scope_id")}
                      </p>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
                      {valueOf(record, "approval_status") || valueOf(record, "status") || "draft"}
                    </span>
                  </div>
                  {typeof record.asset_url === "string" ? (
                    record.asset_type === "video" ? (
                      <video src={record.asset_url} className="mt-3 aspect-video w-full rounded-md bg-slate-950" controls />
                    ) : (
                      <img src={record.asset_url} alt="" className="mt-3 aspect-video w-full rounded-md object-cover" />
                    )
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editRecord(record)}
                      className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700"
                    >
                      Edit
                    </button>
                    {["approved", "scheduled", "paused", "rejected"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => quickStatus(record, status)}
                        disabled={!runtime.configured}
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200 disabled:opacity-50"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
