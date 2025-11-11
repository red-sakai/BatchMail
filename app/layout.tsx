import type { Metadata } from "next";
import Link from "next/link";
import NavbarClient from "./components/ui/NavbarClient";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BatchMail",
  description: "Automated emailer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="w-full bg-green-600 text-white">
          <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-lg font-semibold tracking-tight">BatchMail</Link>
              <span className="text-xs opacity-90">Automated Mailing</span>
            </div>
            <Suspense fallback={<div className="text-sm">Loading...</div>}>
              <NavbarClient />
            </Suspense>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
