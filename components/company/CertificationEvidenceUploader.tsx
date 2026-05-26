const evidenceSlots = [
  { label: "사업자등록증", path: "company-documents/{company_id}/business-registration" },
  { label: "통장 사본", path: "company-documents/{company_id}/settlement-bankbook" },
  { label: "KC 인증서", path: "product-certifications/{company_id}/{product_id}/kc" },
  { label: "시험성적서", path: "product-certifications/{company_id}/{product_id}/test-report" },
  { label: "상표/수입 증빙", path: "product-certifications/{company_id}/{product_id}/brand-import" },
  { label: "상품 상세 이미지/GIF/영상", path: "product-media/{company_id}/{product_id}/detail-assets" },
];

export function CertificationEvidenceUploader() {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-purple-600">storage beta</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">인증/서류 업로드 mock</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Firebase Storage 경로와 증빙 상태만 준비합니다. 실제 uploadBytes, 바이러스 검사, 파일 보관 정책은 별도 승인 후 연결합니다.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200">실제 업로드 차단</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {evidenceSlots.map((slot) => (
          <div key={slot.label} className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="font-bold text-slate-900">{slot.label}</p>
            <p className="mt-2 break-words text-xs leading-5 text-slate-500">예정 경로: storage/{slot.path}</p>
            <p className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">mock uploaded</p>
          </div>
        ))}
      </div>
    </section>
  );
}
