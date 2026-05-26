"use client";

import { useMemo, useState } from "react";
import {
  certificationChecklist,
  evaluateComplianceGate,
  productNoticeFields,
  restrictedProductItems,
  sampleComplianceState,
} from "@/data/legalCompliance";
import type { CertificationType, ProductComplianceState } from "@/types/compliance";

const certificationOptions: { value: CertificationType; label: string }[] = [
  { value: "safety_certification", label: "안전인증" },
  { value: "safety_confirmation", label: "안전확인" },
  { value: "supplier_conformity", label: "공급자적합성확인" },
  { value: "not_applicable", label: "대상 아님" },
];

export function ProductComplianceForm() {
  const [state, setState] = useState<ProductComplianceState>(sampleComplianceState);
  const gate = useMemo(() => evaluateComplianceGate(state), [state]);

  function toggleRestricted(itemId: string) {
    setState((current) => {
      const exists = current.selectedRestrictedItemIds.includes(itemId);
      return {
        ...current,
        selectedRestrictedItemIds: exists
          ? current.selectedRestrictedItemIds.filter((id) => id !== itemId)
          : [...current.selectedRestrictedItemIds, itemId],
      };
    });
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-600">product compliance</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">상품 등록 준수사항</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            금지상품, KC 인증 대상 여부, KC 인증번호, 증빙 업로드 mock, 법적 고지 입력 완료 여부를 승인 요청 전에 점검합니다.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${gate.approvalRequestEnabled ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
          {gate.approvalRequestEnabled ? "승인 요청 버튼 활성" : "승인 요청 버튼 비활성"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-md border border-red-200 bg-red-50 p-3">
          <h3 className="font-black text-red-950">금지상품 체크리스트</h3>
          <p className="mt-1 text-xs leading-5 text-red-800">하나라도 선택되면 승인 요청이 비활성화됩니다.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {restrictedProductItems.map((item) => (
              <label key={item.id} className="flex gap-2 rounded-md bg-white p-3 text-sm text-red-950">
                <input
                  type="checkbox"
                  checked={state.selectedRestrictedItemIds.includes(item.id)}
                  onChange={() => toggleRestricted(item.id)}
                  className="mt-1"
                />
                <span>
                  <strong>{item.title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-red-700">{item.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <h3 className="font-black text-amber-950">KC 인증 / 증빙 조건</h3>
          <div className="mt-3 grid gap-3">
            <label className="flex items-center gap-2 rounded-md bg-white p-3 text-sm font-bold text-slate-800">
              <input
                type="checkbox"
                checked={state.certification.kcTarget}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    certification: { ...current.certification, kcTarget: event.target.checked },
                  }))
                }
              />
              KC 인증 대상 여부
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-800">
              KC 인증번호
              <input
                value={state.certification.kcNumber ?? ""}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    certification: { ...current.certification, kcNumber: event.target.value },
                  }))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-normal"
                placeholder="KC 인증번호 또는 신고/확인번호"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-800">
              인증 구분
              <select
                value={state.certification.certificationType}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    certification: { ...current.certification, certificationType: event.target.value as CertificationType },
                  }))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-normal"
              >
                {certificationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-md bg-white p-3 text-sm font-bold text-slate-800">
              <input
                type="checkbox"
                checked={state.certification.evidenceUploaded}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    certification: { ...current.certification, evidenceUploaded: event.target.checked },
                  }))
                }
              />
              인증서류 업로드 mock 완료
            </label>
          </div>
          <div className="mt-3 grid gap-2">
            {certificationChecklist.map((item) => (
              <div key={item.id} className="rounded-md bg-white p-3 text-xs leading-5 text-slate-600">
                <strong className="block text-sm text-slate-950">{item.title}</strong>
                {item.description}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
        <h3 className="font-black text-blue-950">상품 고시 입력 mock</h3>
        <p className="mt-1 text-xs leading-5 text-blue-800">상품명, 모델명, 제조사/수입사, 제조국, 제조연월/사용기한, 품질보증, A/S 연락처를 승인 요청 전 고정합니다.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {productNoticeFields.map((field) => (
            <label key={field.id} className="grid gap-2 text-sm font-bold text-slate-800">
              <span>
                {field.label}
                {field.required ? <span className="ml-1 text-red-600">*</span> : null}
              </span>
              <input
                readOnly
                value="상품 상세 고시 입력값 mock"
                className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm font-normal text-slate-700"
              />
              <span className="text-xs font-normal leading-5 text-blue-700">{field.helper}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <section className="rounded-md bg-slate-50 p-3">
          <h3 className="font-black text-slate-950">필수 완료 체크</h3>
          <div className="mt-3 grid gap-2">
            {[
              ["sellerDisclosureCompleted", "판매자 정보 입력 완료"],
              ["productNoticeCompleted", "상품 고시 입력 완료"],
              ["returnPolicyCompleted", "반품/교환/AS/배송 고지 완료"],
              ["prohibitedProductConfirmed", "금지상품 아님 확인"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-md bg-white p-3 text-sm font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={Boolean(state[key as keyof ProductComplianceState])}
                  onChange={(event) => setState((current) => ({ ...current, [key]: event.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <h3 className="font-black text-slate-950">승인 요청 gate</h3>
          <div className="mt-3 grid gap-2">
            {gate.blockers.length > 0 ? (
              gate.blockers.map((blocker) => (
                <p key={blocker} className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-800">
                  {blocker}
                </p>
              ))
            ) : (
              <p className="rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">승인 요청 가능 조건을 충족했습니다.</p>
            )}
            {gate.warnings.map((warning) => (
              <p key={warning} className="rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-800">
                {warning}
              </p>
            ))}
          </div>
          <button
            type="button"
            disabled={!gate.approvalRequestEnabled}
            className="mt-3 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            관리자 승인 요청 mock
          </button>
        </section>
      </div>
    </section>
  );
}
