import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import Navbar from "@/components/Navbar";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const description =
  "Klasifikasi tingkat kematangan tomat menggunakan pengolahan citra dan MobileNetV2.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TomatoAI",
    template: "%s | TomatoAI",
  },
  description,
  applicationName: "TomatoAI",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "TomatoAI",
    title: "TomatoAI — Klasifikasi Tingkat Kematangan Tomat",
    description,
    images: [{ url: "/logo-tomatoai.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "TomatoAI — Klasifikasi Tingkat Kematangan Tomat",
    description,
    images: ["/logo-tomatoai.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#3F7D58",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-brand-bg text-brand-text">
        <Navbar />
        <main id="konten-utama" className="flex-1 scroll-mt-16">
          <MotionProvider>
            <PageTransition>{children}</PageTransition>
          </MotionProvider>
        </main>
        <Footer />
      </body>
    </html>
  );
}
