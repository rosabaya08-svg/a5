import type { CartItemSnapshot, Company, PgMerchantStatus } from "@/types/commerce";

export const COMPANY_GROUP_PURCHASE_MESSAGE = "업체별 공동구매로 기업별로 구매가 가능합니다.";

export type CompanyPaymentGroup<T extends CartItemSnapshot = CartItemSnapshot> = {
  id: string;
  companyId: string;
  companyName: string;
  merchantId?: string;
  merchantIdMasked: string;
  merchantStatus: PgMerchantStatus;
  paymentReady: boolean;
  items: T[];
  itemCount: number;
  quantity: number;
  totalAmount: number;
};

export function cartItemPaymentKey(item: Pick<CartItemSnapshot, "productId" | "optionName" | "companyId">) {
  return `${item.companyId}::${item.productId}::${item.optionName}`;
}

export function groupCartItemsByCompany<T extends CartItemSnapshot>(items: T[], companies: Company[]): CompanyPaymentGroup<T>[] {
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const groupMap = new Map<string, CompanyPaymentGroup<T>>();

  for (const item of items) {
    const company = companyMap.get(item.companyId);
    const profile = company?.pgProfile;
    const current = groupMap.get(item.companyId);
    const lineAmount = item.unitPrice * item.quantity;

    if (current) {
      current.items.push(item);
      current.itemCount += 1;
      current.quantity += item.quantity;
      current.totalAmount += lineAmount;
      continue;
    }

    groupMap.set(item.companyId, {
      id: item.companyId,
      companyId: item.companyId,
      companyName: company?.name ?? item.companyId,
      merchantId: profile?.merchantId,
      merchantIdMasked: profile?.merchantIdMasked ?? "MID 발급 대기",
      merchantStatus: profile?.merchantStatus ?? "not_applied",
      paymentReady: Boolean(profile?.merchantId && profile.merchantStatus === "active"),
      items: [item],
      itemCount: 1,
      quantity: item.quantity,
      totalAmount: lineAmount,
    });
  }

  return [...groupMap.values()];
}

export function removePaidItemsFromCart<T extends CartItemSnapshot>(cartItems: T[], paidItems: CartItemSnapshot[]): T[] {
  const paidQuantityByKey = new Map<string, number>();

  for (const item of paidItems) {
    const key = cartItemPaymentKey(item);
    paidQuantityByKey.set(key, (paidQuantityByKey.get(key) ?? 0) + item.quantity);
  }

  return cartItems.flatMap((item) => {
    const key = cartItemPaymentKey(item);
    const paidQuantity = paidQuantityByKey.get(key) ?? 0;

    if (paidQuantity <= 0) return [item];

    if (item.quantity > paidQuantity) {
      paidQuantityByKey.set(key, 0);
      return [{ ...item, quantity: item.quantity - paidQuantity }];
    }

    paidQuantityByKey.set(key, paidQuantity - item.quantity);
    return [];
  });
}
