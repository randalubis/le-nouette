import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // X-11: re-enable Next's image optimizer. The previous workaround was
  // unoptimized:true; we now match every Supabase Storage public URL via
  // remotePatterns and ask the optimizer for AVIF / WebP variants. Saves
  // significant bytes on the storefront grid for Indonesian 4G users.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
