import crypto from "crypto";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

const masterAdminEmail = "rosabaya08@gmail.com";

const analyticsChannels = new Set([
  "closed_mall_tablet",
  "closed_mall_mobile",
  "a5s_web",
  "a5s_app",
]);

type VisitRecordInput = {
  channel?: string;
  sourceApp?: string;
  path?: string;
  referrer?: string;
  visitorId?: string;
  sessionId?: string;
  isNewSession?: boolean;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function bool(value: unknown) {
  return value === true || value === "true";
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function shortHash(value: string) {
  return hash(value).slice(0, 24);
}

function requestHeader(request: HttpRequestLike, name: string) {
  return request.get?.(name) ?? request.get?.(name.toLowerCase()) ?? "";
}

function requestIp(request: HttpRequestLike) {
  const forwarded = requestHeader(request, "x-forwarded-for").split(",")[0]?.trim();
  return forwarded || (request as { ip?: string }).ip || "";
}

function normalizeChannel(value: unknown) {
  const channel = text(value, "closed_mall_tablet");
  return analyticsChannels.has(channel) ? channel : "closed_mall_tablet";
}

function normalizeSourceApp(value: unknown, channel: string) {
  const sourceApp = text(value);
  if (sourceApp) return sourceApp.slice(0, 40);
  return channel.startsWith("a5s") ? "a5s" : "a5";
}

function normalizePath(value: unknown) {
  const path = text(value, "/");
  if (!path.startsWith("/")) return "/";
  return path.split("?")[0]?.slice(0, 240) || "/";
}

function normalizeReferrer(value: unknown) {
  const referrer = text(value);
  if (!referrer) return "";

  try {
    const parsed = new URL(referrer);
    return parsed.origin;
  } catch {
    return "";
  }
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function authorizationToken(request: HttpRequestLike) {
  const header = requestHeader(request, "authorization");
  return header.replace(/^Bearer\s+/i, "").trim();
}

async function authorizeAnalyticsRead(request: HttpRequestLike) {
  const token = authorizationToken(request);
  const serverToken = process.env.A5_COMMERCE_LIVE_READ_TOKEN?.trim() || "";

  if (serverToken && token === serverToken) {
    return { ok: true as const };
  }

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      code: "ANALYTICS_AUTH_REQUIRED",
      message: "A server live-read token or Firebase ID token is required.",
    };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const allowed =
      role === "SUPER_ADMIN" ||
      role === "seed_admin" ||
      decoded.seed_admin === true ||
      email === masterAdminEmail;

    if (allowed) return { ok: true as const };
  } catch {
    // Return generic denial below.
  }

  return {
    ok: false as const,
    status: 403,
    code: "ANALYTICS_FORBIDDEN",
    message: "The supplied token cannot read analytics data.",
  };
}

export async function analyticsRecordVisitHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use POST for analytics visits.", httpStatus: 405 },
    });
    return;
  }

  const body = readObjectBody<VisitRecordInput>(request);
  const now = new Date();
  const today = dateKey(now);
  const channel = normalizeChannel(body.channel);
  const sourceApp = normalizeSourceApp(body.sourceApp, channel);
  const path = normalizePath(body.path);
  const referrerOrigin = normalizeReferrer(body.referrer);
  const userAgent = requestHeader(request, "user-agent");
  const visitorSeed = text(body.visitorId) || `${requestIp(request)}:${userAgent}:${today}`;
  const sessionSeed = text(body.sessionId) || visitorSeed;
  const visitorKeyHash = hash(`${channel}:${visitorSeed}`);
  const sessionKeyHash = hash(`${channel}:${sessionSeed}`);
  const routeKey = shortHash(`${channel}:${path}`);
  const isNewSession = bool(body.isNewSession);
  const db = getAdminDb();
  const eventRef = db.collection("visitor_events").doc();
  const dailyRef = db.collection("visitor_daily_stats").doc(`${today}_${channel}`);
  const routeRef = db.collection("visitor_route_daily_stats").doc(`${today}_${channel}_${routeKey}`);
  const uniqueRef = db.collection("visitor_daily_uniques").doc(`${today}_${channel}_${visitorKeyHash.slice(0, 32)}`);
  const routeUniqueRef = db.collection("visitor_route_daily_uniques").doc(`${today}_${channel}_${routeKey}_${visitorKeyHash.slice(0, 32)}`);

  await db.runTransaction(async (transaction) => {
    const [uniqueSnapshot, routeUniqueSnapshot] = await Promise.all([
      transaction.get(uniqueRef),
      transaction.get(routeUniqueRef),
    ]);
    const uniqueIncrement = uniqueSnapshot.exists ? 0 : 1;
    const routeUniqueIncrement = routeUniqueSnapshot.exists ? 0 : 1;

    transaction.set(eventRef, {
      id: eventRef.id,
      date_key: today,
      channel,
      source_app: sourceApp,
      path,
      referrer_origin: referrerOrigin,
      visitor_key_hash: visitorKeyHash,
      session_key_hash: sessionKeyHash,
      user_agent_hash: userAgent ? hash(userAgent) : "",
      ip_hash: requestIp(request) ? hash(requestIp(request)) : "",
      is_new_session: isNewSession,
      created_at_iso: now.toISOString(),
      created_at: FieldValue.serverTimestamp(),
      source: "a5_analytics_record_visit",
    });

    transaction.set(
      dailyRef,
      {
        id: dailyRef.id,
        date_key: today,
        channel,
        source_app: sourceApp,
        page_views: FieldValue.increment(1),
        visits: FieldValue.increment(isNewSession ? 1 : 0),
        unique_visitors: FieldValue.increment(uniqueIncrement),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(
      routeRef,
      {
        id: routeRef.id,
        date_key: today,
        channel,
        source_app: sourceApp,
        path,
        page_views: FieldValue.increment(1),
        unique_visitors: FieldValue.increment(routeUniqueIncrement),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (!uniqueSnapshot.exists) {
      transaction.set(uniqueRef, {
        id: uniqueRef.id,
        date_key: today,
        channel,
        visitor_key_hash: visitorKeyHash,
        created_at: FieldValue.serverTimestamp(),
      });
    }

    if (!routeUniqueSnapshot.exists) {
      transaction.set(routeUniqueRef, {
        id: routeUniqueRef.id,
        date_key: today,
        channel,
        path,
        visitor_key_hash: visitorKeyHash,
        created_at: FieldValue.serverTimestamp(),
      });
    }
  });

  sendJson(response, 200, {
    ok: true,
    eventId: eventRef.id,
    channel,
    path,
    source: "firebase_functions_analytics_record_visit",
  });
}

function numeric(data: DocumentData, key: string) {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function iso(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const timestamp = value as { seconds?: number; _seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
    if (typeof timestamp._seconds === "number") return new Date(timestamp._seconds * 1000).toISOString();
  }
  return undefined;
}

export async function analyticsSummaryHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST for analytics summary.", httpStatus: 405 },
    });
    return;
  }

  const authorized = await authorizeAnalyticsRead(request);
  if (!authorized.ok) {
    sendJson(response, authorized.status, {
      ok: false,
      error: { code: authorized.code, message: authorized.message, httpStatus: authorized.status },
    });
    return;
  }

  const body = readObjectBody<{ days?: number }>(request);
  const days = Math.max(1, Math.min(90, Number(body.days ?? request.query?.days ?? 14) || 14));
  const dailyLimit = Math.max(days * analyticsChannels.size, 40);
  const db = getAdminDb();
  const [dailySnapshot, routeSnapshot, recentSnapshot] = await Promise.all([
    db.collection("visitor_daily_stats").orderBy("date_key", "desc").limit(dailyLimit).get(),
    db.collection("visitor_route_daily_stats").orderBy("page_views", "desc").limit(30).get(),
    db.collection("visitor_events").orderBy("created_at", "desc").limit(30).get(),
  ]);

  const daily = dailySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      dateKey: text(data.date_key),
      channel: normalizeChannel(data.channel),
      sourceApp: text(data.source_app),
      pageViews: numeric(data, "page_views"),
      visits: numeric(data, "visits"),
      uniqueVisitors: numeric(data, "unique_visitors"),
    };
  });
  const channelTotals = new Map<string, { channel: string; pageViews: number; visits: number; uniqueVisitors: number }>();

  for (const row of daily) {
    const current = channelTotals.get(row.channel) ?? { channel: row.channel, pageViews: 0, visits: 0, uniqueVisitors: 0 };
    current.pageViews += row.pageViews;
    current.visits += row.visits;
    current.uniqueVisitors += row.uniqueVisitors;
    channelTotals.set(row.channel, current);
  }

  const topPages = routeSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      dateKey: text(data.date_key),
      channel: normalizeChannel(data.channel),
      path: text(data.path, "/"),
      pageViews: numeric(data, "page_views"),
      uniqueVisitors: numeric(data, "unique_visitors"),
    };
  });

  const recentEvents = recentSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      dateKey: text(data.date_key),
      channel: normalizeChannel(data.channel),
      path: text(data.path, "/"),
      referrerOrigin: text(data.referrer_origin),
      createdAt: iso(data.created_at) ?? text(data.created_at_iso),
    };
  });

  sendJson(response, 200, {
    ok: true,
    days,
    totals: {
      pageViews: daily.reduce((total, row) => total + row.pageViews, 0),
      visits: daily.reduce((total, row) => total + row.visits, 0),
      uniqueVisitors: daily.reduce((total, row) => total + row.uniqueVisitors, 0),
    },
    channels: [...channelTotals.values()],
    daily,
    topPages,
    recentEvents,
    source: "firebase_functions_analytics_summary",
  });
}
