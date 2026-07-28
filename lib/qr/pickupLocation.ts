import type { QrPaymentSession, QrPickupLocation } from "@/types/commerce";

function cleanText(value?: string) {
  return String(value ?? "").trim();
}

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
  const roomId = cleanText(input.roomId);
  const nurseryAddress = cleanText(input.nurseryAddress);
  const roomName = cleanText(input.roomName) || roomNameFromId(roomId);

  if (!nurseryAddress || !roomName) return undefined;

  return {
    nurseryName: cleanText(input.nurseryName) || "산후조리원",
    nurseryAddress,
    roomId,
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
