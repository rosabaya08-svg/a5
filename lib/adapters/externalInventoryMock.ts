export type ExternalInventoryMockRequest = {
  externalProductCode: string;
  currentStock: number;
};

export type ExternalInventoryMockResult = {
  externalProductCode: string;
  provider: "external_luxury_inventory_mock";
  stock: number;
  syncedAt: string;
  message: string;
};

export function syncExternalInventoryMock(
  request: ExternalInventoryMockRequest,
): ExternalInventoryMockResult {
  return {
    externalProductCode: request.externalProductCode,
    provider: "external_luxury_inventory_mock",
    stock: Math.max(0, request.currentStock - 1),
    syncedAt: new Date("2026-05-19T16:45:00+09:00").toISOString(),
    message: "모의 재고 동기화만 처리됩니다. 외부 재고 API는 호출되지 않았습니다.",
  };
}

export function blockExternalInventoryProduction(reason: string) {
  return {
    blocked: true,
    reason,
    requiredBeforeProduction: [
      "official API specification",
      "test account",
      "rate limits",
      "error code table",
      "contract approval",
    ],
  };
}
