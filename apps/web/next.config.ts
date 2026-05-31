import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@anticipo/shared"],
  reactStrictMode: true,
};

export default nextConfig;
