import { worktreePorts } from "@/data/my-app/statusMock";

const mergeChecks = [
  ".env 또는 비밀 파일이 생성되지 않았는지 확인",
  "승인 없는 Firebase SDK import가 추가되지 않았는지 확인",
  "firebase.json, .firebaserc, firestore.rules, storage.rules 생성 여부 확인",
  "실제 PG 승인, 환불, 정산, 입금 코드가 없는지 확인",
  "알림톡, 배송조회, 외부 재고 실 API 호출이 없는지 확인",
  "보고서가 트랙별 폴더에 있고 루트 공용 보고서를 덮어쓰지 않았는지 확인",
  "검토 후 린트와 빌드를 수동 실행",
  "스테이징 전 브라우저 화면 점검 완료",
];

const mergeOrder = [
  "firebase-contract",
  "qa",
  "admin",
  "company",
  "nursery",
  "tablet-qr",
  "my-app",
];

export function MergeHandoffBoard() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-md bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">병합 인수인계</p>
          <h1 className="mt-3 text-4xl font-black">작업 폴더 병합 검토 보드</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            병렬 작업 폴더 결과를 기준 브랜치에 합치기 전 눈으로 검토하는 보드입니다.
            이 화면은 git 도구가 아니며 병합, 푸시, 빌드, 린트, 배포, Firebase, PG 명령을 실행하지 않습니다.
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">권장 순서</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">병합 검토 순서</h2>
            <ol className="mt-4 grid gap-2">
              {mergeOrder.map((track, index) => (
                <li key={track} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <span className="font-black text-slate-950">{track}</span>
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                    {index + 1}
                  </span>
                </li>
              ))}
            </ol>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">병합 전 확인</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">검토 전 병합 금지</h2>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {mergeChecks.map((check) => (
                <p key={check} className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  {check}
                </p>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">포트 안내</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">병렬 브라우저 검토 대상</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {worktreePorts.map((item) => (
              <article key={item.id} className="rounded-md bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{item.folder}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">{item.track}</h3>
                  </div>
                  <span className="rounded-md bg-slate-950 px-3 py-2 text-sm font-black text-white">
                    :{item.port}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.purpose}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
