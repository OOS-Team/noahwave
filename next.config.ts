import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Gallery files may include spaces / long names; use plain <img> for media
    unoptimized: true,
  },
};

export default nextConfig;
