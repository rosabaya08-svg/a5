import type { PaymentServerError } from "../payments/types";

export type AmountAssertion =
  | { ok: true; amount: number }
  | { ok: false; error: PaymentServerError };

export function assertAmount(clientAmount: number | undefined, serverAmount: number): AmountAssertion {
  if (typeof clientAmount !== "number") {
    return {
      ok: false,
      error: {
        code: "CLIENT_AMOUNT_MISSING",
        message: "Client amount is missing. Server recalculation is required before payment confirm.",
        httpStatus: 400,
      },
    };
  }

  if (clientAmount !== serverAmount) {
    return {
      ok: false,
      error: {
        code: "AMOUNT_MISMATCH",
        message: "Client amount does not match server recalculated amount.",
        httpStatus: 409,
        details: { clientAmount, serverAmount },
      },
    };
  }

  return { ok: true, amount: serverAmount };
}
