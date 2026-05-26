import { mockProductOptions } from "@/data/mockProducts";
import type { ProductOptionRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

export const mockProductOptionRepository: ProductOptionRepository = {
  async listProductOptions(productId) {
    return repositoryOk(mockProductOptions.filter((option) => option.productId === productId));
  },

  async getProductOptionById(optionId) {
    const option = mockProductOptions.find((item) => item.id === optionId);

    if (!option) {
      return repositoryError("NOT_FOUND", "Product option not found", optionId);
    }

    return repositoryOk(option);
  },
};
