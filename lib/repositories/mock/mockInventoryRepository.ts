import { mockProductOptions, mockProducts } from "@/data/mockProducts";
import type { InventoryRepository, InventoryMovementType } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

function buildMovement(
  type: InventoryMovementType,
  optionId: string,
  quantity: number,
  reason: string,
  sourceId?: string,
) {
  const option = mockProductOptions.find((item) => item.id === optionId);
  const product = option ? mockProducts.find((item) => item.id === option.productId) : undefined;

  return {
    id: `mock-inventory-${type}-${optionId}-${sourceId ?? "manual"}`,
    productId: option?.productId,
    optionId,
    companyId: product?.companyId,
    type,
    quantity,
    reason,
    sourceId,
    createdAt: new Date().toISOString(),
    createdBy: "mock-repository",
  };
}

export const mockInventoryRepository: InventoryRepository = {
  async listInventoryMovements(filters) {
    const movements = mockProductOptions.map((option) => {
      const product = mockProducts.find((item) => item.id === option.productId);

      return {
        id: `mock-inventory-external-sync-${option.id}`,
        productId: option.productId,
        optionId: option.id,
        companyId: product?.companyId,
        type: "external_sync" as const,
        quantity: option.stock,
        reason: "mock company scoped inventory read",
        sourceId: product?.externalProductCode,
        createdAt: new Date("2026-05-20T09:00:00.000Z").toISOString(),
        createdBy: "mock-repository",
      };
    });

    return repositoryOk(
      movements.filter((movement) => {
        if (filters?.companyId && movement.companyId !== filters.companyId) return false;
        if (filters?.productId && movement.productId !== filters.productId) return false;
        if (filters?.optionId && movement.optionId !== filters.optionId) return false;
        return true;
      }),
    );
  },

  async getOptionStock(optionId) {
    const option = mockProductOptions.find((item) => item.id === optionId);

    if (!option) {
      return repositoryError("NOT_FOUND", "Product option not found", optionId);
    }

    return repositoryOk(option.stock);
  },

  async reserveStock(optionId, quantity, sourceId) {
    return repositoryOk(buildMovement("reserve", optionId, quantity, "mock reserve", sourceId));
  },

  async deductStock(optionId, quantity, orderId) {
    return repositoryOk(buildMovement("deduct", optionId, quantity, "mock deduct", orderId));
  },

  async restoreStock(optionId, quantity, reason) {
    return repositoryOk(buildMovement("restore", optionId, quantity, reason));
  },

  async appendInventoryMovement(movement) {
    return repositoryOk({
      id: `mock-inventory-${movement.type}-${movement.optionId}-${movement.createdAt}`,
      ...movement,
    });
  },
};
