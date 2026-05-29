"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { getFirebaseRuntimeStatus } from "@/lib/firebase/client";
import {
  saveCmsRecord,
  subscribeCmsRecords,
  uploadCmsFile,
  type CmsRecord,
} from "@/lib/firebase/contentRepository";
import {
  mallBrands,
  mallHeroBanner,
  mallPromoBanners,
  type MallBanner,
} from "@/data/mockShopContent";
import {
  optimizeUploadAsset,
  type OptimizedUploadAsset,
} from "@/lib/media/optimizeUploadAsset";

type EditableSlotKind = "hero" | "promo";

type EditableSlot = {
  id: string;
  recordId: string;
  kind: EditableSlotKind;
  label: string;
  placement: string;
  displayOrder: number;
  fallback: MallBanner;
};

type SlotDraft = {
  title: string;
  eyebrow: string;
  subtitle: string;
  href: string;
  status: string;
};

const CONFIG_ID = "storefront-home";

const editableSlots: EditableSlot[] = [
  {
    id: "hero-hansan-sanho",
    recordId: "home-hero-hansan-sanho",
    kind: "hero",
    label: "메인 배너",
    placement: "tablet_home_hero",
    displayOrder: 1,
    fallback: mallHeroBanner,
  },
  ...mallPromoBanners.map((banner, index) => ({
    id: banner.id,
    recordId: `home-${banner.id}`,
    kind: "promo" as const,
    label: `하단 배너 ${index + 1}`,
    placement: "tablet_home_promo",
    displayOrder: index + 2,
    fallback: banner,
  })),
];

function recordText(record: CmsRecord | undefined, key: string, fallback = "") {
  const value = record?.[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

function recordNumber(record: CmsRecord | undefined, key: string, fallback: number) {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toLocaleString("ko-KR", {
    maximumFractionDigits: index === 0 ? 0 : 1,
  })}${units[index]}`;
}

function bannerFromRecord(slot: EditableSlot, record?: CmsRecord): MallBanner {
  return {
    ...slot.fallback,
    title: recordText(record, "title", slot.fallback.title),
    eyebrow: recordText(record, "eyebrow", slot.fallback.eyebrow),
    subtitle: recordText(record, "subtitle", slot.fallback.subtitle),
    href: recordText(record, "href", recordText(record, "click_target", slot.fallback.href)),
    imageUrl: recordText(record, "asset_url", slot.fallback.imageUrl),
  };
}

function draftFromBanner(banner: MallBanner, status = "live"): SlotDraft {
  return {
    title: banner.title,
    eyebrow: banner.eyebrow,
    subtitle: banner.subtitle,
    href: banner.href,
    status,
  };
}

function activeRecordForSlot(records: CmsRecord[], slot: EditableSlot) {
  return records.find((record) => record.id === slot.recordId || recordText(record, "slot_id") === slot.id);
}

function AdminSlotImage({ banner, selected }: { banner: MallBanner; selected: boolean }) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-md bg-slate-950 ${
        selected ? "ring-4 ring-blue-500 ring-offset-2" : "ring-1 ring-slate-200"
      }`}
    >
      <img
        src={banner.imageUrl}
        alt={banner.title}
        className="h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.style.opacity = "0";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 text-white">
        <p className="text-xs font-black text-rose-200">{banner.eyebrow}</p>
        <p className="mt-1 text-xl font-black leading-tight">{banner.title}</p>
      </div>
    </div>
  );
}

export function AdminStorefrontHomeVisualEditor() {
  const runtime = useMemo(() => getFirebaseRuntimeStatus(), []);
  const [homeSections, setHomeSections] = useState<CmsRecord[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState(editableSlots[0].id);
  const [draftBySlot, setDraftBySlot] = useState<Record<string, SlotDraft>>({});
  const [file, setFile] = useState<File | null>(null);
  const [optimizedAsset, setOptimizedAsset] = useState<OptimizedUploadAsset | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [brandCount, setBrandCount] = useState(Math.min(8, mallBrands.length));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const selectedSlot = useMemo(
    () => editableSlots.find((slot) => slot.id === selectedSlotId) ?? editableSlots[0],
    [selectedSlotId],
  );
  const selectedRecord = useMemo(() => activeRecordForSlot(homeSections, selectedSlot), [homeSections, selectedSlot]);
  const selectedBanner = useMemo(() => bannerFromRecord(selectedSlot, selectedRecord), [selectedRecord, selectedSlot]);
  const selectedDefaultDraft = useMemo(
    () => draftFromBanner(selectedBanner, recordText(selectedRecord, "status", "live")),
    [selectedBanner, selectedRecord],
  );
  const draft = draftBySlot[selectedSlot.id] ?? selectedDefaultDraft;
  const uploadedFile = optimizedAsset?.file ?? file;

  const renderedBanners = editableSlots.map((slot) => {
    const savedBanner = bannerFromRecord(slot, activeRecordForSlot(homeSections, slot));
    const localDraft = draftBySlot[slot.id];
    const previewImage = slot.id === selectedSlotId && optimizedAsset?.previewUrl ? optimizedAsset.previewUrl : savedBanner.imageUrl;

    return {
      slot,
      banner: {
        ...savedBanner,
        ...(localDraft
          ? {
              title: localDraft.title,
              eyebrow: localDraft.eyebrow,
              subtitle: localDraft.subtitle,
              href: localDraft.href,
            }
          : {}),
        imageUrl: previewImage,
      },
    };
  });

  const hero = renderedBanners[0];
  const promos = renderedBanners.slice(1);
  const officialBrands = mallBrands.slice(0, brandCount);

  useEffect(() => {
    if (!runtime.configured) {
      return;
    }

    const unsubscribeHome = subscribeCmsRecords("home_sections", setHomeSections, setMessage);
    const unsubscribeConfig = subscribeCmsRecords(
      "tablet_home_configs",
      (records) => {
        const config = records.find((record) => record.id === CONFIG_ID);
        if (config) {
          setBrandCount(Math.max(1, Math.min(mallBrands.length, recordNumber(config, "official_brand_count", Math.min(8, mallBrands.length)))));
        }
      },
      setMessage,
    );

    return () => {
      unsubscribeHome();
      unsubscribeConfig();
    };
  }, [runtime.configured]);

  function clearSelectedUpload() {
    setFile(null);
    setOptimizedAsset((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    setFileInputKey((current) => current + 1);
  }

  function selectSlot(slotId: string) {
    setSelectedSlotId(slotId);
    clearSelectedUpload();
  }

  useEffect(() => {
    return () => {
      if (optimizedAsset?.previewUrl) URL.revokeObjectURL(optimizedAsset.previewUrl);
    };
  }, [optimizedAsset?.previewUrl]);

  function updateDraft(key: keyof SlotDraft, value: string) {
    setDraftBySlot((current) => ({
      ...current,
      [selectedSlot.id]: {
        ...draft,
        [key]: value,
      },
    }));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setOptimizedAsset(null);
    setMessage("");

    if (!selectedFile) return;

    setOptimizing(true);
    try {
      const optimized = await optimizeUploadAsset(selectedFile, "image");
      setFile(optimized.file);
      setOptimizedAsset(optimized);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 최적화에 실패했습니다.");
      setFile(selectedFile);
    } finally {
      setOptimizing(false);
    }
  }

  async function saveBrandCount(nextCount = brandCount) {
    if (!runtime.configured) {
      setMessage("Firebase 설정값이 없어 저장할 수 없습니다.");
      return;
    }

    await saveCmsRecord("tablet_home_configs", {
      id: CONFIG_ID,
      official_brand_count: Math.max(1, Math.min(mallBrands.length, nextCount)),
      source_app: "admin",
      status: "live",
    });
  }

  async function saveSlotRecord(slot: EditableSlot, slotDraft: SlotDraft, assetPatch: Partial<CmsRecord> = {}) {
    const currentRecord = activeRecordForSlot(homeSections, slot);

    await saveCmsRecord("home_sections", {
      id: slot.recordId,
      section_type: slot.kind === "hero" ? "hero_banner" : "promo_banner",
      slot_id: slot.id,
      source_banner_id: slot.fallback.id,
      placement: slot.placement,
      title: slotDraft.title,
      eyebrow: slotDraft.eyebrow,
      subtitle: slotDraft.subtitle,
      href: slotDraft.href,
      click_target: slotDraft.href,
      display_order: slot.displayOrder,
      asset_url: recordText(currentRecord, "asset_url", slot.fallback.imageUrl),
      asset_type: recordText(currentRecord, "asset_type", "image"),
      status: slotDraft.status,
      approval_status: slotDraft.status,
      source_app: "admin",
      ...assetPatch,
    });
  }

  async function saveMediaAsset(slot: EditableSlot, title: string, assetUrl: string, assetPatch: Partial<CmsRecord> = {}) {
    if (!assetUrl) return;

    await saveCmsRecord("media_assets", {
      id: `asset-${slot.recordId}`,
      title,
      source_collection: "home_sections",
      source_record_id: slot.recordId,
      asset_type: "image",
      asset_url: assetUrl,
      owner_type: "admin",
      status: "uploaded",
      source_app: "admin",
      ...assetPatch,
    });
  }

  async function registerVisibleBanners() {
    if (!runtime.configured) {
      setMessage("Firebase 설정값이 없어 저장할 수 없습니다.");
      return;
    }

    setBulkSaving(true);
    setMessage("");

    try {
      for (const { slot, banner } of renderedBanners) {
        const slotDraft = draftBySlot[slot.id] ?? draftFromBanner(banner, recordText(activeRecordForSlot(homeSections, slot), "status", "live"));
        await saveSlotRecord(slot, slotDraft, {
          asset_url: banner.imageUrl,
          asset_type: "image",
        });
        await saveMediaAsset(slot, slotDraft.title, banner.imageUrl, {
          external_url: banner.imageUrl,
        });
      }

      await saveBrandCount();
      setMessage("현재 좌측 미리보기의 배너 슬롯을 실제 홈 배너로 등록했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "배너 일괄 등록에 실패했습니다.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function applySelectedSlot() {
    if (!runtime.configured) {
      setMessage("Firebase 설정값이 없어 저장할 수 없습니다.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let uploadedPatch: Partial<CmsRecord> = {};

      if (uploadedFile) {
        const uploaded = await uploadCmsFile("home_sections", selectedSlot.recordId, uploadedFile, {
          productId: selectedSlot.recordId,
        });

        uploadedPatch = {
          asset_url: uploaded.url,
          asset_path: uploaded.path,
          asset_type: uploaded.assetType,
          asset_original_name: optimizedAsset?.original.name ?? uploadedFile.name,
          asset_original_size: optimizedAsset?.original.size ?? uploadedFile.size,
          asset_optimized_name: optimizedAsset?.optimized.name ?? uploadedFile.name,
          asset_optimized_size: optimizedAsset?.optimized.size ?? uploadedFile.size,
          asset_width: optimizedAsset?.optimized.width,
          asset_height: optimizedAsset?.optimized.height,
          asset_reduction_ratio: optimizedAsset?.reductionRatio ?? 0,
        };

        await saveMediaAsset(selectedSlot, uploadedFile.name, uploaded.url, {
          asset_type: uploaded.assetType,
          asset_path: uploaded.path,
          original_name: optimizedAsset?.original.name ?? uploadedFile.name,
          original_size: optimizedAsset?.original.size ?? uploadedFile.size,
          optimized_size: optimizedAsset?.optimized.size ?? uploadedFile.size,
          width: optimizedAsset?.optimized.width,
          height: optimizedAsset?.optimized.height,
          reduction_ratio: optimizedAsset?.reductionRatio ?? 0,
        });
      }

      const persistedImageUrl = recordText(selectedRecord, "asset_url", selectedSlot.fallback.imageUrl);
      await saveSlotRecord(selectedSlot, draft, uploadedPatch);
      await saveMediaAsset(selectedSlot, draft.title, recordText(uploadedPatch as CmsRecord, "asset_url", persistedImageUrl), uploadedPatch);
      await saveBrandCount();
      setMessage(`${selectedSlot.label} 배너를 실제 홈 배너로 등록하고 적용했습니다.`);
      clearSelectedUpload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "배너 적용에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid min-h-[calc(100vh-180px)] gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">tablet home preview</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">미리보기에서 영역을 선택하세요</h2>
          </div>
          <button
            type="button"
            onClick={registerVisibleBanners}
            disabled={bulkSaving || !runtime.configured}
            className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {bulkSaving ? "등록 중" : "현재 미리보기 전체 등록"}
          </button>
        </div>

        <div className="max-h-[calc(100vh-250px)] overflow-auto bg-white p-5">
          <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
            <aside className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">배너 선택</p>
              <div className="mt-3 grid gap-2">
                {renderedBanners.map(({ slot }) => {
                  const isSelected = selectedSlotId === slot.id;
                  const registered = Boolean(activeRecordForSlot(homeSections, slot));

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => selectSlot(slot.id)}
                      className={`rounded-md px-3 py-2 text-left text-sm font-black ${
                        isSelected ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                      }`}
                    >
                      <span className="block">{slot.label}</span>
                      <span className={`mt-1 block text-[11px] ${isSelected ? "text-blue-100" : registered ? "text-emerald-700" : "text-slate-400"}`}>
                        {registered ? "등록됨" : "미등록"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                좌측 목록 또는 우측 미리보기 배너를 클릭하면 오른쪽 옵션 패널이 해당 배너로 바뀝니다.
              </p>
            </aside>

            <div className="rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
              <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-lg font-black text-white">H</span>
                  <div>
                    <p className="text-sm font-black tracking-[0.18em]">HANSANYEON</p>
                    <p className="text-xs font-black text-rose-600">전용 멤버십 산후조리원 혜택</p>
                  </div>
                </div>
                <p className="text-sm font-black">산후조리원 / 새봄관</p>
              </header>

              <div className="grid gap-7 p-5">
                <button
                  type="button"
                  onClick={() => selectSlot(hero.slot.id)}
                  className="block text-left"
                  aria-label={`${hero.slot.label} 선택`}
                >
                  <div className="aspect-[16/6]">
                    <AdminSlotImage banner={hero.banner} selected={selectedSlotId === hero.slot.id} />
                  </div>
                </button>

                <div className="grid gap-4 md:grid-cols-2">
                  {promos.map(({ slot, banner }) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => selectSlot(slot.id)}
                      className="block text-left"
                      aria-label={`${slot.label} 선택`}
                    >
                      <div className="aspect-[16/7]">
                        <AdminSlotImage banner={banner} selected={selectedSlotId === slot.id} />
                      </div>
                    </button>
                  ))}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">공식 입점 브랜드</p>
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{brandCount}개 노출</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {officialBrands.map((brand) => (
                      <div key={brand.id} className="rounded-md border border-slate-200 bg-white p-3 text-center shadow-sm">
                        <div className="flex h-14 items-center justify-center">
                          <img src={brand.logoUrl} alt={brand.name} className="max-h-10 max-w-full object-contain" />
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-500">{brand.category}</p>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="rounded-md border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">selected slot</p>
            <h2 className="mt-1 text-2xl font-black">{selectedSlot.label}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{selectedSlot.placement}</p>
          </div>
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
            {draft.status === "live" ? "노출중" : draft.status}
          </span>
        </div>

        {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-bold text-blue-900">{message}</p> : null}
        {!runtime.configured ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
            Firebase 환경값을 먼저 설정해야 저장할 수 있습니다.
          </p>
        ) : null}

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-black">
            제목
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-black">
            상단 문구
            <input
              value={draft.eyebrow}
              onChange={(event) => updateDraft("eyebrow", event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-black">
            설명
            <textarea
              value={draft.subtitle}
              onChange={(event) => updateDraft("subtitle", event.target.value)}
              className="min-h-20 rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-black">
            연결 경로
            <input
              value={draft.href}
              onChange={(event) => updateDraft("href", event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-black">
            노출 상태
            <select
              value={draft.status}
              onChange={(event) => updateDraft("status", event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2"
            >
              <option value="live">노출중</option>
              <option value="paused">일시중지</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-black">
            배너 이미지 등록
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="rounded-md border border-slate-200 px-3 py-2"
            />
          </label>

          {optimizing ? (
            <p className="rounded-md bg-slate-50 p-3 text-sm font-bold text-slate-700">이미지를 최적화하고 있습니다.</p>
          ) : null}

          {optimizedAsset ? (
            <div className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">업로드 전 미리보기</p>
                  <p className="mt-1 text-sm font-bold">{optimizedAsset.optimized.name}</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800">
                  {formatBytes(optimizedAsset.original.size)}{" -> "}{formatBytes(optimizedAsset.optimized.size)}
                </span>
              </div>
              <img src={optimizedAsset.previewUrl} alt="" className="mt-3 aspect-video w-full rounded-md object-cover" />
            </div>
          ) : selectedBanner.imageUrl ? (
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-black uppercase text-slate-500">현재 적용 이미지</p>
              <img src={selectedBanner.imageUrl} alt="" className="mt-3 aspect-video w-full rounded-md bg-slate-950 object-cover" />
            </div>
          ) : null}

          <button
            type="button"
            onClick={applySelectedSlot}
            disabled={saving || optimizing || !runtime.configured}
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "적용 중" : "배너 이미지 등록 및 적용"}
          </button>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">brand display</p>
              <h3 className="text-lg font-black">공식 입점 브랜드 수</h3>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{brandCount}개</span>
          </div>
          <div className="mt-4 grid gap-3">
            <input
              type="range"
              min={1}
              max={mallBrands.length}
              value={brandCount}
              onChange={(event) => setBrandCount(Number(event.target.value))}
              className="w-full"
            />
            <input
              type="number"
              min={1}
              max={mallBrands.length}
              value={brandCount}
              onChange={(event) => setBrandCount(Math.max(1, Math.min(mallBrands.length, Number(event.target.value) || 1)))}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-black"
            />
            <button
              type="button"
              onClick={() => {
                void saveBrandCount().then(() => setMessage("공식 입점 브랜드 노출 수를 적용했습니다."));
              }}
              disabled={!runtime.configured}
              className="rounded-md bg-white px-4 py-2 text-sm font-black text-slate-900 ring-1 ring-slate-200 disabled:opacity-50"
            >
              브랜드 수 적용
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}
