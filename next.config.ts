import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloud IDE / remote dev environments
  allowedDevOrigins: ['10.198.87.127', 'localhost'],
  async redirects() {
    return [
      // the old "Sessions" page was always the event log
      { source: '/sessions', destination: '/events', permanent: true },
      // the 3D globe and its page were removed
      { source: '/map', destination: '/', permanent: false },
    ];
  },
};

export default nextConfig;
