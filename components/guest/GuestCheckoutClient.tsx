"use client";

import { useState } from "react";
import { ServerCheckoutFlow } from "@/components/guest/ServerCheckoutFlow";
import { QrReceiverForm, initialQrReceiverFormValue, type QrReceiverFormValue } from "@/components/storefront/QrReceiverForm";
import type { QrPaymentSession } from "@/types/commerce";

export function GuestCheckoutClient({
  session,
  dataSource,
}: {
  session: QrPaymentSession;
  dataSource: string;
}) {
  const [receiver, setReceiver] = useState<QrReceiverFormValue>(() => initialQrReceiverFormValue(session));

  return (
    <>
      <QrReceiverForm session={session} onChange={setReceiver} />
      <ServerCheckoutFlow session={session} dataSource={dataSource} receiver={receiver} />
    </>
  );
}
