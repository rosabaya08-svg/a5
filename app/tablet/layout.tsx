import type { ReactNode } from "react";
import type { Viewport } from "next";
import { connection } from "next/server";
import { TabletWebViewStability } from "@/components/tablet/TabletWebViewStability";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function TabletLayout({ children }: { children: ReactNode }) {
  await connection();

  return (
    <div className="a5-tablet-webview-root" data-a5-tablet-root>
      <TabletWebViewStability />
      {children}
    </div>
  );
}
