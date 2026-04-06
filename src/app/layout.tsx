import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/shared/providers/AuthProvider";
import { ProgressProvider } from "@/shared/providers/ProgressProvider";
import { AppShell } from "@/shared/components/AppShell";
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
  title: "TOEIC & Speak - 영어학습 플랫폼",
  description: "TOEIC 시험 준비 + AI 영어회화를 하나의 플랫폼에서",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "영어학습",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <AuthProvider>
          <ProgressProvider>
            <AppShell>{children}</AppShell>
          </ProgressProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
