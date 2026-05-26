import { mockTablets } from "@/data/mockTablets";
import type { TabletRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

export const mockTabletRepository: TabletRepository = {
  async listTablets(filters) {
    return repositoryOk(
      mockTablets.filter((tablet) => {
        if (filters?.nurseryId && tablet.nurseryId !== filters.nurseryId) return false;
        if (filters?.roomId && tablet.roomId !== filters.roomId) return false;
        if (filters?.status && tablet.status !== filters.status) return false;
        return true;
      }),
    );
  },

  async listTabletsByNursery(nurseryId) {
    return repositoryOk(mockTablets.filter((tablet) => tablet.nurseryId === nurseryId));
  },

  async getTabletById(tabletId) {
    const tablet = mockTablets.find((item) => item.id === tabletId);

    if (!tablet) {
      return repositoryError("NOT_FOUND", "Tablet not found", tabletId);
    }

    return repositoryOk(tablet);
  },
};
