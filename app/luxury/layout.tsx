import type { ReactNode } from "react";
import { connection } from "next/server";

export default async function LuxuryLayout({ children }: { children: ReactNode }) {
  await connection();

  return children;
}
