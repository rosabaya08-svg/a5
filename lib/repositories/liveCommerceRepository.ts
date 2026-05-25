import { firebaseOrderRepository } from "@/lib/repositories/firebase/firebaseOrderRepository";
import { firebaseQrSessionRepository } from "@/lib/repositories/firebase/firebaseQrSessionRepository";
import { mockRepositories } from "@/lib/repositories/mock";
import { repositoryData, type OrderWithItems, type RepositoryResult } from "@/lib/repositories/types";
import type { QrPaymentSession } from "@/types/commerce";

export type LiveReadSource = "Firestore" | "mock fallback";

export type LiveRead<T> = {
  data: T;
  source: LiveReadSource;
  reason?: string;
};

function fallbackReason<T>(result: RepositoryResult<T>) {
  return result.ok ? undefined : result.error.message;
}

export async function getLiveQrSessionByShortCode(shortCode: string): Promise<LiveRead<QrPaymentSession>> {
  const firebaseResult = await firebaseQrSessionRepository.getQrSessionByShortCode(shortCode);

  if (firebaseResult.ok) {
    return {
      data: firebaseResult.data,
      source: "Firestore",
    };
  }

  return {
    data: repositoryData(await mockRepositories.qrSessions.getQrSessionByShortCode(shortCode)),
    source: "mock fallback",
    reason: fallbackReason(firebaseResult),
  };
}

export async function getLiveOrderByOrderNo(orderNo: string): Promise<LiveRead<OrderWithItems>> {
  const firebaseResult = await firebaseOrderRepository.getOrderByOrderNo(orderNo);

  if (firebaseResult.ok) {
    return {
      data: firebaseResult.data,
      source: "Firestore",
    };
  }

  return {
    data: repositoryData(await mockRepositories.orders.getOrderByOrderNo(orderNo)),
    source: "mock fallback",
    reason: fallbackReason(firebaseResult),
  };
}
