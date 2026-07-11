import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5001/uploads/:path*',
      },
      {
        source: '/api/videos/stream/:path*',
        destination: 'http://localhost:5001/api/videos/stream/:path*',
      },
    ]
  },
};

export default nextConfig;
