import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_EXTERNAL_API_BASE_URL: process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL,
    NEXT_PUBLIC_FALLBACK_API_URL: process.env.NEXT_PUBLIC_FALLBACK_API_URL,
  },

  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
  // Prevent Next.js from inferring a wrong monorepo root which can break webpack-runtime chunks
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats
  outputFileTracingRoot: process.cwd(),
  
  // API configuration
  async rewrites() {
    return [
      // Proxy API calls to backend in development
      ...(process.env.NODE_ENV === 'development' ? [{
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:5000'}/:path*`,
      }] : []),
    ];
  },
};

export default nextConfig;
