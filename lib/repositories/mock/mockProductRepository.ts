import { mockProducts, mockProductOptions } from "@/data/mockProducts";
import type { ProductRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

export const mockProductRepository: ProductRepository = {
  async listProducts(filters) {
    const products = mockProducts.filter((product) => {
      if (filters?.status && product.status !== filters.status) return false;
      if (filters?.category && product.category !== filters.category) return false;
      if (filters?.companyId && product.companyId !== filters.companyId) return false;
      return true;
    });

    return repositoryOk(products);
  },

  async listApprovedProducts(filters) {
    const products = mockProducts.filter((product) => {
      if (product.status !== "approved") return false;
      if (filters?.category && product.category !== filters.category) return false;
      if (filters?.companyId && product.companyId !== filters.companyId) return false;
      return true;
    });

    return repositoryOk(products);
  },

  async getProductById(productId) {
    const product = mockProducts.find((item) => item.id === productId);

    if (!product) {
      return repositoryError("NOT_FOUND", "Product not found", productId);
    }

    return repositoryOk(product);
  },

  async listProductOptions(productId) {
    const options = mockProductOptions.filter((option) => option.productId === productId);
    return repositoryOk(options);
  },

  async listCompanyProducts(companyId, filters) {
    const products = mockProducts.filter((product) => {
      if (product.companyId !== companyId) return false;
      if (filters?.status && product.status !== filters.status) return false;
      if (filters?.category && product.category !== filters.category) return false;
      return true;
    });

    return repositoryOk(products);
  },
};
