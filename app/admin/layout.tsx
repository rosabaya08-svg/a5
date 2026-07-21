import type { ReactNode } from "react";
import { connection } from "next/server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await connection();

  return children;
}
