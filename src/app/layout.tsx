import type { Metadata } from "next";
import localFont from "next/font/local";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CompanionBench — AI Companion Research Platform",
  description: "Internal research operations platform for evaluating AI companion applications and automating proof-of-concept interactions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Sidebar />
        <main className="ml-64 min-h-screen">
          <div className="mx-auto max-w-7xl px-6 py-8">
            {children}
          </div>
        </main>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
