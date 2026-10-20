import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  distDir: '.next-clean', // Keep this to avoid conflicts
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: resolve(projectRoot, "..", ".."),
  },
  // Remove output: 'export' to allow Server Actions and API routes
};

export default nextConfig;
