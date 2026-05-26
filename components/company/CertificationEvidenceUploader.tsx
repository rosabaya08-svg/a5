export function CertificationEvidenceUploader() {
  const slots = ["사업자등록증", "통장 사본", "KC 인증서", "시험성적서", "상표/수입 증빙", "상품 상세 이미지"];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-purple-600">storage beta</p>
      <h2 className="mt-1 text-lg font-black text-slate-950">인증/서류 업로드 mock</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Firebase Storage는 베타 업로드 경로만 준비합니다. 실제 uploadBytes 저장은 권한/용량/검수 정책 확정 후 연결합니다.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot) => (
          <div key={slot} className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="font-bold text-slate-900">{slot}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">업로드 위치: storage/company-documents/{slot}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
