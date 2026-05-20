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
