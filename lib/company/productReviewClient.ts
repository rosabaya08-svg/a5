import { getFirebaseAuthClient } from "@/lib/firebase/client";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";

export type AdminProductReviewStatus = "approved" | "rejected" | "draft";

export type AdminProductReviewRequest = {
  draftId: string;
  status: AdminProductReviewStatus;
  reviewMemo?: string;
};

export type AdminProductReviewResponse = {
  ok?: boolean;
  productId?: string;
  draftId?: string;
  companyId?: string;
  status?: AdminProductReviewStatus;
  optionCount?: number;
  writtenCollections?: string[];
  error?: {
    code?: string;
    message?: string;
  };
};

export async function requestAdminProductReview(payload: AdminProductReviewRequest) {
  const endpoint = getPaymentFunctionUrl("adminProductReview");

  if (!endpoint) {
    throw new Error("Firebase Functions endpoint is not configured.");
  }

  const auth = getFirebaseAuthClient();
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : "";

  if (!token) {
    throw new Error("Firebase admin ID token is required.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as AdminProductReviewResponse | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error?.message || `Admin product review failed: ${response.status}`);
  }

  return data;
}
