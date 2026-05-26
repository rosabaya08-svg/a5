import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A5 폐쇄몰",
  description: "산후조리원 태블릿 폐쇄몰입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
