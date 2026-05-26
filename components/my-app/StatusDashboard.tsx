import Link from "next/link";
import {
  blockedItems,
  completedItems,
  generatedFileGroups,
  generatedScreens,
  humanChecks,
  integrationStatuses,
  nextTasks,
  progressEvents,
  route404Statuses,
  smokeRoutes,
  stateCoverage,
  statusDashboard,
  statusMetrics,
  worktreeRouteStatuses,
  worktreePorts,
  type StatusListItem,
  type StatusMetric,
  type StatusTone,
} from "@/data/my-app/statusMock";

const toneClasses: Record<StatusTone, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-950",
  progress: "border-blue-200 bg-blue-50 text-blue-950",
  blocked: "border-red-200 bg-red-50 text-red-950",
  mock: "border-violet-200 bg-violet-50 text-violet-950",
};

const badgeClasses: Record<StatusTone, string> = {
  complete: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  progress: "bg-blue-100 text-blue-800 ring-blue-200",
  blocked: "bg-red-100 text-red-800 ring-red-200",
  mock: "bg-violet-100 text-violet-800 ring-violet-200",
};

const toneLabels: Record<StatusTone, string> = {
  complete: "완료",
  progress: "진행 중",
  blocked: "차단",
  mock: "모의",
};

const smokeStatusLabels: Record<string, string> = {
  preview_ready: "미리보기 가능",
  manual_pending: "수동 확인 대기",
  blocked: "차단",
};

const routeStateLabels: Record<string, string> = {
  ready_for_manual_smoke: "수동 화면 확인 가능",
  not_started_locally: "로컬 미실행",
  blocked: "차단",
};

const route404Labels: Record<string, string> = {
  unknown: "미확인",
  was_404: "이전 404",
  not_checked: "아직 미확인",
  expected_200: "정상 예상",
  manual_pending: "수동 확인 대기",
  blocked: "차단",
};

const integrationStateLabels: Record<string, string> = {
  connected_beta: "베타 연결됨",
  deployed_mock: "모의 배포됨",
  mock_only: "모의 전용",
  blocker: "차단",
  held: "보류",
};

function ToneBadge({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${badgeClasses[tone]}`}>
      {label}
    </span>
  );
}

function MetricCard({ metric }: { metric: StatusMetric }) {
  return (
    <article className={`rounded-md border p-4 ${toneClasses[metric.tone]}`}>
      <p className="text-sm font-bold text-slate-600">{metric.label}</p>
      <p className="mt-2 text-4xl font-black">{metric.value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{metric.helper}</p>
    </article>
  );
}

function StatusList({ title, subtitle, items }: { title: string; subtitle: string; items: StatusListItem[] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{subtitle}</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
          {items.length}개
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
              <ToneBadge tone={item.tone} label={toneLabels[item.tone]} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RouteMap() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">브라우저 화면 점검</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">경로 지도</h2>
        </div>
        <ToneBadge tone="mock" label="수동 확인 필요" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3">경로</th>
              <th className="px-3 py-3">목적</th>
              <th className="px-3 py-3">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {smokeRoutes.map((route) => (
              <tr key={route.id} className="align-top">
                <td className="px-3 py-3">
                  <Link href={route.route} className="font-black text-slate-950 underline-offset-4 hover:underline">
                    {route.route}
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-600">{route.purpose}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {smokeStatusLabels[route.status] ?? route.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StateCoverageGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">상태 커버리지</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">빈 상태 / 로딩 / 오류 / 위험</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {stateCoverage.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-slate-950">{item.label}</h3>
              <ToneBadge tone={item.covered ? "complete" : "blocked"} label={item.covered ? "반영됨" : "공백"} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function IntegrationStatusGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">실연동 상태</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">파이어베이스 베타 연결 / 운영 게이트 통제</h2>
        </div>
        <ToneBadge tone="progress" label="PG 키 대기" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {integrationStatuses.map((item) => (
          <article key={item.id} className={`rounded-md border p-4 ${toneClasses[item.tone]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{item.name}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  {integrationStateLabels[item.state] ?? item.state}
                </p>
              </div>
              <ToneBadge tone={item.tone} label={toneLabels[item.tone]} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{item.summary}</p>
            <p className="mt-3 rounded-md bg-white/70 p-3 text-xs font-semibold leading-5 text-slate-700">
              실운영 전 필요: {item.requiredBeforeLive}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FileGroupGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">생성 파일 그룹</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">이 작업 폴더에서 생성된 내용</h2>
        </div>
        <ToneBadge tone="mock" label="정적 집계" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {generatedFileGroups.map((group) => (
          <article key={group.id} className={`rounded-md border p-4 ${toneClasses[group.tone]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">{group.label}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">{group.path}</p>
              </div>
              <span className="rounded-md bg-white px-2.5 py-1 text-xl font-black ring-1 ring-black/5">
                {group.count}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{group.purpose}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorktreePortGuide() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">병렬 작업 폴더 포트</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">브라우저 수동 확인 안내</h2>
        </div>
        <ToneBadge tone="progress" label="수동 실행" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {worktreePorts.map((item) => (
          <article key={item.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{item.folder}</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{item.track}</h3>
              </div>
              <span className="rounded-md bg-slate-950 px-3 py-2 text-sm font-black text-white">
                :{item.port}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.purpose}</p>
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-700">
              http://localhost:{item.port}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorktreeRouteStatusGrid() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">전체 작업 폴더 경로 상태</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">트랙별 브라우저 확인 대상</h2>
        </div>
        <ToneBadge tone="progress" label="수동 화면 점검 대기" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {worktreeRouteStatuses.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  localhost:{item.port}
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{item.track}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.note}</p>
              </div>
              <span className="rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
                {routeStateLabels[item.routeState] ?? item.routeState}
              </span>
            </div>
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-black text-slate-950">
              상태 경로: {item.statusRoute}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.keyRoutes.map((route) => (
                <span key={route} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                  {route}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Route404Matrix() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">404 상태 기록</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">경로별 404 기록</h2>
        </div>
        <ToneBadge tone="mock" label="정적 기록" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-3">경로</th>
              <th className="px-3 py-3">이전 상태</th>
              <th className="px-3 py-3">현재 상태</th>
              <th className="px-3 py-3">근거</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {route404Statuses.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-3 py-3 font-black text-slate-950">{item.route}</td>
                <td className="px-3 py-3 text-slate-600">{route404Labels[item.previousState] ?? item.previousState}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {route404Labels[item.currentState] ?? item.currentState}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600">{item.evidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProgressTimeline() {
  const stateTone: Record<(typeof progressEvents)[number]["state"], StatusTone> = {
    completed: "complete",
    deferred: "progress",
    blocked: "blocked",
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">진행 타임라인</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">이 작업 폴더에서 진행된 일</h2>
      </div>
      <ol className="mt-4 grid gap-3">
        {progressEvents.map((event, index) => (
          <li key={event.id} className="rounded-md bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">작업 배치 {index + 1}</p>
                <h3 className="mt-1 font-black text-slate-950">{event.label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{event.detail}</p>
              </div>
              <ToneBadge tone={stateTone[event.state]} label={event.state === "completed" ? "완료" : event.state === "deferred" ? "보류" : "차단"} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StatusDashboard() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-5 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="overflow-hidden rounded-md bg-slate-950 text-white">
          <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">
                로컬 작업 폴더 상태 대시보드
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
                {statusDashboard.track} 베타 진행 상태
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">
                {statusDashboard.liveWarning} 이 화면은 브라우저 검토용 상태 데이터이며, 민감한 실시간 데이터를 조회하지 않습니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ToneBadge tone="mock" label={statusDashboard.mode} />
                <ToneBadge tone="blocked" label="운영 배포 아님" />
                <ToneBadge tone="blocked" label="실결제 없음" />
                <ToneBadge tone="complete" label="파이어베이스 베타 연결" />
              </div>
            </div>
            <aside className="rounded-md bg-white p-4 text-slate-950">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">경로</p>
              <p className="mt-1 text-2xl font-black">{statusDashboard.route}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${statusDashboard.progressPercent}%` }} />
              </div>
              <p className="mt-2 text-sm font-bold text-slate-600">{statusDashboard.progressPercent}% 미리보기 준비</p>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">주요 파일</dt>
                  <dd className="font-black">{statusDashboard.generatedMajorFileCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">경로</dt>
                  <dd className="font-black">{statusDashboard.generatedRouteCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">컴포넌트</dt>
                  <dd className="font-black">{statusDashboard.generatedComponentCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">데이터/타입</dt>
                  <dd className="font-black">{statusDashboard.generatedDataAndTypeCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">보고서</dt>
                  <dd className="font-black">{statusDashboard.reportCount}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statusMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </section>

        <FileGroupGrid />

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <StatusList title="생성된 화면" subtitle="경로 목록" items={generatedScreens} />
          <StatusList title="완료된 베타 항목" subtitle="완료" items={completedItems} />
        </section>

        <IntegrationStatusGrid />

        <WorktreePortGuide />

        <WorktreeRouteStatusGrid />

        <Route404Matrix />

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <StatusList title="차단된 실연동" subtitle="차단 항목" items={blockedItems} />
          <StatusList title="다음 작업" subtitle="우선순위 10개" items={nextTasks} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <StatusList title="사람 확인 필요" subtitle="수동 검토" items={humanChecks} />
          <RouteMap />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <StateCoverageGrid />
          <ProgressTimeline />
        </section>
      </div>
    </main>
  );
}
