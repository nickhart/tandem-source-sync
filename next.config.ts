import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling serverless packages with binaries
  // @sparticuz/chromium-min uses remote tar file, so no bin files needed
  serverExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core'],
};

export default nextConfig;
