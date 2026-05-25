export type QrSessionValidationInput = {
  qrSessionId: string;
  status?: "active" | "paid" | "expired" | "cancelled";
  expiresAt?: string;
};

export type QrSessionValidationResult =
  | { ok: true; qrSessionId: string; checkedAt: string }
  | { ok: false; code: string; message: string; checkedAt: string };

export function validateQrSession(input: QrSessionValidationInput): QrSessionValidationResult {
  const checkedAt = new Date().toISOString();

  if (!input.qrSessionId) {
    return { ok: false, code: "QR_SESSION_REQUIRED", message: "qrSessionId is required.", checkedAt };
  }

  if (input.status && input.status !== "active") {
    return {
      ok: false,
      code: "QR_SESSION_NOT_ACTIVE",
      message: `QR session is ${input.status}. Payment must be blocked.`,
      checkedAt,
    };
  }

  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
    return {
      ok: false,
      code: "QR_SESSION_EXPIRED",
      message: "QR session is expired. Create a new QR from tablet.",
      checkedAt,
    };
  }

  return { ok: true, qrSessionId: input.qrSessionId, checkedAt };
}
