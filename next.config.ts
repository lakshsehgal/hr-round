import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  eslint: {
    // Next runs ESLint during `next build`. Don't block deploys on lint
    // findings — keep `npm run lint` for local feedback only.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
