import type { OrderItem } from "@/types/commerce";

export const PAYUP_PROVIDER = "payup";
export const PAYUP_PROVIDER_LABEL = "Payup PG";
export const A5_SALES_COMMISSION_RATE = 4.5;

export type PayupReconciliationStatus =
  | "payup_data_pending"
  | "matched"
  | "amount_mismatch"
  | "missing_payup_transaction";

export type PayupSalesCommissionBasis = "a5_order_items_payup_read_only";

export type A5SalesCommissionAmounts = {
  grossSalesAmount: number;
  a5CommissionRate: number;
  a5CommissionAmount: number;
};

export type PayupSalesCommissionPreview = A5SalesCommissionAmounts & {
  companyId: string;
  period: string;
  payupConfirmedAmount: number;
  payupDataLinked: boolean;
  reconciliationStatus: PayupReconciliationStatus;
  itemCount: number;
  basis: PayupSalesCommissionBasis;
  payupSettlementOwner: "payup";
  a5SettlementExecutionBlocked: true;
};

export type BuildPayupSalesCommissionPreviewInput = {
  companyId: string;
  orderItems: OrderItem[];
  period?: string;
  a5CommissionRate?: number;
  payupConfirmedAmount?: number;
};

export function currentSalesPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function calculateA5SalesCommission(
  grossSalesAmount: number,
  a5CommissionRate = A5_SALES_COMMISSION_RATE,
): A5SalesCommissionAmounts {
  return {
    grossSalesAmount,
    a5CommissionRate,
    a5CommissionAmount: Math.round(grossSalesAmount * (a5CommissionRate / 100)),
  };
}

export function resolvePayupReconciliationStatus(
  grossSalesAmount: number,
  payupConfirmedAmount?: number,
): PayupReconciliationStatus {
  if (payupConfirmedAmount === undefined) return "payup_data_pending";
  if (payupConfirmedAmount === grossSalesAmount) return "matched";
  if (grossSalesAmount > 0 && payupConfirmedAmount <= 0) return "missing_payup_transaction";
  return "amount_mismatch";
}

export function buildPayupSalesCommissionPreview({
  companyId,
  orderItems,
  period = currentSalesPeriod(),
  a5CommissionRate = A5_SALES_COMMISSION_RATE,
  payupConfirmedAmount,
}: BuildPayupSalesCommissionPreviewInput): PayupSalesCommissionPreview {
  const grossSalesAmount = orderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const commission = calculateA5SalesCommission(grossSalesAmount, a5CommissionRate);

  return {
    companyId,
    period,
    ...commission,
    payupConfirmedAmount: payupConfirmedAmount ?? 0,
    payupDataLinked: payupConfirmedAmount !== undefined,
    reconciliationStatus: resolvePayupReconciliationStatus(grossSalesAmount, payupConfirmedAmount),
    itemCount: orderItems.length,
    basis: "a5_order_items_payup_read_only",
    payupSettlementOwner: "payup",
    a5SettlementExecutionBlocked: true,
  };
}
