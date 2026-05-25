import type { CartItemInput } from "../payments/types";

export type InventoryReservationPlan = {
  mode: "transaction_skeleton_only";
  reserved: false;
  items: CartItemInput[];
  transactionSteps: string[];
};

export function reserveInventorySkeleton(items: CartItemInput[]): InventoryReservationPlan {
  return {
    mode: "transaction_skeleton_only",
    reserved: false,
    items,
    transactionSteps: [
      "Read product_options or products inventory inside a Firestore transaction.",
      "Reject if stock is lower than requested quantity.",
      "Append inventory_movements reserve/deduct event.",
      "Update stock summary only after payment confirm succeeds.",
    ],
  };
}
