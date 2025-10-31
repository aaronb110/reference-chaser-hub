import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // ✅ Don’t fail builds on ESLint issues
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
