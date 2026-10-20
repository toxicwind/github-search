import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  distDir: '.next-clean', // Keep this to avoid conflicts
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // turbopack disabled: bun isolated node_modules breaks turbo resolution
  // Remove output: 'export' to allow Server Actions and API routes
};

export default nextConfig;
