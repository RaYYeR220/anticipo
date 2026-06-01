import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@anticipo/shared"],
  reactStrictMode: true,
  // @anticipo/shared is NodeNext TS source: its relative imports use ".js" specifiers
  // that resolve to ".ts" files. Teach webpack to try .ts/.tsx for a ".js" request so
  // the package can be consumed as source (no build step).
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    // Optional React-Native / node deps pulled transitively by wallet SDKs
    // (@metamask/sdk, walletconnect). Not used in the browser — stub them so webpack
    // doesn't emit "module not found" noise.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
