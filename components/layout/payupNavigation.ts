import { adminNavItems, type NavSection } from "@/components/layout/navigation";

export const payupAdminNavItems: NavSection[] = adminNavItems.map((section) => {
  if (section.title !== "PayUp 장바구니 PG") return section;
  if (section.items.some((item) => item.href === "/admin/payup/access")) return section;
  return {
    ...section,
    items: [
      section.items[0],
      { href: "/admin/payup/access", label: "전체 액세스 관장", badge: "RBAC" },
      ...section.items.slice(1),
    ],
  };
});
