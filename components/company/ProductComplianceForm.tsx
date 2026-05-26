export function ProductComplianceForm() {
  const checks = [
    "금지상품 아님 확인",
    "인증 대상 여부 확인",
    "KC 인증번호 또는 비대상 사유 입력",
    "품질보증/A/S 책임자 입력",
    "관리자 승인 전 판매 불가 동의",
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-emerald-600">product compliance</p>
      <h2 className="mt-1 text-lg font-black text-slate-950">상품 등록 준수사항</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {checks.map((check) => (
          <label key={check} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800">
            <input type="checkbox" disabled />
            {check}
          </label>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        금지상품 또는 인증 미완료 상태에서는 승인 요청 버튼이 비활성화되어야 합니다. 실제 법률 판단은 전문가 검토 blocker로 남깁니다.
      </div>
    </section>
  );
}
