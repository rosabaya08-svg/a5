import { RoleGuard } from "@/components/auth/RoleGuard";

export default function MockUiLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard role="admin">{children}</RoleGuard>;
}
