import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  images: { qualities: [60, 75] },
  turbopack: {
    root: path.join(process.cwd()),
  },
};

export default nextConfig;
