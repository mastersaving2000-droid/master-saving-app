import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Master Saving | Platform Aset Digital",
  description: "Gandakan aset Anda secara otomatis dengan sistem mining cerdas.",
  icons: {
    icon: "/favicon.ico", // Pastikan nanti kamu punya file favicon.ico di folder public
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-[#050505] text-white`}>
        {children}
      </body>
    </html>
  );
}