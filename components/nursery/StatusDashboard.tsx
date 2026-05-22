import type { ReactNode } from "react";

import { NurseryRoutePreviewGrid } from "@/components/nursery/NurseryRoutePreviewGrid";
import {
  nurseryStatusSummary,
  statusBlockerCards,
  statusCompletedItems,
  statusConnectionBlockers,
  statusDesignHighlights,
  statusFulfillmentEventGroups,
  statusHumanReviewItems,
  statusInProgressItems,
  statusMajorScreens,
  statusMockContext,
  statusMockDataSnapshot,
  statusNextTasks,
  statusProgressCards,
  statusQrSessionStateCards,
  statusSmokeRoutes,
  statusStateCoverage,
  statusVisualStateMatrix,
} from "@/data/nursery/statusMock";

const stateClasses: Record<string, string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-950",
  progress: "border-blue-200 bg-blue-50 text-blue-950",
  blocked: "border-red-200 bg-red-50 text-red-950",
  neutral: "border-slate-200 bg-white text-slate-950",
};

const toneClasses: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  red: "bg-red-100 text-red-800 ring-red-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
};

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {eyebrow}
        </span>
      </div>
      {children}
    </section>
  );
}

function ProgressCard({
  card,
}: {
  card: {
    id: string;
    label: string;
    value: string;
    helper: string;
    state: string;
  };
}) {
  return (
    <article className={`rounded-md border p-4 ${stateClasses[card.state] ?? stateClasses.neutral}`}>
      <p className="text-sm font-semibold text-slate-600">{card.label}</p>
      <p className="mt-2 text-2xl font-bold">{card.value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{card.helper}</p>
    </article>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          {item}
        </span>
      ))}
    </div>
  );
}

export function StatusDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <header className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-600">
              Mock/Test Beta Status
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">
              Nursery Track Status Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              현재 트랙은 `{nurseryStatusSummary.track}`이며 route는 `{nurseryStatusSummary.statusRoute}`입니다.
              이 화면은 운영 오픈/실결제가 아닌 정적 mock/test 진행 상태 확인용입니다.
            </p>
            <div className="mt-4 h-3 max-w-xl overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${nurseryStatusSummary.progressPercent}%` }}
              />
            </div>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            {nurseryStatusSummary.warning}
          </div>
        </div>
      </header>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statusProgressCards.map((card) => (
          <ProgressCard key={card.id} card={card} />
        ))}
      </section>

      <section className="mt-4">
        <NurseryRoutePreviewGrid />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Section title="트랙 요약" eyebrow="current track">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">track</p>
              <p className="mt-1 text-lg font-bold">{nurseryStatusSummary.track}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">generated files</p>
              <p className="mt-1 text-lg font-bold">{nurseryStatusSummary.generatedMajorFileCount}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">progress</p>
              <p className="mt-1 text-lg font-bold">{nurseryStatusSummary.progressPercent}%</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">mode</p>
              <p className="mt-1 text-lg font-bold">{nurseryStatusSummary.mode}</p>
            </div>
          </div>
        </Section>

        <Section title="Mock Context" eyebrow="required scope">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">nursery_id</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-950">{statusMockContext.nurseryId}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">room_id</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-950">{statusMockContext.roomId}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">tablet_id</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-950">{statusMockContext.tabletId}</p>
            </div>
          </div>
        </Section>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Section title="Mock 데이터 스냅샷" eyebrow="local data only">
          <div className="grid gap-2">
            {statusMockDataSnapshot.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                <span className="text-sm font-bold text-slate-950">{item.value}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="QR 세션 상태" eyebrow="qr_payment_sessions">
          <div className="grid gap-2">
            {statusQrSessionStateCards.map((state) => (
              <article key={state.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClasses[state.tone] ?? toneClasses.neutral}`}>
                  {state.label}
                </span>
                <p className="mt-2 text-sm leading-6 text-slate-600">{state.helper}</p>
              </article>
            ))}
          </div>
        </Section>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Section title="수령/배송 이벤트 분기" eyebrow="pickup vs delivery">
          <div className="grid gap-3 md:grid-cols-2">
            {statusFulfillmentEventGroups.map((group) => (
              <article key={group.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-bold text-slate-950">{group.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{group.helper}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.states.map((state) => (
                    <span key={state} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {state}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Section>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Section title="실제 연결 상태" eyebrow="blocked integrations">
          <div className="grid gap-2">
            {statusConnectionBlockers.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900 ring-1 ring-slate-200">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="대시보드 표시 기준" eyebrow="visual rules">
          <ChipList items={statusDesignHighlights} />
        </Section>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Section title="완료 항목" eyebrow="done">
          <ChipList items={statusCompletedItems} />
        </Section>
        <Section title="진행중 항목" eyebrow="in progress">
          <ChipList items={statusInProgressItems} />
        </Section>
        <Section title="차단 항목" eyebrow="blockers">
          <ChipList items={statusBlockerCards} />
        </Section>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr]">
        <Section title="다음 작업 10개" eyebrow="next">
          <ol className="grid gap-2 text-sm text-slate-700">
            {statusNextTasks.map((task) => (
              <li key={task} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                {task}
              </li>
            ))}
          </ol>
        </Section>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Section title="생성된 주요 화면 목록" eyebrow="routes">
          <ChipList items={statusMajorScreens} />
        </Section>
        <Section title="사람 확인 필요" eyebrow="human review">
          <ChipList items={statusHumanReviewItems} />
        </Section>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Section title="브라우저 smoke route" eyebrow="manual smoke">
          <ChipList items={statusSmokeRoutes} />
        </Section>
        <Section title="상태 커버리지" eyebrow="state coverage">
          <div className="grid gap-2">
            {statusStateCoverage.map((state) => (
              <article key={state.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-bold text-slate-950">{state.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{state.coverage}</p>
              </article>
            ))}
          </div>
        </Section>
      </section>

      <section className="mt-4">
        <Section title="화면별 empty/loading/error/risk" eyebrow="visual state matrix">
          <div className="grid gap-3 lg:grid-cols-5">
            {statusVisualStateMatrix.map((row) => (
              <article key={row.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-bold text-slate-950">{row.screen}</p>
                <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
                  <p><strong className="text-slate-900">empty:</strong> {row.empty}</p>
                  <p><strong className="text-slate-900">loading:</strong> {row.loading}</p>
                  <p><strong className="text-slate-900">error:</strong> {row.error}</p>
                  <p><strong className="text-slate-900">risk:</strong> {row.risk}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>
      </section>
    </main>
  );
}
