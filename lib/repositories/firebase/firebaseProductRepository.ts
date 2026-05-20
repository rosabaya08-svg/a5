import type { ProductRepository } from "@/lib/repositories/types";
import { repositoryError } from "@/lib/repositories/types";

export const firebaseProductRepository: ProductRepository = {
  async listProducts() {
    return repositoryError("NOT_IMPLEMENTED", "Firebase product repository is a stub. Firebase SDK is not connected.");
  },

  async listApprovedProducts() {
    return repositoryError("NOT_IMPLEMENTED", "Firebase product repository is a stub. Firebase SDK is not connected.");
  },

  async getProductById(productId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase product repository is a stub. Firebase SDK is not connected.", productId);
  },

  async listProductOptions(productId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase product repository is a stub. Firebase SDK is not connected.", productId);
  },

  async listCompanyProducts(companyId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase product repository is a stub. Firebase SDK is not connected.", companyId);
  },
};
