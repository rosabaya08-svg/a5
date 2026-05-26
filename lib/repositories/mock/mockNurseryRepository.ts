import { mockNurseries } from "@/data/mockNurseries";
import type { NurseryRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

export const mockNurseryRepository: NurseryRepository = {
  async listNurseries(filters) {
    return repositoryOk(
      mockNurseries.filter((nursery) => {
        if (filters?.status && nursery.status !== filters.status) return false;
        if (filters?.region && !nursery.region.includes(filters.region)) return false;
        return true;
      }),
    );
  },

  async getNurseryById(nurseryId) {
    const nursery = mockNurseries.find((item) => item.id === nurseryId);

    if (!nursery) {
      return repositoryError("NOT_FOUND", "Nursery not found", nurseryId);
    }

    return repositoryOk(nursery);
  },
};
