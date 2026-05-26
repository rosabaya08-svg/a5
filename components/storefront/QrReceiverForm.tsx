"use client";

import { useEffect, useMemo, useState } from "react";
import type { DeliveryMethod, QrPaymentSession } from "@/types/commerce";

export type QrReceiverFormValue = {
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  addressDetail: string;
  consent: boolean;
};

function pickupAvailable(session: QrPaymentSession) {
  return Boolean(session.pickupLocation?.nurseryAddress && session.pickupLocation?.roomName);
}

export function initialQrReceiverFormValue(session: QrPaymentSession): QrReceiverFormValue {
  const canPickup = pickupAvailable(session);

  return {
    customerName: "",
    customerPhone: "",
    deliveryMethod: canPickup ? "pickup" : "delivery",
    address: canPickup ? session.pickupLocation?.nurseryAddress ?? "" : "",
    addressDetail: canPickup ? session.pickupLocation?.roomName ?? "" : "",
    consent: false,
  };
}

export function isQrReceiverFormComplete(value: QrReceiverFormValue) {
  return Boolean(value.customerName.trim() && value.customerPhone.trim() && value.address.trim() && value.consent);
}

export function maskCustomerPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 7) return phone.trim() || "010-****-0000";

  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export function QrReceiverForm({
  session,
  onChange,
}: {
  session: QrPaymentSession;
  onChange?: (value: QrReceiverFormValue) => void;
}) {
  const canPickup = pickupAvailable(session);
  const initialValue = useMemo(() => initialQrReceiverFormValue(session), [session]);
  const [value, setValue] = useState<QrReceiverFormValue>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    onChange?.(value);
  }, [onChange, value]);

  function selectDeliveryMethod(deliveryMethod: DeliveryMethod) {
    if (deliveryMethod === "pickup" && canPickup) {
      setValue((current) => ({
        ...current,
        deliveryMethod: "pickup",
        address: session.pickupLocation?.nurseryAddress ?? "",
        addressDetail: session.pickupLocation?.roomName ?? "",
      }));
      return;
    }

    setValue((current) => ({
      ...current,
      deliveryMethod: "delivery",
      address: "",
      addressDetail: "",
    }));
  }

  const isPickup = value.deliveryMethod === "pickup";

  return (
    <section className="rounded-md bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black">결제자 정보</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => selectDeliveryMethod("pickup")}
          disabled={!canPickup}
          className={`rounded-md px-3 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
            isPickup ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-800"
          }`}
        >
          현장 받기
        </button>
        <button
          type="button"
          onClick={() => selectDeliveryMethod("delivery")}
          className={`rounded-md px-3 py-3 text-sm font-black transition ${!isPickup ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-800"}`}
        >
          원하는 곳으로 받기
        </button>
      </div>
      {!canPickup ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
          QR에 산후조리원 주소가 없어 현장 받기를 사용할 수 없습니다. 받을 주소를 직접 입력해 주세요.
        </p>
      ) : null}
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          고객성명
          <input
            value={value.customerName}
            onChange={(event) => setValue((current) => ({ ...current, customerName: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-3 text-base font-semibold text-slate-700"
            placeholder="고객 성명을 입력해 주세요"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          연락처
          <input
            value={value.customerPhone}
            onChange={(event) => setValue((current) => ({ ...current, customerPhone: event.target.value }))}
            className="rounded-md border border-slate-200 px-3 py-3 text-base font-semibold text-slate-700"
            inputMode="tel"
            placeholder="010-0000-0000"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          주소
          <input
            value={value.address}
            onChange={(event) => setValue((current) => ({ ...current, address: event.target.value }))}
            readOnly={isPickup}
            className="rounded-md border border-slate-200 px-3 py-3 text-base font-semibold text-slate-700 read-only:bg-slate-50"
            placeholder={isPickup ? "QR 산후조리원 주소 자동 입력" : "받을 주소를 입력해 주세요"}
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          상세주소 / 객실번호
          <input
            value={value.addressDetail}
            onChange={(event) => setValue((current) => ({ ...current, addressDetail: event.target.value }))}
            readOnly={isPickup}
            className="rounded-md border border-slate-200 px-3 py-3 text-base font-semibold text-slate-700 read-only:bg-slate-50"
            placeholder={isPickup ? "QR 객실번호 자동 입력" : "상세주소를 입력해 주세요"}
          />
        </label>
      </div>
      {isPickup && canPickup ? (
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-900">
          {session.pickupLocation?.nurseryName} / {session.pickupLocation?.roomName} 기준으로 현장 받기 주소가 자동 입력되었습니다.
        </p>
      ) : null}
      <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={value.consent}
          onChange={(event) => setValue((current) => ({ ...current, consent: event.target.checked }))}
          className="h-4 w-4"
        />
        주문 및 개인정보 처리 안내에 동의합니다.
      </label>
    </section>
  );
}
