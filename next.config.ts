import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB; test/answer file uploads need more room.
      bodySizeLimit: "10mb",
    },
  },
  // pdf-parse (via pdf.js) resolves its worker script relative to its own
  // file on disk at runtime — bundling it into .next/server/chunks moves it
  // away from that path and breaks worker setup. Keeping it external (a
  // plain require from node_modules at runtime) avoids that.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
