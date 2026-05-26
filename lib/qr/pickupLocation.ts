import { tabletNurseryAccess } from "@/data/accessCredentials";
import { nurseryExternalMappings, nurseryRoomSelections } from "@/data/nursery/a4Mapping";
import type { QrPaymentSession, QrPickupLocation } from "@/types/commerce";

function roomNameFromId(roomId: string) {
  const roomNumber = roomId.match(/\d+/)?.[0];
  return roomNumber ? `${roomNumber}호` : roomId;
}

export function resolveQrPickupLocation(input: {
  nurseryId: string;
  roomId: string;
  nurseryName?: string;
  nurseryAddress?: string;
  roomName?: string;
}): QrPickupLocation | undefined {
  const exactMapping = nurseryExternalMappings.find((item) => item.nurseryId === input.nurseryId);
  const fallbackMapping = exactMapping ?? nurseryExternalMappings[0];
  const room = nurseryRoomSelections.find((item) => item.roomId === input.roomId);
  const nurseryAddress = input.nurseryAddress ?? exactMapping?.registeredAddress ?? fallbackMapping?.registeredAddress ?? "";
  const roomName = input.roomName ?? (room ? `${room.roomNumber}호` : roomNameFromId(input.roomId));

  if (!nurseryAddress || !roomName) return undefined;

  return {
    nurseryName: input.nurseryName ?? (input.nurseryId === tabletNurseryAccess.nurseryId ? tabletNurseryAccess.businessName : "산후조리원"),
    nurseryAddress,
    roomId: input.roomId,
    roomName,
  };
}

export function withResolvedQrPickupLocation(session: QrPaymentSession): QrPaymentSession {
  if (session.pickupLocation?.nurseryAddress && session.pickupLocation.roomName) return session;

  const pickupLocation = resolveQrPickupLocation({
    nurseryId: session.nurseryId,
    roomId: session.roomId,
    nurseryName: session.pickupLocation?.nurseryName,
    nurseryAddress: session.pickupLocation?.nurseryAddress,
    roomName: session.pickupLocation?.roomName,
  });

  return pickupLocation ? { ...session, pickupLocation } : session;
}
