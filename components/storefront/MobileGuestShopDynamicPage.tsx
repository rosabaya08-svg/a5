"use client";

import dynamic from "next/dynamic";
import { VisitTracker } from "@/components/analytics/VisitTracker";
import type { StorefrontContent } from "@/lib/repositories/types";
import type { Product } from "@/types/commerce";

type MobileGuestShopDynamicPageProps = {
  initialProducts?: Product[];
  initialContent?: StorefrontContent;
};

const MobileGuestShopPage = dynamic<MobileGuestShopDynamicPageProps>(
  () => import("@/components/storefront/LiveShopClient").then((mod) => mod.MobileGuestShopPage),
  {
    ssr: false,
    loading: () => (
      <main className="min-h-screen bg-white p-4 text-slate-950">
        <section className="mx-auto max-w-md rounded-md bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-normal">모바일 쇼핑몰 로딩 중</h1>
          <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
            브라우저에서 비회원 쇼핑 세션을 불러오는 중입니다.
          </p>
        </section>
      </main>
    ),
  },
);

export function MobileGuestShopDynamicPage(props: MobileGuestShopDynamicPageProps) {
  return (
    <>
      <VisitTracker channel="closed_mall_mobile" sourceApp="a5" />
      <MobileGuestShopPage {...props} />
    </>
  );
}
