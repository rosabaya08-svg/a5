"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { syncA4RoomsToA5 } from "@/lib/firebase/a4RoomSyncClient";
import { requestSignagePartnerNurseryBulkSignup } from "@/lib/firebase/nurseryBulkSyncClient";
import { saveCmsRecord, subscribeCmsRecords } from "@/lib/firebase/contentRepository";
import {
  buildNurseryAutoSignupCmsRecord,
  buildNurseryProfileFromCmsRecord,
  readNurseryAutoSignupProfiles,
  saveNurseryAutoSignupProfile,
  type NurseryAutoSignupProfile,
} from "@/lib/nursery/nurseryAutoSignup";
import {
  buildRoomDeviceLinksFromA4Sync,
  countRoomDevicesForNursery,
  readLocalNurseryRoomDeviceSync,
  saveLocalNurseryRoomDeviceSync,
  type NurseryRoomDeviceSyncState,
} from "@/lib/nursery/nurseryRoomDeviceSync";
import { formatDateTime } from "@/lib/utils/format";

type NurseryAccountRow = NurseryAutoSignupProfile & {
  roomDeviceLinked?: boolean;
  tabletCount?: number;
};

function mergeProfiles(items: NurseryAutoSignupProfile[]) {
  const byBusinessNo = new Map<string, NurseryAutoSignupProfile>();

  for (const item of items) {
    const key = item.businessRegistrationNoNormalized || item.businessRegistrationNo.replace(/\D/g, "") || item.nurseryId;
    byBusinessNo.set(key, { ...byBusinessNo.get(key), ...item });
  }

  return [...byBusinessNo.values()].sort((a, b) => a.nurseryName.localeCompare(b.nurseryName, "ko"));
}

const nurseryCategoryKeywords = ["산후조리원", "조리원", "산후", "한산연", "한국산후조리원연합회", "postpartum", "maternity", "nursery"];

function hasNurseryCategorySignal(profile: NurseryAutoSignupProfile) {
  if (profile.source !== "signage_partner") return true;

  const text = profile.nurseryName.replace(/\s+/g, "").toLowerCase();
  return nurseryCategoryKeywords.some((keyword) => text.includes(keyword.replace(/\s+/g, "").toLowerCase()));
}

function sourceLabel(source: NurseryAutoSignupProfile["source"]) {
  return source === "signage_partner" ? "signage-partner 산후조리원" : "A5 직접 자동가입";
}

function accountStatusLabel(profile: NurseryAutoSignupProfile) {
  return profile.status === "suspended" ? "정지" : "운영중";
}

export function AdminNurseryPartnerSyncPanel() {
  const [cmsProfiles, setCmsProfiles] = useState<NurseryAutoSignupProfile[]>([]);
  const [localProfiles, setLocalProfiles] = useState<NurseryAutoSignupProfile[]>(() =>
    typeof window === "undefined" ? [] : readNurseryAutoSignupProfiles(),
  );
  const [roomDeviceSync, setRoomDeviceSync] = useState<NurseryRoomDeviceSyncState>(() =>
    typeof window === "undefined" ? { rooms: [], tablets: [] } : readLocalNurseryRoomDeviceSync(),
  );
  const [message, setMessage] = useState("signage-partner 산후조리원 카테고리 업체를 사업자등록번호 기준으로 A5 조리원 계정에 연동합니다.");
  const [errorMessage, setErrorMessage] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncingRoomProfileId, setSyncingRoomProfileId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeCmsRecords(
      "nursery_auto_signup_profiles",
      (records) => {
        setErrorMessage("");
        setCmsProfiles(records.map(buildNurseryProfileFromCmsRecord).filter(Boolean) as NurseryAutoSignupProfile[]);
      },
      (error) => setErrorMessage(error),
    );

    return unsubscribe;
  }, []);

  const rows = useMemo(() => {
    const merged = mergeProfiles([...localProfiles, ...cmsProfiles].filter(hasNurseryCategorySignal));

    return merged.map((profile) => {
      const linkedCounts = countRoomDevicesForNursery(roomDeviceSync, profile.nurseryId);
      const profileRoomCount = Number(profile.roomCount) || 0;

      return {
        ...profile,
        roomCount: String(linkedCounts.rooms || profileRoomCount || 0),
        roomDeviceLinked: linkedCounts.rooms > 0 || linkedCounts.tablets > 0,
        tabletCount: linkedCounts.tablets || (profile as NurseryAccountRow).tabletCount || 0,
      };
    });
  }, [cmsProfiles, localProfiles, roomDeviceSync]);

  async function persistProfiles(profiles: NurseryAutoSignupProfile[]) {
    for (const profile of profiles) {
      saveNurseryAutoSignupProfile(profile);

      try {
        await saveCmsRecord("nursery_auto_signup_profiles", buildNurseryAutoSignupCmsRecord(profile));
      } catch {
        // The local admin list remains updated; Firestore can be retried with the sync button.
      }
    }

    setLocalProfiles(readNurseryAutoSignupProfiles());
  }

  async function collectRoomDeviceLinks(profile: NurseryAutoSignupProfile) {
    const syncedAt = new Date().toISOString();
    const result = await syncA4RoomsToA5({
      nurseryId: profile.nurseryId,
      businessRegistrationNo: profile.businessRegistrationNo,
      externalNurseryId: profile.externalNurseryId,
    });

    if (result.ok) {
      return {
        ok: true as const,
        source: "functions" as const,
        state: buildRoomDeviceLinksFromA4Sync(result, syncedAt),
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
      };
    }

    return {
      ok: false as const,
      source: "failed" as const,
      error: result.error,
      state: { rooms: [], tablets: [] } satisfies NurseryRoomDeviceSyncState,
      importedCount: 0,
      skippedCount: 0,
    };
  }

  async function syncRoomDevicesForProfiles(profiles: NurseryAutoSignupProfile[]) {
    const results = await Promise.all(profiles.map((profile) => collectRoomDeviceLinks(profile)));
    const nextState = saveLocalNurseryRoomDeviceSync({
      rooms: results.flatMap((result) => result.state.rooms),
      tablets: results.flatMap((result) => result.state.tablets),
    });
    const roomCount = results.reduce((total, result) => total + result.state.rooms.length, 0);
    const tabletCount = results.reduce((total, result) => total + result.state.tablets.length, 0);
    const failedCount = results.filter((result) => !result.ok).length;

    setRoomDeviceSync(nextState);

    return { roomCount, tabletCount, failedCount };
  }

  async function syncRoomDevicesForProfile(profile: NurseryAutoSignupProfile) {
    setSyncingRoomProfileId(profile.nurseryId);
    setErrorMessage("");
    setMessage(`${profile.nurseryName} 객실/기기 자료를 A5로 연동하는 중입니다.`);

    const summary = await syncRoomDevicesForProfiles([profile]);

    setSyncingRoomProfileId(null);

    if (summary.failedCount > 0) {
      setMessage(`${profile.nurseryName} 객실/기기 연동에 실패했습니다. signage-partner 읽기 권한 또는 Functions 배포 상태를 확인해 주세요.`);
      return;
    }

    setMessage(
      `${profile.nurseryName} 객실/기기 연동 완료: 객실 ${summary.roomCount}개, 태블릿 ${summary.tabletCount}대 반영.`,
    );
  }

  async function syncSignagePartnerNurseries() {
    setSyncing(true);
    setErrorMessage("");
    setMessage("signage-partner 산후조리원 카테고리 업체와 객실/기기 자료를 A5로 연동하는 중입니다.");

    const remote = await requestSignagePartnerNurseryBulkSignup();

    if (!remote.ok) {
      setSyncing(false);
      setMessage("signage-partner 산후조리원 카테고리 연동에 실패했습니다. 권한과 Functions 배포 상태를 확인해 주세요.");
      setErrorMessage(`${remote.error.code}: ${remote.error.message}`);
      return;
    }

    await persistProfiles(remote.profiles);
    const roomDeviceSummary = await syncRoomDevicesForProfiles(remote.profiles);
    setSyncing(false);
    setMessage(
      `연동 완료: signage-partner 산후조리원 ${remote.importedCount}건 반영, ${remote.skippedCount}건 건너뜀. 객실 ${roomDeviceSummary.roomCount}개 / 태블릿 ${roomDeviceSummary.tabletCount}대 반영${
        roomDeviceSummary.failedCount ? `, 객실/기기 실패 ${roomDeviceSummary.failedCount}건` : ""
      }.`,
    );
  }

  async function setAccountStatus(profile: NurseryAutoSignupProfile, status: NurseryAutoSignupProfile["status"]) {
    const nextProfile = { ...profile, status, updatedAt: new Date().toISOString() };
    await persistProfiles([nextProfile]);
    setMessage(`${profile.nurseryName} 계정을 ${status === "suspended" ? "정지" : "재개"} 처리했습니다.`);
  }

  async function resetPassword(profile: NurseryAutoSignupProfile) {
    const nextProfile = { ...profile, defaultPassword: "1004", updatedAt: new Date().toISOString() };
    await persistProfiles([nextProfile]);
    setMessage(`${profile.nurseryName} 기본 비밀번호 정책을 1004로 초기화했습니다.`);
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.12em] text-blue-700">조리원 계정 동기화</p>
            <h2 className="mt-1 text-lg font-normal text-slate-950">signage-partner 산후조리원 카테고리 연동</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              signage-partner 서버의 산후조리원 카테고리 업체만 사업자등록번호 기준으로 가져오고, 같은 사업자번호의 객실/태블릿 자료만 함께 연동합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={syncSignagePartnerNurseries}
            disabled={syncing}
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-normal text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? "연동 중" : "산후조리원 업체/객실 연동"}
          </button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-normal text-slate-500">A5 조리원 계정</p>
            <p className="mt-1 text-xl font-normal text-slate-950">{rows.length}건</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-normal text-slate-500">운영중</p>
            <p className="mt-1 text-xl font-normal text-slate-950">{rows.filter((row) => row.status !== "suspended").length}건</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-normal text-slate-500">정지</p>
            <p className="mt-1 text-xl font-normal text-slate-950">{rows.filter((row) => row.status === "suspended").length}건</p>
          </div>
        </div>
        <p className="mt-3 rounded-md bg-blue-50 p-3 text-sm font-normal text-blue-900">{message}</p>
        {errorMessage ? <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm font-normal text-amber-900">{errorMessage}</p> : null}
      </div>

      <DataTable
        columns={["조리원", "사업자번호", "담당자", "주소/객실", "가입 출처", "상태", "관리"]}
        rows={rows.map((profile) => ({
          id: profile.nurseryId,
          cells: [
            <div key="nursery">
              <p className="font-normal text-slate-950">{profile.nurseryName}</p>
              <p className="mt-1 text-xs font-normal text-slate-500">{profile.nurseryId}</p>
            </div>,
            <span key="business-no" className="font-normal text-slate-900">{profile.businessRegistrationNo}</span>,
            <div key="manager">
              <p className="font-normal text-slate-800">{profile.managerName || "담당자 미입력"}</p>
              <p className="mt-1 text-xs text-slate-500">{profile.managerPhone || profile.managerEmail || "연락처 미입력"}</p>
            </div>,
            <div key="address">
              <p className="font-normal text-slate-800">{profile.businessAddress || "주소 미입력"}</p>
              <p className="mt-1 text-xs text-slate-500">객실 {profile.roomCount || 0}개 / 태블릿 {profile.tabletCount ?? 0}대</p>
              <p className={`mt-1 text-xs font-normal ${profile.roomDeviceLinked ? "text-emerald-700" : "text-amber-700"}`}>
                {profile.roomDeviceLinked ? "객실/기기 연동 완료" : "객실/기기 연동 필요"}
              </p>
            </div>,
            <div key="source">
              <p className="font-normal text-slate-800">{sourceLabel(profile.source)}</p>
              <p className="mt-1 text-xs text-slate-500">가입 {formatDateTime(profile.createdAt)}</p>
            </div>,
            <span
              key="status"
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-normal ring-1 ${
                profile.status === "suspended"
                  ? "bg-red-50 text-red-800 ring-red-200"
                  : "bg-emerald-50 text-emerald-800 ring-emerald-200"
              }`}
            >
              {accountStatusLabel(profile)}
            </span>,
            <div key="actions" className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAccountStatus(profile, profile.status === "suspended" ? "approved" : "suspended")}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-800"
              >
                {profile.status === "suspended" ? "정지 해제" : "계정 정지"}
              </button>
              <button
                type="button"
                onClick={() => resetPassword(profile)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-800"
              >
                비밀번호 초기화
              </button>
              <button
                type="button"
                onClick={() => syncRoomDevicesForProfile(profile)}
                disabled={syncingRoomProfileId === profile.nurseryId}
                className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {syncingRoomProfileId === profile.nurseryId ? "연동 중" : profile.roomDeviceLinked ? "객실 재연동" : "객실연동"}
              </button>
            </div>,
          ],
        }))}
        emptyMessage="연동된 산후조리원 가입자가 없습니다."
        errorMessage={undefined}
      />
    </section>
  );
}
