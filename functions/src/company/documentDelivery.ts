import { getAdminDb, getAdminStorage } from "../firebaseAdmin";

type CompanyDocumentInboxRecord = {
  company_id?: string;
  company_name?: string;
  document_type?: string;
  document_label?: string;
  product_id?: string | null;
  product_name?: string | null;
  file_name?: string;
  file_size?: number;
  content_type?: string;
  storage_path?: string;
  download_url?: string;
  gmail_recipient?: string;
};

type FirestoreCreateEvent = {
  params?: Record<string, string>;
  data?: {
    data(): Record<string, unknown>;
    ref: {
      set(data: Record<string, unknown>, options?: { merge: boolean }): Promise<unknown>;
    };
  };
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function mapRecord(data: Record<string, unknown>): CompanyDocumentInboxRecord {
  return {
    company_id: text(data.company_id),
    company_name: text(data.company_name),
    document_type: text(data.document_type),
    document_label: text(data.document_label),
    product_id: text(data.product_id) || null,
    product_name: text(data.product_name) || null,
    file_name: text(data.file_name),
    file_size: numberValue(data.file_size),
    content_type: text(data.content_type) || "application/octet-stream",
    storage_path: text(data.storage_path),
    download_url: text(data.download_url),
    gmail_recipient: text(data.gmail_recipient),
  };
}

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

async function updateDeliveryStatus(uploadId: string, patch: Record<string, unknown>) {
  const db = getAdminDb();
  await Promise.all([
    db.collection("a1_company_document_inbox").doc(uploadId).set(patch, { merge: true }),
    db.collection("company_documents").doc(uploadId).set(patch, { merge: true }),
    db.collection("gmail_delivery_queue").doc(uploadId).set(patch, { merge: true }),
  ]);
}

async function forwardToA1Webhook(uploadId: string, record: CompanyDocumentInboxRecord) {
  const webhookUrl = env("A1_DOCUMENT_WEBHOOK_URL");

  if (!webhookUrl) {
    await updateDeliveryStatus(uploadId, {
      a1_webhook_status: "not_configured",
      a1_inbox_status: "queued",
    });
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadId,
      companyId: record.company_id,
      companyName: record.company_name,
      documentType: record.document_type,
      documentLabel: record.document_label,
      productId: record.product_id,
      productName: record.product_name,
      fileName: record.file_name,
      fileSize: record.file_size,
      contentType: record.content_type,
      storagePath: record.storage_path,
      downloadUrl: record.download_url,
    }),
  });

  if (!response.ok) {
    throw new Error(`A1 webhook failed: ${response.status}`);
  }

  await updateDeliveryStatus(uploadId, {
    a1_webhook_status: "sent",
    a1_inbox_status: "received",
    a1_webhook_sent_at: new Date().toISOString(),
  });
}

async function gmailAccessToken() {
  const clientId = env("GMAIL_CLIENT_ID");
  const clientSecret = env("GMAIL_CLIENT_SECRET");
  const refreshToken = env("GMAIL_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    return "";
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Gmail token failed: ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  return payload.access_token ?? "";
}

function mimeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function downloadAttachment(record: CompanyDocumentInboxRecord) {
  if (!record.storage_path) {
    throw new Error("storage_path is missing.");
  }

  const bucket = getAdminStorage().bucket();
  const [buffer] = await bucket.file(record.storage_path).download();
  return buffer;
}

async function sendGmailAttachment(uploadId: string, record: CompanyDocumentInboxRecord) {
  const sendAs = env("GMAIL_SEND_AS");
  const fallbackRecipient = env("A1_DOCUMENT_GMAIL_TO") || "qsc0921@gmail.com";
  const recipient = record.gmail_recipient || fallbackRecipient;

  if (!sendAs || !recipient) {
    await updateDeliveryStatus(uploadId, {
      gmail_status: "not_configured",
      delivery_status: "not_configured",
    });
    return;
  }

  const token = await gmailAccessToken();

  if (!token) {
    await updateDeliveryStatus(uploadId, {
      gmail_status: "not_configured",
      delivery_status: "not_configured",
    });
    return;
  }

  const attachment = await downloadAttachment(record);
  const boundary = `a5_company_document_${Date.now()}`;
  const subject = `[A5 기업서류] ${record.company_name ?? record.company_id} - ${record.document_label}`;
  const body = [
    "A5 기업 어드민에서 새 파일이 업로드되었습니다.",
    "",
    `업로드 ID: ${uploadId}`,
    `기업: ${record.company_name ?? record.company_id}`,
    `문서: ${record.document_label} (${record.document_type})`,
    record.product_id ? `상품: ${record.product_name ?? record.product_id}` : "",
    `Storage: ${record.storage_path}`,
    `다운로드 URL: ${record.download_url}`,
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = [
    `From: ${sendAs}`,
    `To: ${recipient}`,
    `Subject: ${mimeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf8").toString("base64"),
    `--${boundary}`,
    `Content-Type: ${record.content_type}; name="${record.file_name ?? "company-document"}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${record.file_name ?? "company-document"}"`,
    "",
    attachment.toString("base64"),
    `--${boundary}--`,
  ].join("\r\n");

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(sendAs)}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64Url(raw) }),
  });

  if (!response.ok) {
    throw new Error(`Gmail send failed: ${response.status}`);
  }

  await updateDeliveryStatus(uploadId, {
    gmail_status: "sent",
    delivery_status: "sent",
    gmail_sent_at: new Date().toISOString(),
  });
}

export async function companyDocumentInboxCreatedHandler(event: FirestoreCreateEvent) {
  const uploadId = event.params?.uploadId ?? "";
  const snapshot = event.data;

  if (!uploadId || !snapshot) {
    return;
  }

  const record = mapRecord(snapshot.data());

  await snapshot.ref.set(
    {
      inbox_status: "processing",
      delivery_status: "processing",
      processed_at: new Date().toISOString(),
    },
    { merge: true },
  );

  const errors: string[] = [];

  try {
    await forwardToA1Webhook(uploadId, record);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "A1 webhook delivery failed.");
    await updateDeliveryStatus(uploadId, { a1_webhook_status: "failed" });
  }

  try {
    await sendGmailAttachment(uploadId, record);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Gmail delivery failed.");
    await updateDeliveryStatus(uploadId, {
      gmail_status: "failed",
      delivery_status: "failed",
    });
  }

  await snapshot.ref.set(
    {
      inbox_status: errors.length ? "delivery_check_needed" : "delivered",
      delivery_errors: errors,
      delivered_at: errors.length ? null : new Date().toISOString(),
    },
    { merge: true },
  );
}
