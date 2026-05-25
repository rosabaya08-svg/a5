export type LiveShopCollection =
  | "carts"
  | "qr_payment_sessions"
  | "orders"
  | "order_items";

export type LiveShopSaveResult = {
  mode: "blocked" | "local";
  message: string;
};

export async function saveLiveShopDocument(
  collectionName: LiveShopCollection,
  id: string,
  data: Record<string, unknown>,
): Promise<LiveShopSaveResult> {
  void collectionName;
  void id;
  void data;

  return {
    mode: "blocked",
    message: "Firestore write blocked. Products read is the only enabled Firebase scope in this phase.",
  };
}
