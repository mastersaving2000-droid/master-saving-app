import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 1. SETTING KHUSUS PWA AGAR FULL SCREEN (STANDALONE)
export const metadata: Metadata = {
  title: "Master Saving",
  description: "Platform Aset Digital",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  // INI KUNCI UTAMA UNTUK IPHONE (IOS)
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // Bar atas jadi transparan/hitam
    title: "Master Saving",
  },
};

// 2. SETTING VIEWPORT TERPISAH (Agar tidak bisa di-zoom cubit)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-[#050505] text-white overscroll-none`}>
        {children}
      </body>
    </html>
  );
}