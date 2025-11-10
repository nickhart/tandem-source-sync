import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling serverless packages with binaries
  // This is critical for @sparticuz/chromium to work correctly
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
};

export default nextConfig;
