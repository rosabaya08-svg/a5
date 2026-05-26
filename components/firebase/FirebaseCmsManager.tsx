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
  type CmsUploadScope,
} from "@/lib/firebase/contentRepository";

type CmsMode = "admin" | "company" | "nursery" | "tablet";
type CmsTab = "banners" | "videos" | "brands" | "detail" | "theme" | "exposure";

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
    label: "배너",
    collection: "marketing_banners",
    prefix: "banner",
    helper: "메인 히어로, 기획전, 팝업, 태블릿 배너를 Firebase에 등록/수정합니다.",
  },
  {
    id: "videos",
    label: "영상/GIF",
    collection: "marketing_videos",
    prefix: "video",
    helper: "광고 영상, GIF, 썸네일, 노출 기간과 승인 상태를 Firebase에 등록/수정합니다.",
  },
  {
    id: "brands",
    label: "브랜드",
    collection: "brands",
    prefix: "brand",
    helper: "브랜드 로고, 브랜드관 링크, 카테고리와 노출 상태를 Firebase에 등록/수정합니다.",
  },
  {
    id: "detail",
    label: "상세페이지",
    collection: "product_detail_pages",
    prefix: "detail",
    helper: "입점사 상품 상세페이지 본문과 미디어를 Firebase에 등록/수정합니다.",
  },
  {
    id: "theme",
    label: "홈 디자인",
    collection: "home_sections",
    prefix: "theme",
    helper: "폐쇄몰 홈 섹션, 테마 모드, 노출 순서를 Firebase에 등록/수정합니다.",
  },
  {
    id: "exposure",
    label: "노출대상",
    collection: "tablet_home_configs",
    prefix: "target",
    helper: "조리원, 객실, 태블릿, QR 세션별 노출 정책을 Firebase에 등록/수정합니다.",
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

const defaultScope = {
  companyId: "company-sanho-care",
  nurseryId: "nursery-gangnam-01",
  roomId: "room-701",
  tabletId: "tablet-701-a",
};

function valueOf(record: CmsRecord, key: string) {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function scopeForMode(mode: CmsMode, productId?: string): CmsUploadScope {
  if (mode === "company") {
    return { companyId: defaultScope.companyId, productId };
  }

  if (mode === "nursery") {
    return { nurseryId: defaultScope.nurseryId, roomId: defaultScope.roomId, tabletId: defaultScope.tabletId, productId };
  }

  if (mode === "tablet") {
    return { nurseryId: defaultScope.nurseryId, roomId: defaultScope.roomId, tabletId: defaultScope.tabletId, productId };
  }

  return { companyId: defaultScope.companyId, productId };
}

function firestoreScopeForMode(mode: CmsMode) {
  if (mode === "company") {
    return { company_id: defaultScope.companyId };
  }

  if (mode === "nursery") {
    return { nursery_id: defaultScope.nurseryId };
  }

  if (mode === "tablet") {
    return {
      nursery_id: defaultScope.nurseryId,
      room_id: defaultScope.roomId,
      tablet_id: defaultScope.tabletId,
    };
  }

  return {};
}

function defaultTabForRoute(defaultTab: CmsTab): CmsTab {
  if (typeof window === "undefined") {
    return defaultTab;
  }

  const path = window.location.pathname;

  if (path.includes("/brands")) return "brands";
  if (path.includes("/videos")) return "videos";
  if (path.includes("/home-editor")) return "theme";
  if (path.includes("/products")) return "detail";

  return defaultTab;
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
  const [activeTab, setActiveTab] = useState<CmsTab>(() => defaultTabForRoute(defaultTab));
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<Record<CmsCollectionName, CmsRecord[]>>({
    marketing_banners: [],
    marketing_videos: [],
    brands: [],
    product_detail_pages: [],
    home_sections: [],
    tablet_home_configs: [],
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
    setMessage(`${record.id} 수정 모드입니다.`);
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
        ...firestoreScopeForMode(mode),
        title: form.title || `${active.label} 초안`,
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
        const uploadScope = scopeForMode(mode, form.productId || id);
        const uploaded = await uploadCmsFile(active.collection, id, file, uploadScope);
        await saveCmsRecord(active.collection, {
          id,
          ...firestoreScopeForMode(mode),
          asset_url: uploaded.url,
          asset_path: uploaded.path,
          asset_type: uploaded.assetType,
          source_app: mode,
        });
        await saveCmsRecord("media_assets", {
          id: `asset-${id}`,
          ...firestoreScopeForMode(mode),
          title: file.name,
          asset_type: uploaded.assetType,
          asset_url: uploaded.url,
          asset_path: uploaded.path,
          source_collection: active.collection,
          source_record_id: id,
          owner_type: mode,
          source_app: mode,
          status: "uploaded",
        });
      }

      setForm(emptyForm);
      setFile(null);
      setMessage(`${active.collection}에 ${id} 저장 완료.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Firebase 저장 실패.");
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
      setMessage(error instanceof Error ? error.message : "상태 수정 실패.");
    }
  }

  return (
    <section className="my-5 rounded-md border border-slate-200 bg-white p-4 text-slate-950 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Firebase live CMS</p>
          <h2 className="mt-1 text-2xl font-black">a5 폐쇄몰 디자인/콘텐츠 등록</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            배너, 브랜드 로고, 영상/GIF, 상세페이지, 홈 섹션을 Firestore와 Firebase Storage에 바로 등록/수정합니다.
            PG, 주문, 정산, 외부 API는 서버 승인 로직 완료 전까지 차단됩니다.
          </p>
        </div>
        <ThemeModeToggle />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">프로젝트</p>
          <p className="mt-1 font-black">{runtime.projectId}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">스토리지</p>
          <p className="mt-1 break-all text-sm font-bold">{runtime.storageBucket}</p>
        </div>
        <div className={`rounded-md p-3 ${runtime.configured ? "bg-emerald-50" : "bg-amber-50"}`}>
          <p className="text-xs font-bold uppercase text-slate-500">연결</p>
          <p className="mt-1 font-black">{runtime.configured ? "등록 가능" : "환경변수 필요"}</p>
        </div>
      </div>

      {!runtime.configured ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          `.env.local`에 Firebase Web App 값을 넣어야 등록/수정이 활성화됩니다: {runtime.missing.join(", ")}
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
              제목
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2"
                placeholder="캠페인명, 배너명, 상세페이지 제목"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold">
                노출 위치
                <input
                  value={form.placement}
                  onChange={(event) => updateForm("placement", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                노출 대상
                <input
                  value={form.target}
                  onChange={(event) => updateForm("target", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold">
                링크 / 미리보기 경로
                <input
                  value={form.link}
                  onChange={(event) => updateForm("link", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                상태
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
                시작
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => updateForm("startsAt", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                종료
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => updateForm("endsAt", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                노출 순서
                <input
                  value={form.order}
                  onChange={(event) => updateForm("order", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold">
                상품 ID
                <input
                  value={form.productId}
                  onChange={(event) => updateForm("productId", event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                  placeholder="product-care-kit"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                테마 모드
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
              본문 / JSON 메모
              <textarea
                value={form.body}
                onChange={(event) => updateForm("body", event.target.value)}
                className="min-h-24 rounded-md border border-slate-200 px-3 py-2"
                placeholder="상세 블록, 캠페인 설명, 반려 사유, 노출 정책을 입력하세요."
              />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              이미지 / 영상 파일
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
                {saving ? "저장 중..." : form.id ? "Firebase 수정" : "Firebase 등록"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setFile(null);
                }}
                className="rounded-md bg-white px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200"
              >
                초기화
              </button>
            </div>
          </div>
        </form>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">Firebase 등록 목록</p>
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
                아직 등록된 Firebase 문서가 없습니다. 위 폼에서 등록하면 이 영역에 바로 표시됩니다.
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
                      수정
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
