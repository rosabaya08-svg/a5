"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { callTabletDeviceAdmin } from "@/lib/firebase/tabletDeviceClient";

type EnrollmentRow = {
  id: string;
  nurseryId: string;
  nurseryName: string;
  roomId: string;
  roomName: string;
  tabletId: string;
  tabletLabel: string;
  businessNumberMasked: string;
  status: string;
  codeHint: string;
  expiresAt: string;
  enrolledAt: string;
  enrolledUid: string;
  revokedAt: string;
  createdAt: string;
};

type CreateResult = {
  ok: true;
  enrollmentId: string;
  enrollmentCode: string;
  codeDisplayedOnce: true;
  expiresAt: string;
  scope: {
    nurseryId: string;
    nurseryName: string;
    roomId: string;
    roomName: string;
    tabletId: string;
    tabletLabel: string;
  };
};

function downloadCsv(rows: EnrollmentRow[]) {
  const headers = ["등록ID", "조리원", "객실", "태블릿", "사업자번호", "상태", "코드힌트", "만료", "등록완료", "Firebase UID", "회수", "생성"];
  const values = rows.map((row) => [row.id, row.nurseryName || row.nurseryId, row.roomName || row.roomId, row.tabletLabel || row.tabletId, row.businessNumberMasked, row.status, row.codeHint, row.expiresAt, row.enrolledAt, row.enrolledUid, row.revokedAt, row.createdAt]);
  const quote = (value: string) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers, ...values].map((row) => row.map(quote).join(",")).join("\r\n");
  const href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = "tablet-device-enrollments.csv";
  anchor.click();
  URL.revokeObjectURL(href);
}

function statusClass(status: string) {
  if (status === "USED") return "bg-emerald-100 text-emerald-800";
  if (status === "ACTIVE" || status === "ENROLLING") return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-800";
}

export function TabletDeviceEnrollmentWorkspace() {
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Firebase TABLET_DEVICE 등록원장을 불러오세요.");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<CreateResult | null>(null);

  const visibleRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(keyword)));
  }, [query, rows]);

  async function refresh() {
    setBusy(true);
    try {
      const result = await callTabletDeviceAdmin<{ ok: true; listCount: number; list: EnrollmentRow[] }>({ action: "list", limit: 500 });
      setRows(result.list);
      setMessage(`등록원장 ${result.listCount}건을 확인했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "태블릿 등록원장을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setIssued(null);
    try {
      const result = await callTabletDeviceAdmin<CreateResult>({
        action: "create",
        nurseryId: String(form.get("nurseryId") ?? "").trim(),
        roomId: String(form.get("roomId") ?? "").trim(),
        tabletId: String(form.get("tabletId") ?? "").trim(),
        businessNumber: String(form.get("businessNumber") ?? "").replace(/[^0-9]/g, ""),
        expiresInHours: Number(form.get("expiresInHours") ?? 24),
        reason: String(form.get("reason") ?? "").trim(),
      });
      setIssued(result);
      setMessage("일회용 등록코드를 발급했습니다. 이 화면을 닫기 전에 대상 태블릿에 전달하세요.");
      event.currentTarget.reset();
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "태블릿 등록코드 발급에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(row: EnrollmentRow) {
    const reason = window.prompt(`${row.tabletLabel || row.tabletId} 등록을 회수하는 사유를 입력하세요.`);
    if (!reason) return;
    if (!window.confirm("Firebase Refresh Token과 TABLET_DEVICE 접근권한을 즉시 회수합니다. 계속하시겠습니까?")) return;
    setBusy(true);
    try {
      await callTabletDeviceAdmin({ action: "revoke", enrollmentId: row.id, reason });
      setMessage(`${row.tabletLabel || row.tabletId} 권한을 회수했습니다.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "태블릿 권한 회수에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.enrollmentCode);
    setMessage("일회용 등록코드를 클립보드에 복사했습니다.");
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <h2 className="text-lg font-black">TABLET_DEVICE 등록 원칙</h2>
        <p className="mt-2 text-sm font-semibold leading-6">공용 비밀번호와 localStorage 로그인을 사용하지 않습니다. 관리자가 조리원·객실·태블릿을 지정해 일회용 코드를 발급하고, 태블릿은 Firebase Custom Token으로 해당 범위에 고정됩니다.</p>
      </section>

      <form onSubmit={create} className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-xs font-black text-slate-600">조리원 ID<input name="nurseryId" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600">객실 ID<input name="roomId" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600">태블릿 ID<input name="tabletId" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600">사업자번호<input name="businessNumber" required inputMode="numeric" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" placeholder="숫자 10자리" /></label>
        <label className="grid gap-1 text-xs font-black text-slate-600">유효시간<select name="expiresInHours" defaultValue="24" className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold"><option value="1">1시간</option><option value="6">6시간</option><option value="24">24시간</option><option value="72">72시간</option><option value="168">7일</option></select></label>
        <label className="grid gap-1 text-xs font-black text-slate-600 md:col-span-2 xl:col-span-4">발급 사유<input name="reason" required className="h-11 rounded-md border border-slate-300 px-3 text-sm font-bold" placeholder="예: 701호 신규 태블릿 설치" /></label>
        <button type="submit" disabled={busy} className="h-11 self-end rounded-md bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50">{busy ? "처리 중" : "일회용 코드 발급"}</button>
      </form>

      {issued ? (
        <section className="rounded-md border-2 border-amber-400 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em]">ONE-TIME DISPLAY</p>
          <h2 className="mt-2 text-xl font-black">등록코드는 지금 한 번만 표시됩니다</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3"><code className="break-all rounded-md bg-white px-4 py-3 text-base font-black ring-1 ring-amber-300">{issued.enrollmentCode}</code><button type="button" onClick={() => void copyCode()} className="rounded-md bg-amber-700 px-4 py-3 text-sm font-black text-white">복사</button></div>
          <p className="mt-3 text-sm font-bold">{issued.scope.nurseryName} / {issued.scope.roomName} / {issued.scope.tabletLabel} · 만료 {new Date(issued.expiresAt).toLocaleString("ko-KR")}</p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-100 px-4 py-3">
          <div><h2 className="font-black">태블릿 Firebase 등록원장</h2><p className="mt-1 text-xs font-bold text-slate-500">전체 {rows.length}건 · 검색 {visibleRows.length}건</p></div>
          <div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="표 검색" className="h-10 rounded-md border border-slate-300 px-3 text-sm font-bold" /><button type="button" onClick={() => downloadCsv(visibleRows)} className="rounded-md bg-emerald-700 px-4 text-sm font-black text-white">엑셀 CSV</button><button type="button" disabled={busy} onClick={() => void refresh()} className="rounded-md bg-blue-700 px-4 text-sm font-black text-white disabled:opacity-50">새로고침</button></div>
        </div>
        <p className="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{message}</p>
        <div className="max-h-[620px] overflow-auto">
          <table className="min-w-max border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-[#d9ead3]"><tr>{["행", "조리원", "객실", "태블릿", "사업자번호", "상태", "코드힌트", "만료", "등록완료", "Firebase UID", "권한"].map((label) => <th key={label} className="border-b border-r border-slate-300 px-3 py-2 font-black">{label}</th>)}</tr></thead>
            <tbody>{visibleRows.map((row, index) => <tr key={row.id} className="odd:bg-white even:bg-slate-50"><td className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-center font-bold">{index + 1}</td><td className="border-b border-r border-slate-200 px-3 py-2 font-bold">{row.nurseryName || row.nurseryId}</td><td className="border-b border-r border-slate-200 px-3 py-2 font-bold">{row.roomName || row.roomId}</td><td className="border-b border-r border-slate-200 px-3 py-2 font-bold">{row.tabletLabel || row.tabletId}</td><td className="border-b border-r border-slate-200 px-3 py-2">{row.businessNumberMasked}</td><td className="border-b border-r border-slate-200 px-3 py-2"><span className={`rounded-full px-2 py-1 font-black ${statusClass(row.status)}`}>{row.status}</span></td><td className="border-b border-r border-slate-200 px-3 py-2 font-mono">{row.codeHint}</td><td className="border-b border-r border-slate-200 px-3 py-2">{row.expiresAt}</td><td className="border-b border-r border-slate-200 px-3 py-2">{row.enrolledAt}</td><td className="border-b border-r border-slate-200 px-3 py-2 font-mono">{row.enrolledUid}</td><td className="border-b border-r border-slate-200 px-3 py-2"><button type="button" disabled={busy || row.status === "REVOKED"} onClick={() => void revoke(row)} className="rounded-md bg-red-600 px-3 py-2 font-black text-white disabled:opacity-40">회수</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
