import type { InventoryRepository } from "@/lib/repositories/types";
import { repositoryError } from "@/lib/repositories/types";

export const firebaseInventoryRepository: InventoryRepository = {
  async getOptionStock(optionId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase inventory repository is a stub. Firebase SDK is not connected.", optionId);
  },

  async reserveStock(optionId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase inventory repository is a stub. Firebase SDK is not connected.", optionId);
  },

  async deductStock(optionId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase inventory repository is a stub. Firebase SDK is not connected.", optionId);
  },

  async restoreStock(optionId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase inventory repository is a stub. Firebase SDK is not connected.", optionId);
  },

  async appendInventoryMovement(movement) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase inventory repository is a stub. Firebase SDK is not connected.", movement.optionId);
  },
};
