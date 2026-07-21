"use client";

import { useMemo, useState } from "react";
import { ensureCompanyFirebaseAuthFromSession } from "@/lib/auth/companyFirebaseAuth";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";
import type { OrderItem } from "@/types/commerce";
import type { DeliveryStatus } from "@/types/status";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

const deliveryStatusOptions: Array<{ value: DeliveryStatus; label: string }> = [
  { value: "pickup_ready", label: "현장수령 준비" },
  { value: "picked_up", label: "현장수령 완료" },
  { value: "invoice_pending", label: "송장 대기" },
  { value: "invoice_entered", label: "송장 입력" },
  { value: "in_transit", label: "배송 중" },
  { value: "delivered", label: "배송 완료" },
];

function requiresInvoice(status: DeliveryStatus) {
  return status === "invoice_entered" || status === "in_transit" || status === "delivered";
}

function nextStatus(current: DeliveryStatus): DeliveryStatus {
  if (current === "pickup_ready") return "picked_up";
  if (current === "invoice_pending") return "invoice_entered";
  if (current === "invoice_entered") return "in_transit";
  return current;
}

export function CompanyDeliveryActionPanel({ companyId, item }: { companyId: string; item: OrderItem }) {
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(() => nextStatus(item.deliveryStatus));
  const [carrierCode, setCarrierCode] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const invoiceNeeded = useMemo(() => requiresInvoice(deliveryStatus), [deliveryStatus]);

  async function saveDeliveryStatus() {
    const url = getPaymentFunctionUrl("companyOrderDeliveryUpdate");
    if (!url) {
      setSaveState({ status: "error", message: "배송 상태를 저장할 수 없습니다. 잠시 후 다시 시도해 주세요." });
      return;
    }

    if (invoiceNeeded && (!carrierCode.trim() || !invoiceNumber.trim())) {
      setSaveState({ status: "error", message: "택배 처리는 택배사 코드와 송장번호가 필요합니다." });
      return;
    }

    setSaveState({ status: "saving", message: "배송 상태 저장 중입니다." });

    try {
      const user = await ensureCompanyFirebaseAuthFromSession();
      const token = await user?.getIdToken();
      if (!token) throw new Error("로그인 확인이 필요합니다. 다시 로그인해 주세요.");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          orderItemId: item.id,
          orderNo: item.orderId,
          deliveryStatus,
          carrierCode: carrierCode.trim(),
          invoiceNumber: invoiceNumber.trim(),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; resultMsg?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.resultMsg || "배송 상태 저장에 실패했습니다.");
      }

      setSaveState({ status: "saved", message: "배송 상태를 저장했습니다." });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "배송 상태 저장에 실패했습니다.",
      });
    }
  }

  return (
    <div className="grid min-w-60 gap-2">
      <select
        value={deliveryStatus}
        onChange={(event) => setDeliveryStatus(event.target.value as DeliveryStatus)}
        className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-normal text-slate-900"
      >
        {deliveryStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {invoiceNeeded ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={carrierCode}
            onChange={(event) => setCarrierCode(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-normal text-slate-900"
            placeholder="택배사 코드"
          />
          <input
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-normal text-slate-900"
            placeholder="송장번호"
          />
        </div>
      ) : null}
      <button
        type="button"
        onClick={saveDeliveryStatus}
        disabled={saveState.status === "saving"}
        className="rounded-md bg-slate-950 px-3 py-2 text-xs font-normal text-white disabled:opacity-50"
      >
        {saveState.status === "saving" ? "저장 중" : "상태 저장"}
      </button>
      {saveState.message ? (
        <p className={`text-[11px] font-normal ${saveState.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{saveState.message}</p>
      ) : null}
    </div>
  );
}
