import type { AdminAccountInvite, AdminContentSlot } from "@/types/admin";

export const adminContentSlots: AdminContentSlot[] = [
  {
    id: "content-main-hero",
    title: "폐쇄몰 홈 메인 배너",
    placement: "home_hero",
    targetNurseryIds: ["nursery-gangnam-01"],
    targetRoomIds: [],
    linkUrl: "/tablet/products",
    startAt: "2026-05-25T00:00:00+09:00",
    endAt: "2026-06-30T23:59:59+09:00",
    status: "approved",
    reviewNote: "대표 이미지와 링크를 최고관리자가 검수하는 mock 슬롯",
  },
  {
    id: "content-video-care",
    title: "산모케어 영상 광고",
    placement: "home_video",
    ownerCompanyId: "company-sanho-care",
    targetNurseryIds: ["nursery-gangnam-01"],
    targetRoomIds: ["room-701", "room-702"],
    linkUrl: "/tablet/products/product-care-kit",
    startAt: "2026-05-25T00:00:00+09:00",
    endAt: "2026-06-10T23:59:59+09:00",
    status: "pending_approval",
    reviewNote: "Storage Blaze 전까지 영상 파일은 placeholder",
  },
];

export const adminAccountInvites: AdminAccountInvite[] = [
  {
    id: "invite-company-sanho-care",
    email: "company-admin@example.com",
    role: "COMPANY_ADMIN",
    companyId: "company-sanho-care",
    status: "claim_ready",
    passwordPolicy: "firebase_invite_only",
  },
  {
    id: "invite-nursery-gangnam",
    email: "nursery-admin@example.com",
    role: "NURSERY_ADMIN",
    nurseryId: "nursery-gangnam-01",
    status: "invited_mock",
    passwordPolicy: "firebase_invite_only",
  },
];
