import type { ReactNode } from "react";
import { connection } from "next/server";

export default async function NurseryLayout({ children }: { children: ReactNode }) {
  await connection();

  return children;
}
