import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // INI KUNCINYA: Mengubah web jadi statis tanpa server
  images: {
    unoptimized: true, // Wajib diaktifkan untuk web statis
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
