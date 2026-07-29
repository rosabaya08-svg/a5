import { adminNavItems, type NavSection } from "@/components/layout/navigation";

export const payupAdminNavItems: NavSection[] = adminNavItems.map((section) => {
  if (section.title !== "PayUp 장바구니 PG") return section;
  const managed = new Set(["/admin/payup/access", "/admin/payup/distribution", "/admin/payup/devices"]);
  const original = section.items.filter((item) => !managed.has(item.href));
  return {
    ...section,
    items: [
      original[0],
      { href: "/admin/payup/access", label: "전체 액세스 관장", badge: "RBAC" },
      { href: "/admin/payup/devices", label: "태블릿 Firebase 등록", badge: "DEVICE" },
      { href: "/admin/payup/distribution", label: "상품 차액분배 정책", badge: "2인승인" },
      ...original.slice(1),
    ],
  };
});
