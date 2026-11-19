import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Compute deploy assembles the app from Next's standalone build output.
  output: "standalone",
};

export default nextConfig;
