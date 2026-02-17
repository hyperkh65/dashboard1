import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "AI 인사이트 허브 - AI 정보, 강의, 커뮤니티",
  description: "AI 시대를 선도하는 사람들을 위한 플랫폼. 최신 AI 인사이트, 실용적인 강의, 활발한 커뮤니티를 만나보세요.",
  keywords: ["AI", "인공지능", "ChatGPT", "강의", "커뮤니티", "인사이트"],
  openGraph: {
    title: "AI 인사이트 허브",
    description: "AI 시대를 선도하는 사람들을 위한 플랫폼",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
