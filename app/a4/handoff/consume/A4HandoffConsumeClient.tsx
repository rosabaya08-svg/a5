"use client";

import { useEffect, useMemo, useState } from "react";
import { writePortalSession } from "@/lib/auth/session";

type A4HandoffConsumeClientProps = {
  handoffId: string;
  token: string;
  nextPath: string;
};

type A4HandoffConsumeResponse = {
  ok?: boolean;
  handoffId?: string;
  status?: string;
  nurseryId?: string;
  businessRegistrationNo?: string;
  targetUrl?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

const defaultFunctionsBaseUrl = "https://asia-northeast3-a5-closed-mall.cloudfunctions.net";

function getConsumeFunctionUrl() {
  const explicit = process.env.NEXT_PUBLIC_A5_HANDOFF_CONSUME_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  const base = (process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? defaultFunctionsBaseUrl).replace(/\/$/, "");
  return `${base}/a4HandoffConsume`;
}

function safeAppPath(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function A4HandoffConsumeClient({ handoffId, token, nextPath }: A4HandoffConsumeClientProps) {
  const [message, setMessage] = useState("A4 연동 정보를 확인하고 있습니다.");
  const [error, setError] = useState("");
  const targetPath = useMemo(() => safeAppPath(nextPath, "/nursery/dashboard"), [nextPath]);

  useEffect(() => {
    let cancelled = false;

    async function consume() {
      if (!handoffId || !token) {
        setError("A4 자동입장 토큰이 없습니다. A4에서 다시 조리원관리자 입장을 실행해 주세요.");
        return;
      }

      try {
        const url = new URL(getConsumeFunctionUrl());
        url.searchParams.set("handoffId", handoffId);
        url.searchParams.set("token", token);

        const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
        const data = (await response.json()) as A4HandoffConsumeResponse;

        if (cancelled) return;

        if (!response.ok || data.ok === false) {
          const detail = data.error?.message || data.error?.code || `HTTP ${response.status}`;
          throw new Error(detail);
        }

        const now = new Date().toISOString();
        const nurseryId = data.nurseryId || "a4-linked-nursery";
        const businessNo = data.businessRegistrationNo || nurseryId;

        writePortalSession("nursery", {
          role: "nursery",
          accountId: businessNo,
          businessNo,
          displayName: nurseryId,
          nurseryId,
          signedInAt: now,
          firstLoginCompletedAt: now,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          marketingConsentAt: now,
        });

        setMessage("조리원관리자 세션을 생성했습니다. 화면을 이동합니다.");
        window.location.replace(safeAppPath(data.targetUrl, targetPath));
      } catch (consumeError) {
        if (!cancelled) {
          setError(consumeError instanceof Error ? consumeError.message : "A4 자동입장 처리에 실패했습니다.");
        }
      }
    }

    void consume();

    return () => {
      cancelled = true;
    };
  }, [handoffId, targetPath, token]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <section className="w-full max-w-md rounded-md bg-white p-7 text-center text-slate-950 shadow-2xl">
        <p className="text-sm font-normal tracking-wide text-blue-600">A4에서 A5로 이동</p>
        <h1 className="mt-2 text-2xl font-normal">조리원관리자 자동입장</h1>
        <p className="mt-4 text-sm font-normal text-slate-600">{error || message}</p>
        {error ? (
          <a
            className="mt-6 inline-flex rounded-md bg-blue-600 px-5 py-3 text-sm font-normal text-white"
            href="/nursery/login"
          >
            로그인 화면으로 이동
          </a>
        ) : (
          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        )}
      </section>
    </main>
  );
}
