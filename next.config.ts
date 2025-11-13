import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling serverless packages with binaries
  // This is critical for @sparticuz/chromium to work correctly
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],

  // Force Vercel to include @sparticuz/chromium bin files
  experimental: {
    outputFileTracingIncludes: {
      '/api/**': [
        './node_modules/@sparticuz/chromium/bin/**/*',
      ],
    },
  },
};

export default nextConfig;
