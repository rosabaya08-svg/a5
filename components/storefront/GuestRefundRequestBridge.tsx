"use client";

import { useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";

type CancelResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

export function GuestRefundRequestBridge({
  orderNo,
  amount,
  children,
}: {
  orderNo: string;
  amount: number;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const endpoints = useMemo(() => getPaymentEndpointReadiness(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function submitRequest() {
    if (isSubmitting) return;
    const endpoint = endpoints.endpoints.cancel;
    const textarea = formRef.current?.querySelector("textarea");
    const reason = textarea instanceof HTMLTextAreaElement && textarea.value.trim()
      ? textarea.value.trim()
      : "Guest refund request";

    if (!endpoint) {
      setFailed(true);
      setMessage("Cancel endpoint is not configured.");
      return;
    }

    setIsSubmitting(true);
    setFailed(false);
    setMessage("Submitting refund request...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo,
          amount,
          reason,
          requestedBy: "CUSTOMER_GUEST",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as CancelResponse;
      const accepted = payload.ok !== false || payload.status === "manual_review_required";

      if (!response.ok || payload.error || !accepted) {
        throw new Error(payload.error?.message || payload.message || `Refund request failed. HTTP ${response.status}`);
      }

      setMessage(payload.message || "Refund request recorded for review.");
      if (textarea instanceof HTMLTextAreaElement) textarea.disabled = true;
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Refund request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitRequest();
  }

  function handleClick(event: MouseEvent<HTMLFormElement>) {
    const target = event.target instanceof HTMLElement ? event.target.closest("button") : null;
    if (!target) return;
    event.preventDefault();
    void submitRequest();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onClick={handleClick} aria-busy={isSubmitting}>
      {children}
      {message ? (
        <p className={`mt-3 rounded-md px-3 py-2 text-sm font-normal ${failed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
