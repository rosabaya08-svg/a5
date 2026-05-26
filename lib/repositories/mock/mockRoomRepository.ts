import { mockRooms } from "@/data/mockRooms";
import type { RoomRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

export const mockRoomRepository: RoomRepository = {
  async listRooms(filters) {
    return repositoryOk(
      mockRooms.filter((room) => {
        if (filters?.nurseryId && room.nurseryId !== filters.nurseryId) return false;
        if (typeof filters?.pickupEnabled === "boolean" && room.pickupEnabled !== filters.pickupEnabled) return false;
        return true;
      }),
    );
  },

  async listRoomsByNursery(nurseryId) {
    return repositoryOk(mockRooms.filter((room) => room.nurseryId === nurseryId));
  },

  async getRoomById(roomId) {
    const room = mockRooms.find((item) => item.id === roomId);

    if (!room) {
      return repositoryError("NOT_FOUND", "Room not found", roomId);
    }

    return repositoryOk(room);
  },
};
