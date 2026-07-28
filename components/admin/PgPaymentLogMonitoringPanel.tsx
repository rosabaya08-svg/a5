"use client";

import { useEffect, useMemo, useState } from "react";
import { getFirebaseAdminAuthClient } from "@/lib/firebase/client";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type PgLogSeverity = "info" | "warning" | "error";
type PgLogSource = "live" | "sample";

type PgPaymentLog = {
  id: string;
  source: PgLogSource;
  collection: string;
  documentId: string;
  functionName: string;
  step: string;
  severity: PgLogSeverity;
  statusLabel: string;
  title: string;
  summary: string;
  operatorAction: string;
  customerMessage: string;
  developerHint: string;
  createdAt: string;
  orderNo?: string;
  paymentIntentId?: string;
  transactionId?: string;
  amount?: number;
  provider?: string;
  companyId?: string;
  customerMasked?: string;
  technicalRefs: Record<string, string>;
};

type LogMonitorResponse = {
  ok?: boolean;
  logs?: PgPaymentLog[];
  message?: string;
  error?: {
    message?: string;
  };
};

const sampleLogs: PgPaymentLog[] = [
  {
    id: "sample-return-1004",
    source: "sample",
    collection: "payment_return_traces",
    documentId: "return-pi_TEST1004",
    functionName: "paymentsReturnTrace",
    step: "PG 복귀값 수신",
    severity: "warning",
    statusLabel: "거래번호 확인 필요",
    title: "인피니 결제창에서 돌아왔지만 TID가 부족함",
    summary: "고객 브라우저가 인피니 결제창에서 A5로 돌아온 기록은 있지만 승인 거래번호가 없어 거래조회 보강이 필요합니다.",
    operatorAction: "인피니 관리자에서 주문번호(MOID) 또는 시간대로 승인 여부를 확인하고, 승인 건이면 주문 상태가 결제완료로 바뀌었는지 확인하세요.",
    customerMessage: "결제 결과 확인이 지연되고 있습니다. 중복 결제하지 말고 잠시 후 주문조회를 확인해 주세요.",
    developerHint: "Return URL 파라미터에 TID가 없으면 paymentsSyncInnopaySms에서 MOID 기준 거래조회를 먼저 수행해야 합니다.",
    createdAt: "2026-06-03T09:04:00.000Z",
    orderNo: "A5-TEST-1004",
    paymentIntentId: "pi_TEST1004",
    amount: 1004,
    provider: "infiny",
    companyId: "company-7592901311",
    customerMasked: "010-****-1004",
    technicalRefs: {
      traceId: "return-pi_TEST1004",
      qrSessionId: "qr-TEST1004",
      shortCode: "TEST1004",
    },
  },
  {
    id: "sample-payment-approved",
    source: "sample",
    collection: "payments",
    documentId: "pi_TEST1004",
    functionName: "paymentsConfirm",
    step: "결제 장부",
    severity: "info",
    statusLabel: "결제완료",
    title: "A5 결제 장부가 결제완료로 확정됨",
    summary: "서버 금액 검증, 주문 생성, 결제 장부 기록, QR 결제완료 표시가 정상으로 이어진 상태입니다.",
    operatorAction: "폐쇄몰 주문조회와 기업 주문 목록에 같은 주문번호가 보이는지 확인하세요.",
    customerMessage: "결제가 완료되었습니다. 주문조회에서 주문번호와 상품 정보를 확인해 주세요.",
    developerHint: "paymentsConfirm이 orders, order_items, payments, qr_sessions를 같은 흐름으로 확정해야 합니다.",
    createdAt: "2026-06-03T09:05:30.000Z",
    orderNo: "A5-TEST-1004",
    paymentIntentId: "pi_TEST1004",
    transactionId: "INNOPAY-TID-TEST1004",
    amount: 1004,
    provider: "infiny",
    companyId: "company-7592901311",
    customerMasked: "010-****-1004",
    technicalRefs: {
      status: "approved",
      qrSessionId: "qr-TEST1004",
    },
  },
  {
    id: "sample-webhook-secret",
    source: "sample",
    collection: "webhook_events",
    documentId: "evt-webhook-missing-secret",
    functionName: "paymentsWebhook",
    step: "PG 웹훅 수신",
    severity: "warning",
    statusLabel: "서명 확인 필요",
    title: "PG 서버 통보 서명 검증 설정이 부족함",
    summary: "웹훅은 들어왔지만 운영 secret 또는 서명 헤더 설정이 맞지 않아 신뢰 검증이 완료되지 않았습니다.",
    operatorAction: "인피니 통보 URL과 A5 webhook secret 설정이 일치하는지 확인하고, 검증 전에는 수동으로 주문을 완료 처리하지 마세요.",
    customerMessage: "결제 결과 확인이 지연되고 있습니다. 고객센터 확인 후 안내드리겠습니다.",
    developerHint: "x-pg-signature, PG_WEBHOOK_SECRET, 인피니 Noti URL 응답 규격을 같이 확인해야 합니다.",
    createdAt: "2026-06-03T09:06:10.000Z",
    orderNo: "A5-TEST-1004",
    transactionId: "INNOPAY-TID-TEST1004",
    amount: 1004,
    provider: "infiny",
    technicalRefs: {
      eventId: "evt-webhook-missing-secret",
      signaturePresent: "true",
      signatureVerified: "false",
    },
  },
];

const severityClasses: Record<PgLogSeverity, string> = {
  info: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-100 text-amber-900 ring-amber-200",
  error: "bg-red-100 text-red-800 ring-red-200",
};

const detailClasses: Record<PgLogSeverity, string> = {
  info: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  error: "border-red-200 bg-red-50 text-red-950",
};

const rowClasses: Record<PgLogSeverity, string> = {
  info: "border-l-emerald-500",
  warning: "border-l-amber-500",
  error: "border-l-red-500",
};

const filters = ["전체", "정상", "확인 필요", "실패/차단", "PG 복귀", "웹훅", "결제 장부"];

function shouldShowSamplePgLogs() {
  const value = (process.env.NEXT_PUBLIC_A5_SHOW_SAMPLE_PG_LOGS ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

export function PgPaymentLogMonitoringPanel() {
  const endpoint = useMemo(() => getPaymentEndpointReadiness().endpoints.logMonitor, []);
  const showSampleLogs = useMemo(() => shouldShowSamplePgLogs(), []);
  const sampleFallbackLogs = useMemo(() => (showSampleLogs ? sampleLogs : []), [showSampleLogs]);
  const [logs, setLogs] = useState<PgPaymentLog[]>(() => sampleFallbackLogs);
  const [selectedId, setSelectedId] = useState(() => sampleFallbackLogs[0]?.id ?? "");
  const [activeFilter, setActiveFilter] = useState(filters[0]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(() => Boolean(endpoint));
  const [loadMessage, setLoadMessage] = useState(() =>
    endpoint
      ? "배포된 로그 모니터 함수에서 실제 PG 로그를 조회합니다."
      : "Functions base URL이 설정되지 않아 실제 PG 로그를 조회하지 못했습니다.",
  );
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!endpoint) {
      return;
    }

    const controller = new AbortController();

    getSuperAdminIdToken()
      .then((token) => {
        if (!token) {
          return {
            ok: false,
            message: "최고관리자 로그인 토큰이 없어 운영 예시 로그를 표시합니다.",
            logs: [],
          } satisfies LogMonitorResponse;
        }

        return fetch(`${endpoint}?limit=40`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }).then(async (response) => {
          const payload = (await response.json()) as LogMonitorResponse;
          if (!response.ok || payload.ok === false) {
            throw new Error(payload.error?.message || payload.message || "PG 로그 모니터 조회 실패");
          }
          return payload;
        });
      })
      .then((payload) => {
        const liveLogs = Array.isArray(payload.logs) ? payload.logs : [];
        if (liveLogs.length > 0) {
          setLogs(liveLogs.map((log) => ({ ...log, source: "live" as const })));
          setSelectedId(liveLogs[0]?.id ?? "");
          setIsLive(true);
          setLoadMessage(payload.message || "Firebase Functions에서 PG 로그를 조회했습니다.");
        } else {
          setLogs(sampleFallbackLogs);
          setSelectedId(sampleFallbackLogs[0]?.id ?? "");
          setIsLive(false);
          setLoadMessage(
            showSampleLogs
              ? "실제 PG 로그가 아직 없습니다. 아래는 운영자가 읽을 화면 구조를 보여주는 예시 로그입니다."
              : "실제 PG 로그가 아직 없습니다. 샘플 로그는 기본 숨김 상태입니다.",
          );
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLogs(sampleFallbackLogs);
        setSelectedId(sampleFallbackLogs[0]?.id ?? "");
        setIsLive(false);
        setLoadMessage(
          error instanceof Error
            ? `실시간 로그 조회 실패: ${error.message}`
            : showSampleLogs
              ? "실시간 로그 조회 실패. 운영 예시 로그를 표시합니다."
              : "실시간 로그 조회 실패. 샘플 로그는 기본 숨김 상태입니다.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [endpoint, sampleFallbackLogs, showSampleLogs]);

  const filteredLogs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return logs.filter((log) => {
      const filterMatched =
        activeFilter === "전체" ||
        (activeFilter === "정상" && log.severity === "info") ||
        (activeFilter === "확인 필요" && log.severity === "warning") ||
        (activeFilter === "실패/차단" && log.severity === "error") ||
        (activeFilter === "PG 복귀" && log.collection === "payment_return_traces") ||
        (activeFilter === "웹훅" && log.collection === "webhook_events") ||
        (activeFilter === "결제 장부" && log.collection === "payments");

      if (!filterMatched) return false;
      if (!keyword) return true;

      const haystack = [
        log.title,
        log.summary,
        log.orderNo,
        log.paymentIntentId,
        log.transactionId,
        log.companyId,
        log.customerMasked,
        log.functionName,
        log.collection,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [activeFilter, logs, searchText]);

  const selectedLog = logs.find((log) => log.id === selectedId) ?? filteredLogs[0] ?? logs[0];
  const stats = useMemo(() => {
    const liveCount = logs.filter((log) => log.source === "live").length;
    const warningCount = logs.filter((log) => log.severity === "warning").length;
    const errorCount = logs.filter((log) => log.severity === "error").length;
    const confirmedCount = logs.filter((log) => log.severity === "info").length;

    return { liveCount, warningCount, errorCount, confirmedCount };
  }, [logs]);

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-blue-700">PG 결제 로그 모니터링</p>
            <h2 className="mt-2 text-2xl font-normal text-slate-950">인피니 PG 결제 로그 모니터링</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              결제 준비, 인피니 결제창 복귀, 거래조회, 주문 확정, 웹훅 수신 로그를 운영자가 읽을 수 있는 문장으로 변환합니다.
              로그 한 건을 선택하면 오른쪽에서 현재 상황과 다음 조치를 바로 확인할 수 있습니다.
            </p>
          </div>
          <span className={`rounded-md px-3 py-1 text-xs font-normal ring-1 ${isLive ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-amber-100 text-amber-900 ring-amber-200"}`}>
            {isLive ? "실시간 로그 연결" : showSampleLogs ? "운영 예시 표시" : "운영 로그 대기"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Metric label="표시 로그" value={`${logs.length}건`} />
          <Metric label="정상 흐름" value={`${stats.confirmedCount}건`} tone="green" />
          <Metric label="확인 필요" value={`${stats.warningCount}건`} tone="amber" />
          <Metric label="실패/차단" value={`${stats.errorCount}건`} tone="red" />
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-normal leading-6 text-slate-700">
          {isLoading ? "PG 로그를 불러오는 중입니다." : loadMessage}
          {endpoint ? <span className="ml-2 text-xs text-slate-500">{endpoint}</span> : null}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-normal text-slate-950">로그 검색/필터</h2>
            <p className="mt-1 text-xs font-normal text-slate-500">주문번호, 결제의도 ID, TID, 고객 연락처 마스킹값, 함수명으로 찾습니다.</p>
          </div>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="예: A5-TEST-1004, pi_, TID, 7592901311"
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 md:w-[360px]"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-md border px-3 py-1.5 text-xs font-normal ${
                activeFilter === filter
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-normal text-slate-950">결제 로그 기록</h2>
            <p className="mt-1 text-sm font-normal text-slate-500">{filteredLogs.length}건 표시 중</p>
          </div>

          <div className="grid gap-2 p-3">
            {filteredLogs.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-normal text-slate-500">
                조건에 맞는 PG 결제 로그가 없습니다.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setSelectedId(log.id)}
                  className={`grid gap-3 rounded-md border border-l-4 bg-white p-4 text-left shadow-sm transition hover:border-slate-400 ${
                    rowClasses[log.severity]
                  } ${selectedLog?.id === log.id ? "ring-2 ring-blue-500" : ""}`}
                >
                  <div className="grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)_160px_120px] lg:items-center">
                    <div>
                      <p className="text-xs font-normal text-slate-500">{safeDateTime(log.createdAt)}</p>
                      <p className="mt-1 text-xs font-normal text-slate-400">{log.source === "live" ? "실제 로그" : "운영 예시"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-normal text-slate-950">{log.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{log.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <SmallCode>{log.collection}</SmallCode>
                        <SmallCode>{log.functionName}</SmallCode>
                        {log.orderNo ? <SmallCode>{log.orderNo}</SmallCode> : null}
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-normal ring-1 ${severityClasses[log.severity]}`}>
                        {log.statusLabel}
                      </span>
                      <p className="mt-2 text-xs font-normal text-slate-500">{log.step}</p>
                    </div>
                    <div className="text-sm font-normal text-slate-950">
                      {typeof log.amount === "number" ? formatCurrency(log.amount) : "-"}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {selectedLog ? (
        <aside className="rounded-md border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4 xl:self-start">
          <div className={`rounded-t-md border-b p-4 ${detailClasses[selectedLog.severity]}`}>
            <p className="text-xs font-normal tracking-[0.14em]">선택 로그 설명</p>
            <h2 className="mt-2 text-xl font-normal">{selectedLog.statusLabel}</h2>
            <p className="mt-2 text-sm leading-6">{selectedLog.title}</p>
          </div>

          <div className="grid gap-4 p-4">
            <DetailBlock title="지금 무슨 상황인가" body={selectedLog.summary} />
            <DetailBlock title="운영자가 지금 할 일" body={selectedLog.operatorAction} />
            <DetailBlock title="고객에게 안내할 말" body={selectedLog.customerMessage} />
            <DetailBlock title="개발자에게 전달할 문장" body={selectedLog.developerHint} />

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-normal text-slate-950">주요 식별값</h3>
              <div className="mt-3 grid gap-2 text-xs font-normal text-slate-600">
                <KeyValue label="주문번호" value={selectedLog.orderNo} />
                <KeyValue label="결제의도 ID" value={selectedLog.paymentIntentId} />
                <KeyValue label="PG 거래번호" value={selectedLog.transactionId} />
                <KeyValue label="입점사" value={selectedLog.companyId} />
                <KeyValue label="고객" value={selectedLog.customerMasked} />
                <KeyValue label="금액" value={typeof selectedLog.amount === "number" ? formatCurrency(selectedLog.amount) : undefined} />
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <h3 className="text-sm font-normal text-slate-950">기술 로그 위치</h3>
              <div className="mt-3 grid gap-2 text-xs font-normal text-slate-600">
                <KeyValue label="컬렉션" value={selectedLog.collection} />
                <KeyValue label="문서 ID" value={selectedLog.documentId} />
                <KeyValue label="함수" value={selectedLog.functionName} />
                {Object.entries(selectedLog.technicalRefs).map(([key, value]) => (
                  <KeyValue key={key} label={key} value={value} />
                ))}
              </div>
            </div>
          </div>
        </aside>
        ) : (
        <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
          <p className="text-xs font-normal tracking-[0.14em] text-slate-500">선택 로그 설명</p>
          <h2 className="mt-2 text-xl font-normal text-slate-950">선택된 로그 없음</h2>
          <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
            실제 PG 로그가 조회되면 이 영역에 운영자가 확인할 조치와 기술 식별값이 표시됩니다.
          </p>
        </aside>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "green" | "amber" | "red" }) {
  const toneClass = {
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
  }[tone];

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <p className="text-xs font-normal text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-normal">{value}</p>
    </div>
  );
}

function DetailBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h3 className="text-sm font-normal text-slate-950">{title}</h3>
      <p className="mt-2 text-sm font-normal leading-6 text-slate-600">{body}</p>
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-slate-100 bg-white px-3 py-2">
      <span className="text-[11px] font-normal text-slate-400">{label}</span>
      <span className="break-all text-slate-800">{value || "-"}</span>
    </div>
  );
}

function SmallCode({ children }: { children: string }) {
  return <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-normal text-slate-600">{children}</span>;
}

function safeDateTime(value: string) {
  try {
    return formatDateTime(value);
  } catch {
    return value;
  }
}

async function getSuperAdminIdToken() {
  const auth = getFirebaseAdminAuthClient();
  return auth?.currentUser ? auth.currentUser.getIdToken() : "";
}
