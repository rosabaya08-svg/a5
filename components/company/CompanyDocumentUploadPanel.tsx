"use client";

import { useId, useState } from "react";
import { uploadCompanyDocument, type UploadedCompanyDocument } from "@/lib/company/documentUploadClient";
import type { CompanyDocumentType, CompanyOnboardingDocument } from "@/types/company";

export type CompanyDocumentUploadSlot = Pick<
  CompanyOnboardingDocument,
  "id" | "type" | "label" | "description" | "required" | "accept"
>;

type SlotState = {
  file?: File;
  upload?: UploadedCompanyDocument;
  status: "idle" | "ready" | "uploading" | "uploaded" | "error";
  message: string;
};

type CompanyDocumentUploadPanelProps = {
  companyId: string;
  companyName?: string;
  title: string;
  description: string;
  documents: CompanyDocumentUploadSlot[];
  productId?: string;
  productName?: string;
  destinationEmail?: string;
  deliveryMode?: "gmail" | "firebase_only";
};

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
  if (size >= 1024) return `${Math.round(size / 1024)}KB`;
  return `${size}B`;
}

function statusText(state: SlotState | undefined, sendsToGmail: boolean) {
  if (!state || state.status === "idle") return "파일 대기";
  if (state.status === "ready") return "업로드 준비";
  if (state.status === "uploading") return "업로드 중";
  if (state.status === "uploaded") return sendsToGmail ? "Gmail 큐 등록" : "Firebase 등록";
  return "업로드 확인 필요";
}

function statusTone(state?: SlotState) {
  if (state?.status === "uploaded") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (state?.status === "error") return "bg-red-50 text-red-800 ring-red-200";
  if (state?.status === "uploading") return "bg-blue-50 text-blue-800 ring-blue-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function CompanyDocumentUploadPanel({
  companyId,
  companyName,
  title,
  description,
  documents,
  productId,
  productName,
  destinationEmail,
  deliveryMode = "firebase_only",
}: CompanyDocumentUploadPanelProps) {
  const inputPrefix = useId();
  const [slotStates, setSlotStates] = useState<Record<string, SlotState>>({});
  const sendsToGmail = deliveryMode === "gmail";

  function updateSlot(id: string, patch: Partial<SlotState>) {
    setSlotStates((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { status: "idle", message: "" }), ...patch },
    }));
  }

  async function uploadSlot(slot: CompanyDocumentUploadSlot) {
    const current = slotStates[slot.id];
    if (!current?.file) {
      updateSlot(slot.id, { status: "error", message: "먼저 파일을 선택해 주세요." });
      return;
    }

    updateSlot(slot.id, { status: "uploading", message: "Storage 업로드와 A1 수신함 등록을 진행 중입니다." });

    try {
      const upload = await uploadCompanyDocument({
        companyId,
        companyName,
        documentType: slot.type as CompanyDocumentType,
        documentLabel: slot.label,
        file: current.file,
        productId,
        productName,
        destinationEmail,
        sendToGmail: sendsToGmail,
        createA1Inbox: sendsToGmail,
      });

      updateSlot(slot.id, {
        upload,
        status: "uploaded",
        message: sendsToGmail
          ? "Firebase Storage 저장, A1 수신함 기록, Gmail 전송 큐 등록이 완료되었습니다."
          : "Firebase Storage 저장과 Firestore 파일 기록이 완료되었습니다.",
      });
    } catch (error) {
      updateSlot(slot.id, {
        status: "error",
        message: error instanceof Error ? error.message : "업로드에 실패했습니다.",
      });
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">live file intake</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
          실제 업로드 활성
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((slot) => {
          const state = slotStates[slot.id];
          const inputId = `${inputPrefix}-${slot.id}`;

          return (
            <div key={slot.id} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">
                    {slot.label}
                    {slot.required ? <span className="ml-1 text-red-600">*</span> : null}
                  </p>
                  {slot.description ? <p className="mt-1 text-xs leading-5 text-slate-500">{slot.description}</p> : null}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusTone(state)}`}>
                  {statusText(state, sendsToGmail)}
                </span>
              </div>

              <label
                htmlFor={inputId}
                className="grid min-h-24 cursor-pointer place-items-center rounded-md border border-dashed border-slate-300 bg-white px-3 text-center text-xs font-bold leading-5 text-slate-500"
              >
                {state?.file ? `${state.file.name} · ${formatFileSize(state.file.size)}` : "파일 선택"}
              </label>
              <input
                id={inputId}
                type="file"
                className="hidden"
                accept={slot.accept ?? "image/*,.pdf,.doc,.docx,.xls,.xlsx"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  updateSlot(slot.id, {
                    file,
                    upload: undefined,
                    status: file ? "ready" : "idle",
                    message: file
                      ? sendsToGmail
                        ? "업로드 버튼을 누르면 A1 수신함과 Gmail 큐까지 등록됩니다."
                        : "업로드 버튼을 누르면 Firebase Storage와 Firestore에 등록됩니다."
                      : "",
                  });
                }}
              />

              <button
                type="button"
                onClick={() => uploadSlot(slot)}
                disabled={state?.status === "uploading" || !state?.file}
                className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                업로드
              </button>

              {state?.message ? (
                <p className={`rounded-md p-3 text-xs font-bold leading-5 ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-white text-slate-600"}`}>
                  {state.message}
                </p>
              ) : null}

              {state?.upload ? (
                <div className="grid gap-1 rounded-md bg-white p-3 text-xs font-bold text-slate-600">
                  <p className="break-all">Storage: {state.upload.storagePath}</p>
                  <p>{sendsToGmail ? "A1: queued / Gmail: queued" : "Firebase only / Gmail: not requested"}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-900">
        {sendsToGmail
          ? "업로드된 기업 서류는 Firebase Storage에 저장된 뒤 `company_documents`, `a1_company_document_inbox`, `gmail_delivery_queue`에 기록되고 Gmail 발송 대상으로 넘어갑니다."
          : "업로드된 제품 자료는 Firebase Storage에 저장되고 `company_documents`에만 기록됩니다. Gmail 발송 큐에는 넣지 않습니다."}
      </p>
    </section>
  );
}
