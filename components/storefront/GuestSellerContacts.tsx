"use client";

import { useEffect, useMemo, useState } from "react";
import { getPaymentFunctionUrl } from "@/lib/payments/paymentEndpoints";

type SellerContact = {
  companyId?: string;
  companyName?: string;
  businessNo?: string;
  representativeName?: string;
  customerServicePhone?: string;
  publicEmail?: string;
  ecommerceLicenseNo?: string;
  returnAddress?: string;
  verified?: boolean;
};

type ContactsResponse = {
  ok?: boolean;
  contacts?: SellerContact[];
  error?: { message?: string };
};

export function GuestSellerContacts({
  orderNo,
  lookupToken,
  phoneLast4,
}: {
  orderNo: string;
  lookupToken?: string;
  phoneLast4?: string;
}) {
  const endpoint = useMemo(() => getPaymentFunctionUrl("guestOrderContactsRead"), []);
  const [contacts, setContacts] = useState<SellerContact[]>([]);
  const [message, setMessage] = useState("판매자 정보를 확인하는 중입니다.");

  useEffect(() => {
    if (!endpoint || (!lookupToken && !phoneLast4)) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNo, lookupToken, phoneLast4 }),
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as ContactsResponse;
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.error?.message || "판매자 정보를 불러오지 못했습니다.");
        }
        if (cancelled) return;
        const nextContacts = Array.isArray(payload.contacts) ? payload.contacts : [];
        setContacts(nextContacts);
        setMessage(nextContacts.length ? "" : "주문에 저장된 판매자 연락처가 없습니다. 입점사 관리자에게 확인해 주세요.");
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "판매자 정보를 불러오지 못했습니다.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endpoint, lookupToken, orderNo, phoneLast4]);

  return (
    <section className="rounded-md bg-white p-4 text-sm shadow-sm">
      <h2 className="text-lg font-normal">판매자 사업자 정보</h2>
      {contacts.length ? (
        <div className="mt-3 grid gap-3">
          {contacts.map((contact, index) => (
            <article key={`${contact.companyId || contact.businessNo || "seller"}-${index}`} className="rounded-md border border-slate-200 p-3 text-slate-700">
              <p className="font-normal text-slate-950">{contact.companyName || "업체명 확인 전"}</p>
              {contact.businessNo ? <p className="mt-1">사업자등록번호 {contact.businessNo}</p> : null}
              {contact.representativeName ? <p>대표자 {contact.representativeName}</p> : null}
              {contact.customerServicePhone ? <p>주문·배송 문의 {contact.customerServicePhone}</p> : null}
              {contact.publicEmail ? <p>이메일 {contact.publicEmail}</p> : null}
              {contact.ecommerceLicenseNo ? <p>통신판매업 신고번호 {contact.ecommerceLicenseNo}</p> : null}
              {contact.returnAddress ? <p>반품 주소 {contact.returnAddress}</p> : null}
              {!contact.verified ? <p className="mt-2 text-amber-700">일부 사업자 연락처는 확인 전입니다.</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-amber-800">{message}</p>
      )}
    </section>
  );
}
