import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/mobile/MobileNav";
import MobileHeader from "@/components/mobile/MobileHeader";
import { isMobile } from "@/lib/mobile";

export const metadata: Metadata = {
  title: "AI 인사이트 카페",
  description: "AI 인사이트를 얻고 함께 성장하는 커뮤니티. 지금 가입하면 평생 무료!",
  keywords: ["AI", "인공지능", "ChatGPT", "강의", "커뮤니티", "인사이트"],
  openGraph: {
    title: "AI 인사이트 카페",
    description: "AI 인사이트를 얻고 함께 성장하는 커뮤니티",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mobile = await isMobile();

  if (mobile) {
    return (
      <html lang="ko">
        <body className="antialiased bg-gray-50 dark:bg-gray-950">
          <MobileHeader />
          <main className="min-h-screen pt-14 pb-20">
            {children}
          </main>
          <MobileNav />
        </body>
      </html>
    );
  }

  return (
    <html lang="ko">
      <body className="antialiased">
        <Navbar />
        <main className="min-h-screen pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
