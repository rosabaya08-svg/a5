import type { CartItemSnapshot, Company, PgMerchantStatus } from "@/types/commerce";
import { resolvePaymentCompanyId } from "@/lib/payments/paymentCatalogOwners";

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

export function cartItemPaymentKey(item: Pick<CartItemSnapshot, "productId" | "optionId" | "optionName" | "companyId" | "sellerCompanyId">) {
  const companyId = resolvePaymentCompanyId(item.productId, item.sellerCompanyId ?? item.companyId);
  const optionKey = item.optionId?.trim() || `name:${item.optionName}`;
  return `${companyId}::${item.productId}::${optionKey}`;
}

export function groupCartItemsByCompany<T extends CartItemSnapshot>(items: T[], companies: Company[]): CompanyPaymentGroup<T>[] {
  const companyMap = new Map<string, Company>();
  for (const company of companies) {
    companyMap.set(company.id, company);
    const businessNo = normalizeBusinessNoValue(company.businessRegistrationNumberNormalized ?? company.businessRegistrationNumber);
    if (businessNo) companyMap.set(businessNo, company);
  }
  const groupMap = new Map<string, CompanyPaymentGroup<T>>();

  for (const item of items) {
    const itemCompanyId = resolvePaymentCompanyId(item.productId, item.sellerCompanyId ?? item.companyId);
    const itemBusinessNo = normalizeBusinessNoValue(item.sellerBusinessNoNormalized ?? item.sellerBusinessNo);
    const company = companyMap.get(itemCompanyId) ?? companyMap.get(itemBusinessNo ?? "");
    const companyId = company?.id ?? itemCompanyId;
    const profile = company?.pgProfile;
    const current = groupMap.get(companyId);
    const lineAmount = item.unitPrice * item.quantity;

    if (current) {
      current.items.push(item);
      current.itemCount += 1;
      current.quantity += item.quantity;
      current.totalAmount += lineAmount;
      continue;
    }

    groupMap.set(companyId, {
      id: companyId,
      companyId,
      companyName: company?.name ?? item.sellerCompanyName ?? companyId,
      merchantId: profile?.merchantId,
      merchantIdMasked: profile?.merchantIdMasked ?? "MID 발급 대기",
      merchantStatus: profile?.merchantStatus ?? "not_applied",
      paymentReady: Boolean(profile?.credentialReady && profile.vaultReady && profile.merchantStatus === "active"),
      items: [item],
      itemCount: 1,
      quantity: item.quantity,
      totalAmount: lineAmount,
    });
  }

  return [...groupMap.values()];
}

function normalizeBusinessNoValue(value: unknown): string | undefined {
  const text = String(value ?? "").replace(/[^0-9]/g, "");
  return text ? text : undefined;
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
