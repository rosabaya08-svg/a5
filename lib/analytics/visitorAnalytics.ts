import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";

export type VisitorAnalyticsChannel = "closed_mall_tablet" | "closed_mall_mobile" | "a5s_web" | "a5s_app";

export type VisitorAnalyticsTotals = {
  pageViews: number;
  visits: number;
  uniqueVisitors: number;
};

export type VisitorAnalyticsChannelTotal = VisitorAnalyticsTotals & {
  channel: VisitorAnalyticsChannel;
};

export type VisitorAnalyticsDailyRow = VisitorAnalyticsChannelTotal & {
  id: string;
  dateKey: string;
  sourceApp: string;
};

export type VisitorAnalyticsTopPage = {
  id: string;
  dateKey: string;
  channel: VisitorAnalyticsChannel;
  path: string;
  pageViews: number;
  uniqueVisitors: number;
};

export type VisitorAnalyticsRecentEvent = {
  id: string;
  dateKey: string;
  channel: VisitorAnalyticsChannel;
  path: string;
  referrerOrigin: string;
  createdAt?: string;
};

export type VisitorAnalyticsSummary = {
  days: number;
  totals: VisitorAnalyticsTotals;
  channels: VisitorAnalyticsChannelTotal[];
  daily: VisitorAnalyticsDailyRow[];
  topPages: VisitorAnalyticsTopPage[];
  recentEvents: VisitorAnalyticsRecentEvent[];
  source: string;
  error?: string;
};

export const visitorAnalyticsChannels: VisitorAnalyticsChannel[] = [
  "closed_mall_tablet",
  "closed_mall_mobile",
  "a5s_web",
  "a5s_app",
];

export const visitorAnalyticsChannelLabels: Record<VisitorAnalyticsChannel, string> = {
  closed_mall_tablet: "폐쇄몰",
  closed_mall_mobile: "모바일 둘러보기",
  a5s_web: "A5S 웹몰",
  a5s_app: "A5S 앱몰",
};

const emptyTotals: VisitorAnalyticsTotals = {
  pageViews: 0,
  visits: 0,
  uniqueVisitors: 0,
};

function emptyVisitorAnalyticsSummary(days: number, error?: string): VisitorAnalyticsSummary {
  return {
    days,
    totals: { ...emptyTotals },
    channels: visitorAnalyticsChannels.map((channel) => ({ channel, ...emptyTotals })),
    daily: [],
    topPages: [],
    recentEvents: [],
    source: "not_configured",
    error,
  };
}

function isChannel(value: unknown): value is VisitorAnalyticsChannel {
  return visitorAnalyticsChannels.includes(value as VisitorAnalyticsChannel);
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeChannelTotal(value: unknown): VisitorAnalyticsChannelTotal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const channel = record.channel;
  if (!isChannel(channel)) return null;

  return {
    channel,
    pageViews: numberValue(record.pageViews),
    visits: numberValue(record.visits),
    uniqueVisitors: numberValue(record.uniqueVisitors),
  };
}

function normalizeDailyRow(value: unknown): VisitorAnalyticsDailyRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const channel = record.channel;
  if (!isChannel(channel)) return null;

  return {
    id: text(record.id, `${text(record.dateKey)}-${channel}`),
    dateKey: text(record.dateKey),
    sourceApp: text(record.sourceApp),
    channel,
    pageViews: numberValue(record.pageViews),
    visits: numberValue(record.visits),
    uniqueVisitors: numberValue(record.uniqueVisitors),
  };
}

function normalizeTopPage(value: unknown): VisitorAnalyticsTopPage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const channel = record.channel;
  if (!isChannel(channel)) return null;

  return {
    id: text(record.id, `${text(record.dateKey)}-${channel}-${text(record.path, "/")}`),
    dateKey: text(record.dateKey),
    channel,
    path: text(record.path, "/"),
    pageViews: numberValue(record.pageViews),
    uniqueVisitors: numberValue(record.uniqueVisitors),
  };
}

function normalizeRecentEvent(value: unknown): VisitorAnalyticsRecentEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const channel = record.channel;
  if (!isChannel(channel)) return null;

  return {
    id: text(record.id),
    dateKey: text(record.dateKey),
    channel,
    path: text(record.path, "/"),
    referrerOrigin: text(record.referrerOrigin),
    createdAt: text(record.createdAt) || undefined,
  };
}

function mergeChannelDefaults(channels: VisitorAnalyticsChannelTotal[]) {
  const byChannel = new Map(channels.map((channel) => [channel.channel, channel]));
  return visitorAnalyticsChannels.map((channel) => byChannel.get(channel) ?? { channel, ...emptyTotals });
}

export async function readVisitorAnalyticsSummary(days = 14): Promise<VisitorAnalyticsSummary> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return emptyVisitorAnalyticsSummary(days, "Visitor analytics is skipped during production build.");
  }

  const endpoint = getPaymentFunctionUrl("analyticsSummary");
  const token = process.env.A5_COMMERCE_LIVE_READ_TOKEN?.trim() || "";

  if (!endpoint || !token) {
    return emptyVisitorAnalyticsSummary(days, "analyticsSummary endpoint or live-read token is missing.");
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ days }),
      cache: "no-store",
    });
    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok || payload.ok === false) {
      const error = payload.error && typeof payload.error === "object" ? (payload.error as { message?: string }).message : undefined;
      return emptyVisitorAnalyticsSummary(days, error ?? `analyticsSummary returned ${response.status}.`);
    }

    const channels = Array.isArray(payload.channels) ? payload.channels.map(normalizeChannelTotal).filter(Boolean) : [];
    const daily = Array.isArray(payload.daily) ? payload.daily.map(normalizeDailyRow).filter(Boolean) : [];
    const topPages = Array.isArray(payload.topPages) ? payload.topPages.map(normalizeTopPage).filter(Boolean) : [];
    const recentEvents = Array.isArray(payload.recentEvents) ? payload.recentEvents.map(normalizeRecentEvent).filter(Boolean) : [];

    return {
      days: numberValue(payload.days) || days,
      totals: {
        pageViews: numberValue((payload.totals as Record<string, unknown> | undefined)?.pageViews),
        visits: numberValue((payload.totals as Record<string, unknown> | undefined)?.visits),
        uniqueVisitors: numberValue((payload.totals as Record<string, unknown> | undefined)?.uniqueVisitors),
      },
      channels: mergeChannelDefaults(channels as VisitorAnalyticsChannelTotal[]),
      daily: daily as VisitorAnalyticsDailyRow[],
      topPages: topPages as VisitorAnalyticsTopPage[],
      recentEvents: recentEvents as VisitorAnalyticsRecentEvent[],
      source: text(payload.source, "analyticsSummary"),
    };
  } catch (error) {
    return emptyVisitorAnalyticsSummary(days, error instanceof Error ? error.message : "Unknown visitor analytics read error.");
  }
}
