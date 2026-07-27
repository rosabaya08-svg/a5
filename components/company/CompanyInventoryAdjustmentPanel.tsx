"use client";

import { useMemo, useState } from "react";
import { ensureCompanyFirebaseAuthFromSession } from "@/lib/auth/companyFirebaseAuth";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";

type InventoryProduct = {
  id: string;
  name: string;
  stock: number;
};

type InventoryOption = {
  id: string;
  productId: string;
  name: string;
  stock: number;
};

export function CompanyInventoryAdjustmentPanel({
  products,
  options,
}: {
  products: InventoryProduct[];
  options: InventoryOption[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [optionId, setOptionId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const endpoint = useMemo(
    () => getPaymentFunctionUrl("companyOrderOperations"),
    [],
  );
  const productOptions = options.filter(
    (option) => option.productId === productId,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const adjustment = Number(delta);
    if (!productId || !Number.isInteger(adjustment) || adjustment === 0) {
      setMessage("증가 또는 차감할 재고 수량을 0이 아닌 정수로 입력하세요.");
      return;
    }
    if (!reason.trim()) {
      setMessage("재고 조정 사유를 입력하세요.");
      return;
    }
    if (!endpoint) {
      setMessage("기업 주문 서버 주소가 설정되지 않았습니다.");
      return;
    }

    setBusy(true);
    setMessage("재고를 조정하고 있습니다.");
    try {
      const user = await ensureCompanyFirebaseAuthFromSession();
      const token = await user?.getIdToken();
      if (!token) throw new Error("기업관리자 로그인이 필요합니다.");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "inventory_adjust",
          productId,
          optionId: optionId || undefined,
          delta: adjustment,
          reason: reason.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        before?: number;
        after?: number;
        error?: { message?: string };
      };
      if (!response.ok || payload.ok === false) {
        throw new Error(
          payload.error?.message || `재고 조정 실패 HTTP ${response.status}`,
        );
      }
      setMessage(`재고 조정 완료: ${payload.before ?? "-"} → ${payload.after ?? "-"}`);
      setDelta("");
      setReason("");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "재고 조정에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 grid gap-3 rounded-md border border-emerald-200 bg-white p-4 shadow-sm"
    >
      <div>
        <h2 className="text-lg text-slate-950">재고 수동 조정</h2>
        <p className="mt-1 text-sm text-slate-600">
          입고는 양수, 출고·차감은 음수로 입력합니다. 모든 변경은 감사로그에 기록됩니다.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={productId}
          onChange={(event) => {
            setProductId(event.target.value);
            setOptionId("");
          }}
          className="rounded-md border border-slate-200 px-3 py-2"
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} (현재 {product.stock})
            </option>
          ))}
        </select>
        <select
          value={optionId}
          onChange={(event) => setOptionId(event.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2"
        >
          <option value="">상품 전체 재고</option>
          {productOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} (현재 {option.stock})
            </option>
          ))}
        </select>
        <input
          value={delta}
          onChange={(event) =>
            setDelta(event.target.value.replace(/[^\d-]/g, ""))
          }
          inputMode="numeric"
          placeholder="예: 10 또는 -3"
          className="rounded-md border border-slate-200 px-3 py-2"
        />
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="재고 조정 사유"
          className="rounded-md border border-slate-200 px-3 py-2"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{message}</p>
        <button
          type="submit"
          disabled={busy || !products.length}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          재고 조정 적용
        </button>
      </div>
    </form>
  );
}
