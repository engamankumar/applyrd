import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/search',
        destination: '/dashboard/applications',
        permanent: true,
      },
    ]
  },
  output: "standalone",
};

export default nextConfig;
