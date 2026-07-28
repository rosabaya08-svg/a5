import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type DiagnosticSample = {
  id: string;
  fields: Record<string, unknown>;
};

const masterAdminEmail = "rosabaya08@gmail.com";
const defaultCollections = [
  "companies",
  "company_signup_requests",
  "company_pg_credentials",
  "products",
  "product_detail_pages",
  "product_options",
  "company_product_edit_requests",
  "company_brand_pages",
  "company_ad_assets",
  "marketing_banners",
  "marketing_videos",
  "home_sections",
  "tablet_home_configs",
  "mobile_home_configs",
  "orders",
  "order_items",
  "payments",
  "payment_intents",
  "payment_events",
  "payment_return_traces",
  "pg_payment_logs",
  "company_notifications",
  "guest_shop_sessions",
];

const allowedFields = [
  "id",
  "title",
  "name",
  "status",
  "approval_status",
  "product_approval_status",
  "company_approval_status",
  "company_id",
  "companyId",
  "product_id",
  "productId",
  "order_no",
  "orderNo",
  "payment_intent_id",
  "provider",
  "pg_provider",
  "source",
  "source_channel",
  "created_at",
  "updated_at",
  "reviewed_at",
  "approved_at",
];

export async function a5LinkageDiagnosticsHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use GET for A5 linkage diagnostics.",
        httpStatus: 405,
      },
    });
    return;
  }

  if (!(await requireSuperAdmin(request, response))) return;

  const limit = clampNumber(numberFromQuery(request.query?.limit), 5, 1, 20);
  const collections = requestedCollections(request.query?.collections);

  try {
    const db = getAdminDb();
    const summaries = await Promise.all(
      collections.map(async (collectionName) => {
        const [count, sample] = await Promise.all([
          countCollection(db, collectionName),
          readSample(db, collectionName, limit),
        ]);

        return {
          collection: collectionName,
          count,
          sampleCount: sample.length,
          statusSummary: summarizeStatus(sample),
          samples: sample,
        };
      }),
    );

    sendJson(response, 200, {
      ok: true,
      source: "firebase_functions",
      generatedAt: new Date().toISOString(),
      limit,
      collections: summaries,
      notes: [
        "Read-only diagnostic. No Firestore writes are performed.",
        "Secret credential values are redacted; only public linkage fields are returned.",
      ],
    });
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      error: {
        code: "A5_LINKAGE_DIAGNOSTICS_READ_FAILED",
        message: error instanceof Error ? error.message : "Unknown A5 linkage diagnostics read error.",
        httpStatus: 503,
      },
    });
  }
}

async function countCollection(db: FirebaseFirestore.Firestore, collectionName: string) {
  try {
    const snapshot = await db.collection(collectionName).count().get();
    return snapshot.data().count;
  } catch {
    const snapshot = await db.collection(collectionName).limit(1).get();
    return snapshot.empty ? 0 : null;
  }
}

async function readSample(db: FirebaseFirestore.Firestore, collectionName: string, limit: number): Promise<DiagnosticSample[]> {
  try {
    const snapshot = await db.collection(collectionName).orderBy("updated_at", "desc").limit(limit).get();
    return snapshot.docs.map((doc) => sampleDocument(collectionName, doc.id, doc.data()));
  } catch {
    const snapshot = await db.collection(collectionName).limit(limit).get();
    return snapshot.docs.map((doc) => sampleDocument(collectionName, doc.id, doc.data()));
  }
}

function sampleDocument(collectionName: string, id: string, data: FirebaseFirestore.DocumentData): DiagnosticSample {
  if (collectionName === "company_pg_credentials") {
    return {
      id,
      fields: {
        company_id: text(data.company_id ?? data.companyId),
        provider: text(data.pg_provider ?? data.provider),
        merchant_status: text(data.credential_status ?? data.payup_mid_status ?? data.merchantStatus),
        mid_present: Boolean(data.mid ?? data.payup_mid ?? data.merchant_id ?? data.merchantId),
        encrypted_secret_key_present: Boolean(data.encrypted_secret_key),
        updated_at: serializeDate(data.updated_at),
      },
    };
  }

  return {
    id,
    fields: Object.fromEntries(
      allowedFields
        .filter((field) => data[field] !== undefined)
        .map((field) => [field, serializeDate(data[field])]),
    ),
  };
}

function summarizeStatus(samples: DiagnosticSample[]) {
  return samples.reduce<Record<string, number>>((acc, sample) => {
    const fields = sample.fields;
    const status = text(fields.status ?? fields.approval_status ?? fields.product_approval_status) || "unknown";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
}

function requestedCollections(value: unknown) {
  const raw = Array.isArray(value) ? value.join(",") : String(value ?? "");
  const requested = raw.split(",").map((item) => item.trim()).filter(Boolean);
  if (requested.length === 0) return defaultCollections;
  const allowed = new Set(defaultCollections);
  return requested.filter((collectionName) => allowed.has(collectionName));
}

function numberFromQuery(value: unknown): number | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== "number") return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function serializeDate(value: unknown): unknown {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return value;
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<boolean> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "A5_LINKAGE_DIAGNOSTICS_AUTH_REQUIRED",
        message: "Firebase ID token is required.",
        httpStatus: 401,
      },
    });
    return false;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const allowed = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail;

    if (allowed) return true;
  } catch {
    // Generic denial below.
  }

  sendJson(response, 403, {
    ok: false,
    error: {
      code: "A5_LINKAGE_DIAGNOSTICS_FORBIDDEN",
      message: "SUPER_ADMIN permission is required.",
      httpStatus: 403,
    },
  });
  return false;
}
