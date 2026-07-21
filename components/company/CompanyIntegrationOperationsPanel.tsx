"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { ensureAnonymousFirebaseUser, getFirebaseAuthClient, getFirebaseDb } from "@/lib/firebase/client";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";
import { formatDateTime } from "@/lib/utils/format";

type IntegrationEventStatus = "ready" | "sent" | "failed" | "retrying" | "cancelled";

type IntegrationEventRow = {
  id: string;
  orderNo: string;
  eventType: string;
  status: IntegrationEventStatus;
  retryCount: number;
  lastError: string;
  webhookUrl: string;
  createdAt: string;
  updatedAt: string;
};

type IntegrationLogRow = {
  id: string;
  platformType: string;
  endpoint: string;
  status: string;
  errorCode: string;
  resultCount: number;
  createdAt: string;
};

type RetryState = {
  eventId: string;
  status: "idle" | "saving" | "done" | "error";
  message: string;
};

function asText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asIso(value: unknown) {
  if (typeof value === "string" && value) return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const timestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  }

  return new Date().toISOString();
}

function eventStatus(value: unknown): IntegrationEventStatus {
  const status = asText(value);
  if (status === "sent" || status === "failed" || status === "retrying" || status === "cancelled") return status;
  return "ready";
}

function mapEvent(id: string, data: DocumentData): IntegrationEventRow {
  return {
    id,
    orderNo: asText(data.order_no ?? data.orderNo),
    eventType: asText(data.event_type ?? data.eventType, "payment.paid"),
    status: eventStatus(data.status),
    retryCount: asNumber(data.retry_count),
    lastError: asText(data.last_error),
    webhookUrl: asText(data.webhook_url),
    createdAt: asIso(data.created_at),
    updatedAt: asIso(data.updated_at),
  };
}

function mapLog(id: string, data: DocumentData): IntegrationLogRow {
  return {
    id,
    platformType: asText(data.platform_type, "-"),
    endpoint: asText(data.endpoint, "-"),
    status: asText(data.status, "-"),
    errorCode: asText(data.error_code),
    resultCount: asNumber(data.result_count),
    createdAt: asIso(data.created_at),
  };
}

function statusTone(status: IntegrationEventStatus | string) {
  if (status === "sent" || status === "success" || status === "accepted") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "failed" || status === "rejected") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "retrying") return "bg-blue-50 text-blue-800 ring-blue-200";
  if (status === "cancelled") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-amber-50 text-amber-900 ring-amber-200";
}

function statusLabel(status: IntegrationEventStatus | string) {
  if (status === "ready") return "대기";
  if (status === "sent") return "전송 성공";
  if (status === "failed") return "전송 실패";
  if (status === "retrying") return "전송 중";
  if (status === "cancelled") return "취소";
  if (status === "success") return "성공";
  if (status === "rejected") return "거절";
  if (status === "accepted") return "접수";
  return status;
}

export function CompanyIntegrationOperationsPanel({ companyId }: { companyId: string }) {
  const [events, setEvents] = useState<IntegrationEventRow[]>([]);
  const [logs, setLogs] = useState<IntegrationLogRow[]>([]);
  const [statusMessage, setStatusMessage] = useState("연동 운영 데이터를 불러오는 중입니다.");
  const [retryState, setRetryState] = useState<RetryState>({ eventId: "", status: "idle", message: "" });

  useEffect(() => {
    let unsubscribers: Unsubscribe[] = [];
    let cancelled = false;

    void ensureAnonymousFirebaseUser()
      .catch(() => null)
      .then(() => {
        if (cancelled) return;
        const db = getFirebaseDb();

        if (!db) {
          setStatusMessage("Firebase 설정이 없어 연동 운영 데이터를 표시할 수 없습니다.");
          return;
        }

        const eventsQuery = query(collection(db, "integration_events"), where("company_id", "==", companyId));
        const logsQuery = query(collection(db, "integration_call_logs"), where("company_id", "==", companyId));

        unsubscribers = [
          onSnapshot(
            eventsQuery,
            (snapshot) => {
              setEvents(
                snapshot.docs
                  .map((doc) => mapEvent(doc.id, doc.data()))
                  .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                  .slice(0, 30),
              );
              setStatusMessage("연동 이벤트와 호출 로그를 실시간으로 확인 중입니다.");
            },
            (error) => setStatusMessage(`연동 이벤트 구독 실패: ${error.message}`),
          ),
          onSnapshot(
            logsQuery,
            (snapshot) => {
              setLogs(
                snapshot.docs
                  .map((doc) => mapLog(doc.id, doc.data()))
                  .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                  .slice(0, 20),
              );
            },
            (error) => setStatusMessage(`연동 호출 로그 구독 실패: ${error.message}`),
          ),
        ];
      });

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [companyId]);

  const counts = useMemo(() => {
    const initial: Record<IntegrationEventStatus, number> = { ready: 0, sent: 0, failed: 0, retrying: 0, cancelled: 0 };
    for (const event of events) initial[event.status] += 1;
    return initial;
  }, [events]);

  const actionableEvents = events.filter((event) => event.status === "ready" || event.status === "failed").slice(0, 8);
  const latestLog = logs[0];

  async function requestRetry(eventId: string) {
    const auth = getFirebaseAuthClient();
    const token = auth?.currentUser ? await auth.currentUser.getIdToken() : "";
    const url = getPaymentFunctionUrl("companyIntegrationEventRetry");

    if (!token || !url) {
      setRetryState({ eventId, status: "error", message: "기업관리자 로그인 토큰 또는 Functions URL이 없어 재전송을 요청할 수 없습니다." });
      return;
    }

    setRetryState({ eventId, status: "saving", message: "외부 연동 webhook 전송을 요청하는 중입니다." });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId, eventId, errorMessage: "company_admin_retry_requested" }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || body?.ok === false) {
        throw new Error(typeof body?.result?.reason === "string" ? body.result.reason : "외부 연동 webhook 전송이 실패했습니다.");
      }

      setRetryState({ eventId, status: "done", message: "외부 연동 webhook 전송이 완료되었습니다." });
    } catch (error) {
      setRetryState({ eventId, status: "error", message: error instanceof Error ? error.message : "외부 연동 webhook 전송이 실패했습니다." });
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal tracking-[0.14em] text-emerald-700">연동 운영</p>
          <h3 className="mt-1 text-lg font-normal text-slate-950">연동 운영 대시보드</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{statusMessage}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-normal ring-1 ${latestLog ? statusTone(latestLog.status) : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
          {latestLog ? `최근 호출 ${statusLabel(latestLog.status)}` : "호출 대기"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {[
          ["대기", counts.ready, "ready"],
          ["성공", counts.sent, "sent"],
          ["실패", counts.failed, "failed"],
          ["전송 중", counts.retrying, "retrying"],
          ["취소", counts.cancelled, "cancelled"],
        ].map(([label, value, status]) => (
          <div key={String(status)} className={`rounded-md p-3 ring-1 ${statusTone(String(status))}`}>
            <p className="text-xs font-normal">{label}</p>
            <p className="mt-1 text-xl font-normal">{value}건</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-normal text-slate-950">재전송 가능 이벤트</h4>
            <p className="text-xs font-normal text-slate-500">{actionableEvents.length}건 표시</p>
          </div>
          <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
            {actionableEvents.length ? (
              <div className="divide-y divide-slate-100">
                {actionableEvents.map((event) => (
                  <div key={event.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="text-sm font-normal text-slate-950">{event.orderNo || event.id}</p>
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        {event.eventType} / {statusLabel(event.status)} / 재시도 {event.retryCount}회
                      </p>
                      {event.webhookUrl ? <p className="mt-1 break-words text-xs font-normal text-slate-500">{event.webhookUrl}</p> : null}
                      {event.lastError ? <p className="mt-1 text-xs font-normal text-red-700">{event.lastError}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => requestRetry(event.id)}
                      disabled={retryState.eventId === event.id && retryState.status === "saving"}
                      className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {retryState.eventId === event.id && retryState.status === "saving" ? "전송 중" : "webhook 재전송"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-4 text-sm font-normal text-slate-500">재전송할 실패/대기 이벤트가 없습니다.</p>
            )}
          </div>
          {retryState.message ? (
            <p className={`mt-2 text-xs font-normal ${retryState.status === "error" ? "text-red-700" : "text-emerald-700"}`}>
              {retryState.message}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-normal text-slate-950">최근 API 호출 로그</h4>
            <p className="text-xs font-normal text-slate-500">{logs.length}건 표시</p>
          </div>
          <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
            {logs.length ? (
              <div className="divide-y divide-slate-100">
                {logs.slice(0, 8).map((log) => (
                  <div key={log.id} className="grid gap-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-normal text-slate-950">{log.endpoint}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-normal ring-1 ${statusTone(log.status)}`}>
                        {statusLabel(log.status)}
                      </span>
                    </div>
                    <p className="text-xs font-normal text-slate-500">
                      {log.platformType} / 결과 {log.resultCount}건 / {formatDateTime(log.createdAt)}
                    </p>
                    {log.errorCode ? <p className="text-xs font-normal text-red-700">{log.errorCode}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-4 text-sm font-normal text-slate-500">최근 호출 로그가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
