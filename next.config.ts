import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Skip Next's image optimizer — Supabase already serves these well, and
    // sidesteps remotePatterns config quirks at our scale.
    unoptimized: true,
  },
};

export default nextConfig;
