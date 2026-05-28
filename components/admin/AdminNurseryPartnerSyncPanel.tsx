"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { tabletNurseryAccess } from "@/data/accessCredentials";
import { mockApi } from "@/lib/mock/mockApi";
import { buildLocalA2NurseryBulkSyncResult, requestA2NurseryBulkSignup } from "@/lib/firebase/nurseryBulkSyncClient";
import { saveCmsRecord, subscribeCmsRecords } from "@/lib/firebase/contentRepository";
import {
  buildNurseryAutoSignupCmsRecord,
  buildNurseryProfileFromCmsRecord,
  readNurseryAutoSignupProfiles,
  saveNurseryAutoSignupProfile,
  type NurseryAutoSignupProfile,
} from "@/lib/nursery/nurseryAutoSignup";
import { formatDateTime } from "@/lib/utils/format";

type NurseryAccountRow = NurseryAutoSignupProfile & {
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

function profileFromMockNursery(nursery: ReturnType<typeof mockApi.nurseries>[number]): NurseryAccountRow {
  const businessRegistrationNo =
    nursery.id === tabletNurseryAccess.nurseryId ? tabletNurseryAccess.businessNo : nursery.id.replace(/^nursery-/, "");
  const normalized = businessRegistrationNo.replace(/\D/g, "");

  return {
    id: businessRegistrationNo,
    nurseryId: nursery.id,
    businessRegistrationNo,
    businessRegistrationNoNormalized: normalized,
    nurseryName: nursery.name,
    representativeName: "",
    managerName: nursery.managerName,
    managerPhone: "",
    managerEmail: "",
    businessAddress: nursery.region,
    roomCount: String(nursery.roomCount),
    defaultPassword: "1004",
    source: "manual_profile",
    status: nursery.status === "suspended" ? "suspended" : "approved",
    createdAt: "2026-05-26T18:30:00+09:00",
    updatedAt: "2026-05-26T18:30:00+09:00",
    tabletCount: nursery.tabletCount,
  };
}

function sourceLabel(source: NurseryAutoSignupProfile["source"]) {
  return source === "signage_partner" ? "A2/signage-partner" : "A5 직접 자동가입";
}

function accountStatusLabel(profile: NurseryAutoSignupProfile) {
  return profile.status === "suspended" ? "정지" : "운영중";
}

export function AdminNurseryPartnerSyncPanel() {
  const [cmsProfiles, setCmsProfiles] = useState<NurseryAutoSignupProfile[]>([]);
  const [localProfiles, setLocalProfiles] = useState<NurseryAutoSignupProfile[]>(() =>
    typeof window === "undefined" ? [] : readNurseryAutoSignupProfiles(),
  );
  const [message, setMessage] = useState("A2/signage-partner에 가입된 산후조리원 프로필을 A5 조리원 계정으로 일괄 연동합니다.");
  const [errorMessage, setErrorMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

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
    const seedProfiles = mockApi.nurseries().map(profileFromMockNursery);
    const merged = mergeProfiles([...seedProfiles, ...localProfiles, ...cmsProfiles]);

    return merged.map((profile) => ({
      ...profile,
      tabletCount:
        mockApi.tablets().filter((tablet) => tablet.nurseryId === profile.nurseryId).length ||
        (profile as NurseryAccountRow).tabletCount ||
        0,
    }));
  }, [cmsProfiles, localProfiles]);

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

  async function syncA2Nurseries() {
    setSyncing(true);
    setErrorMessage("");
    setMessage("A2/signage-partner 가입자 자료를 A5 조리원 계정으로 연동하는 중입니다.");

    const remote = await requestA2NurseryBulkSignup();
    const result = remote.ok ? remote : buildLocalA2NurseryBulkSyncResult(`일괄 연동 함수 호출 실패: ${remote.error.message}.`);

    await persistProfiles(result.profiles);
    setSyncing(false);
    setMessage(
      result.source === "firebase_functions"
        ? `연동 완료: A2 자료 ${result.importedCount}건 반영, ${result.skippedCount}건 건너뜀.`
        : result.message,
    );

    if (!remote.ok) {
      setErrorMessage("Functions 배포 전이거나 호출 권한이 없어서 현재 A5에 포함된 A2 매핑 자료만 우선 반영했습니다.");
    }
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
            <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">nursery account sync</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">A1/A2 산후조리원 가입자 연동</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A2에 이미 가입된 산후조리원 프로필을 A5 조리원 계정으로 선가입 처리합니다. 기업 가입처럼 승인/반려하지 않고,
              최고관리자는 가입 정보 확인과 계정 정지/재개만 관리합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={syncA2Nurseries}
            disabled={syncing}
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? "연동 중" : "A1/A2 자료 산후조리원 가입자 연동하기"}
          </button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">A5 조리원 계정</p>
            <p className="mt-1 text-xl font-black text-slate-950">{rows.length}건</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">운영중</p>
            <p className="mt-1 text-xl font-black text-slate-950">{rows.filter((row) => row.status !== "suspended").length}건</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">정지</p>
            <p className="mt-1 text-xl font-black text-slate-950">{rows.filter((row) => row.status === "suspended").length}건</p>
          </div>
        </div>
        <p className="mt-3 rounded-md bg-blue-50 p-3 text-sm font-bold text-blue-900">{message}</p>
        {errorMessage ? <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-900">{errorMessage}</p> : null}
      </div>

      <DataTable
        columns={["조리원", "사업자번호", "담당자", "주소/객실", "가입 출처", "상태", "관리"]}
        rows={rows.map((profile) => ({
          id: profile.nurseryId,
          cells: [
            <div key="nursery">
              <p className="font-black text-slate-950">{profile.nurseryName}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{profile.nurseryId}</p>
            </div>,
            <span key="business-no" className="font-bold text-slate-900">{profile.businessRegistrationNo}</span>,
            <div key="manager">
              <p className="font-bold text-slate-800">{profile.managerName || "담당자 미입력"}</p>
              <p className="mt-1 text-xs text-slate-500">{profile.managerPhone || profile.managerEmail || "연락처 미입력"}</p>
            </div>,
            <div key="address">
              <p className="font-bold text-slate-800">{profile.businessAddress || "주소 미입력"}</p>
              <p className="mt-1 text-xs text-slate-500">객실 {profile.roomCount || 0}개 / 태블릿 {profile.tabletCount ?? 0}대</p>
            </div>,
            <div key="source">
              <p className="font-bold text-slate-800">{sourceLabel(profile.source)}</p>
              <p className="mt-1 text-xs text-slate-500">가입 {formatDateTime(profile.createdAt)}</p>
            </div>,
            <span
              key="status"
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
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
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800"
              >
                {profile.status === "suspended" ? "정지 해제" : "계정 정지"}
              </button>
              <button
                type="button"
                onClick={() => resetPassword(profile)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800"
              >
                비밀번호 초기화
              </button>
              <a href="/admin/rooms" className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
                객실연동
              </a>
            </div>,
          ],
        }))}
        emptyMessage="연동된 산후조리원 가입자가 없습니다."
        errorMessage={undefined}
      />
    </section>
  );
}
