import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  // pdfkit loads its AFM font data from disk at runtime; keep it external and make sure Vercel ships the data dir.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: { "/founder/invoices/[id]/pdf": ["./node_modules/pdfkit/js/data/**/*"] },
  images: { qualities: [60, 75] },
  turbopack: {
    root: path.join(process.cwd()),
  },
};

export default nextConfig;
