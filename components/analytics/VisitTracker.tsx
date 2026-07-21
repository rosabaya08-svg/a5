"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";
import type { VisitorAnalyticsChannel } from "@/lib/analytics/visitorAnalytics";

type VisitTrackerProps = {
  channel: VisitorAnalyticsChannel;
  sourceApp?: "a5" | "a5s";
};

const visitorKey = "a5.analytics.visitor.v1";
const sessionKey = "a5.analytics.session.v1";
const sessionTtlMs = 30 * 60 * 1000;
const pageThrottleMs = 5 * 60 * 1000;

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readVisitorId() {
  const storage = safeLocalStorage();
  if (!storage) return createId("visitor");

  const existing = storage.getItem(visitorKey);
  if (existing) return existing;

  const next = createId("visitor");
  storage.setItem(visitorKey, next);
  return next;
}

function readSessionState() {
  const storage = safeLocalStorage();
  const now = Date.now();

  if (!storage) {
    return { sessionId: createId("session"), isNewSession: true };
  }

  const raw = storage.getItem(sessionKey);
  const parsed = raw ? safeParseSession(raw) : null;

  if (parsed && parsed.expiresAt > now) {
    const extended = { ...parsed, expiresAt: now + sessionTtlMs };
    storage.setItem(sessionKey, JSON.stringify(extended));
    return { sessionId: parsed.sessionId, isNewSession: false };
  }

  const next = { sessionId: createId("session"), expiresAt: now + sessionTtlMs };
  storage.setItem(sessionKey, JSON.stringify(next));
  return { sessionId: next.sessionId, isNewSession: true };
}

function safeParseSession(value: string) {
  try {
    const parsed = JSON.parse(value) as { sessionId?: unknown; expiresAt?: unknown };
    if (typeof parsed.sessionId === "string" && typeof parsed.expiresAt === "number") {
      return { sessionId: parsed.sessionId, expiresAt: parsed.expiresAt };
    }
  } catch {
    return null;
  }

  return null;
}

function shouldRecordPage(channel: VisitorAnalyticsChannel, path: string) {
  const storage = safeSessionStorage();
  if (!storage) return true;

  const key = `a5.analytics.page.${channel}.${path}`;
  const now = Date.now();
  const last = Number(storage.getItem(key) ?? "0");

  if (Number.isFinite(last) && now - last < pageThrottleMs) {
    return false;
  }

  storage.setItem(key, String(now));
  return true;
}

function postVisit(endpoint: string, body: Record<string, unknown>) {
  const payload = JSON.stringify(body);

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    credentials: "omit",
    keepalive: true,
  }).catch(() => undefined);
}

function VisitTrackerInner({ channel, sourceApp = "a5" }: VisitTrackerProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const path = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const endpoint = getPaymentFunctionUrl("analyticsRecordVisit");
    if (!endpoint || !shouldRecordPage(channel, path)) return;

    const { sessionId, isNewSession } = readSessionState();
    postVisit(endpoint, {
      channel,
      sourceApp,
      path,
      referrer: document.referrer,
      visitorId: readVisitorId(),
      sessionId,
      isNewSession,
    });
  }, [channel, path, sourceApp]);

  return null;
}

export function VisitTracker(props: VisitTrackerProps) {
  return (
    <Suspense fallback={null}>
      <VisitTrackerInner {...props} />
    </Suspense>
  );
}
