import type { CartItemInput } from "../payments/types";

export type InventoryReleasePlan = {
  mode: "transaction_skeleton_only";
  released: false;
  items: CartItemInput[];
  transactionSteps: string[];
};

export function releaseInventorySkeleton(items: CartItemInput[]): InventoryReleasePlan {
  return {
    mode: "transaction_skeleton_only",
    released: false,
    items,
    transactionSteps: [
      "Find reserve/deduct inventory_movements for the payment intent.",
      "Append restore event for cancellation, failure, or QR expiry.",
      "Recalculate stock summary in the same transaction.",
      "Write audit log for every manual release.",
    ],
  };
}
