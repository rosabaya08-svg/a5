"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { getFirebaseAuthClient, getFirebaseDb } from "@/lib/firebase/client";
import { formatDateTime } from "@/lib/utils/format";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";

type IntegrationLogStatus = "accepted" | "rejected" | "success" | "failed";

type IntegrationLogRow = {
  id: string;
  companyId: string;
  platformType: string;
  endpoint: string;
  status: IntegrationLogStatus;
  errorCode: string;
  resultCount: number;
  requestId: string;
  latencyMs: number;
  method: string;
  path: string;
  requiredScope: string;
  httpStatus: number;
  userAgent: string;
  remoteIp: string;
  eventId: string;
  orderNo: string;
  message: string;
  createdAt: string;
};

function text(value: unknown, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function iso(value: unknown) {
  if (typeof value === "string" && value) return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const timestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  }

  return new Date().toISOString();
}

function status(value: unknown): IntegrationLogStatus {
  const current = text(value);
  if (current === "accepted" || current === "rejected" || current === "failed") return current;
  return "success";
}

function mapLog(id: string, data: DocumentData): IntegrationLogRow {
  return {
    id,
    companyId: text(data.company_id, "-"),
    platformType: text(data.platform_type, "-"),
    endpoint: text(data.endpoint, "-"),
    status: status(data.status),
    errorCode: text(data.error_code),
    resultCount: numberValue(data.result_count),
    requestId: text(data.request_id),
    latencyMs: numberValue(data.latency_ms),
    method: text(data.method, "-"),
    path: text(data.path, "-"),
    requiredScope: text(data.required_scope, "-"),
    httpStatus: numberValue(data.http_status),
    userAgent: text(data.user_agent),
    remoteIp: text(data.remote_ip),
    eventId: text(data.event_id),
    orderNo: text(data.order_no),
    message: text(data.message),
    createdAt: iso(data.created_at),
  };
}

function statusTone(status: IntegrationLogStatus) {
  if (status === "success" || status === "accepted") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

function statusLabel(status: IntegrationLogStatus) {
  if (status === "accepted") return "인증 통과";
  if (status === "rejected") return "인증 거절";
  if (status === "failed") return "실패";
  return "성공";
}

export function AdminIntegrationMonitoringPanel() {
  const [logs, setLogs] = useState<IntegrationLogRow[]>([]);
  const [message, setMessage] = useState("API 연동 로그를 실시간으로 불러오는 중입니다.");

  useEffect(() => {
    let unsubscribe: Unsubscribe = () => undefined;
    const auth = getFirebaseAuthClient();
    const db = getFirebaseDb();

    if (!auth?.currentUser) {
      queueMicrotask(() => setMessage("최고관리자 Firebase 인증이 없어 API 연동 로그를 읽을 수 없습니다."));
      return () => undefined;
    }

    if (!db) {
      queueMicrotask(() => setMessage("Firebase 설정이 없어 API 연동 로그를 표시할 수 없습니다."));
      return () => undefined;
    }

    unsubscribe = onSnapshot(
      query(collection(db, "integration_call_logs")),
      (snapshot) => {
        setLogs(
          snapshot.docs
            .map((doc) => mapLog(doc.id, doc.data()))
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .slice(0, 100),
        );
        setMessage("API 인증, 호출, webhook 발신 로그를 실시간으로 모니터링 중입니다.");
      },
      (error) => setMessage(`API 연동 로그 구독 실패: ${error.message}`),
    );

    return () => unsubscribe();
  }, []);

  const metrics = useMemo(() => {
    const failures = logs.filter((log) => log.status === "failed" || log.status === "rejected");
    const webhookFailures = failures.filter((log) => log.endpoint === "webhook-delivery");
    const latencyLogs = logs.filter((log) => log.latencyMs > 0);
    const avgLatency = latencyLogs.length
      ? Math.round(latencyLogs.reduce((sum, log) => sum + log.latencyMs, 0) / latencyLogs.length)
      : 0;

    return {
      total: logs.length,
      failures: failures.length,
      webhookFailures: webhookFailures.length,
      avgLatency,
    };
  }, [logs]);

  const recentFailures = logs.filter((log) => log.status === "failed" || log.status === "rejected").slice(0, 8);

  return (
    <section className="grid gap-4">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-blue-700">API 모니터링</p>
            <h2 className="mt-1 text-lg font-normal text-slate-950">API 연동 로그 모니터링</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-normal text-slate-700 ring-1 ring-slate-200">
            최근 {logs.length}건
          </span>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard metric={{ label: "최근 호출", value: `${metrics.total}건`, helper: "최근 수집된 연동 API 로그", tone: "blue" }} />
        <StatCard metric={{ label: "실패/거절", value: `${metrics.failures}건`, helper: "인증 거절 또는 처리 실패", tone: metrics.failures ? "red" : "green" }} />
        <StatCard metric={{ label: "Webhook 실패", value: `${metrics.webhookFailures}건`, helper: "외부사 발신 실패 건수", tone: metrics.webhookFailures ? "red" : "green" }} />
        <StatCard metric={{ label: "평균 응답", value: `${metrics.avgLatency}ms`, helper: "인증부터 응답 직전까지", tone: metrics.avgLatency > 1500 ? "amber" : "green" }} />
      </section>

      <DataTable
        columns={["시간", "기업", "트랙", "Endpoint", "결과", "HTTP", "Scope", "Latency", "오류"]}
        rows={logs.slice(0, 20).map((log) => ({
          id: log.id,
          cells: [
            formatDateTime(log.createdAt),
            log.companyId,
            log.platformType,
            <span key="endpoint" className="font-normal text-slate-950">{log.endpoint}</span>,
            <span key="status" className={`rounded-full px-2 py-1 text-xs font-normal ring-1 ${statusTone(log.status)}`}>{statusLabel(log.status)}</span>,
            log.httpStatus || "-",
            log.requiredScope,
            log.latencyMs ? `${log.latencyMs}ms` : "-",
            log.errorCode || log.message || "-",
          ],
        }))}
        emptyMessage="아직 API 연동 호출 로그가 없습니다."
      />

      <DataTable
        columns={["시간", "기업", "Endpoint", "Request ID", "주문/이벤트", "IP", "메시지"]}
        rows={recentFailures.map((log) => ({
          id: `failure-${log.id}`,
          cells: [
            formatDateTime(log.createdAt),
            log.companyId,
            log.endpoint,
            log.requestId || "-",
            log.orderNo || log.eventId || "-",
            log.remoteIp || "-",
            log.errorCode || log.message || "-",
          ],
        }))}
        emptyMessage="최근 실패 로그가 없습니다."
      />
    </section>
  );
}
