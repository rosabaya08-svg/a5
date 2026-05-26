import { nurseryExternalMappings, nurseryRoomSelections } from "@/data/nursery/a4Mapping";
import type { A4ReadOnlyRoom } from "@/types/nursery";

export const a4ReadOnlySourceProjectId = "signage-partner" as const;

export function listA4RoomsReadOnly(nurseryId: string): A4ReadOnlyRoom[] {
  const mapping = nurseryExternalMappings.find((item) => item.nurseryId === nurseryId);

  if (!mapping) {
    return [];
  }

  return nurseryRoomSelections.map((room) => ({
    ...room,
    nurseryId,
    externalNurseryId: mapping.externalNurseryId,
    sourceProjectId: a4ReadOnlySourceProjectId,
  }));
}
