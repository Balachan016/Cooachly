import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB; test/answer file uploads need more room.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
