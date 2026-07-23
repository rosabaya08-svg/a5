"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";

type ClaimItem = {
  id: string;
  productName?: string;
  optionName?: string;
  quantity?: number;
};

export function GuestClaimRequestForm({
  orderNo,
  items,
  lookupToken,
  phoneLast4,
}: {
  orderNo: string;
  items: ClaimItem[];
  lookupToken?: string;
  phoneLast4?: string;
}) {
  const endpoint = useMemo(() => getPaymentFunctionUrl("guestClaimSubmit"), []);
  const contextEndpoint = useMemo(() => getPaymentFunctionUrl("guestOrderContactsRead"), []);
  const [verifiedItems, setVerifiedItems] = useState<ClaimItem[]>([]);
  const [itemId, setItemId] = useState("");
  const [claimType, setClaimType] = useState("cancel");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!contextEndpoint || (!lookupToken && !phoneLast4)) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(contextEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNo, lookupToken, phoneLast4 }),
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          items?: ClaimItem[];
          error?: { message?: string };
        };
        if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || "주문 상품을 확인하지 못했습니다.");
        if (cancelled) return;
        const nextItems = Array.isArray(payload.items) ? payload.items.filter((item) => item.id) : [];
        setVerifiedItems(nextItems);
        setItemId((current) => current || nextItems[0]?.id || "");
      } catch (error) {
        if (!cancelled) {
          setFailed(true);
          setMessage(error instanceof Error ? error.message : "주문 상품을 확인하지 못했습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contextEndpoint, lookupToken, orderNo, phoneLast4]);

  const displayItems = verifiedItems.length ? verifiedItems : items.filter((item) => item.id);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!endpoint || !itemId || !reason.trim()) {
      setFailed(true);
      setMessage("상품과 사유를 확인해 주세요.");
      return;
    }
    setSubmitting(true);
    setFailed(false);
    setMessage("주문 소유권과 요청 수량을 확인하고 있습니다.");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo,
          itemId,
          claimType,
          quantity: Number(quantity),
          reason: reason.trim(),
          lookupToken: lookupToken || undefined,
          phoneLast4: lookupToken ? undefined : phoneLast4,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: { message?: string }; claimId?: string };
      if (!response.ok || payload.ok === false || payload.error) {
        throw new Error(payload.error?.message || payload.message || `접수 실패 HTTP ${response.status}`);
      }
      setMessage(`접수되었습니다. 접수번호 ${payload.claimId ?? "확인 중"}`);
      setReason("");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "클레임 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-red-200 bg-white p-4">
      <h2 className="text-lg text-slate-950">취소·반품·교환 접수</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm text-slate-700">
          상품
          <select value={itemId} onChange={(event) => setItemId(event.target.value)} className="min-h-12 rounded-md border border-slate-200 px-3">
            {displayItems.map((item) => <option key={item.id} value={item.id}>{item.productName || "상품명 확인 전"} {item.optionName ? `/ ${item.optionName}` : ""}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-[1fr_100px] gap-2">
          <label className="grid gap-1 text-sm text-slate-700">
            요청 종류
            <select value={claimType} onChange={(event) => setClaimType(event.target.value)} className="min-h-12 rounded-md border border-slate-200 px-3">
              <option value="cancel">주문 취소</option>
              <option value="return">반품</option>
              <option value="exchange">교환</option>
              <option value="defect">상품 이상</option>
              <option value="wrong_delivery">오배송</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            수량
            <input value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))} inputMode="numeric" className="min-h-12 rounded-md border border-slate-200 px-3" />
          </label>
        </div>
        <label className="grid gap-1 text-sm text-slate-700">
          요청 사유
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-28 rounded-md border border-slate-200 p-3" placeholder="취소, 반품 또는 교환 사유를 입력해 주세요." />
        </label>
        <button type="submit" disabled={submitting || !verifiedItems.length} className="min-h-12 rounded-md bg-red-600 px-4 text-white disabled:bg-slate-300">
          {submitting ? "접수 중" : "요청 접수"}
        </button>
      </div>
      {message ? <p className={`mt-3 rounded-md px-3 py-2 text-sm ${failed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{message}</p> : null}
    </form>
  );
}
