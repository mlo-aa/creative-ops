import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/compositor-win32-x64-msvc",
    "esbuild",
  ],
  async redirects() {
    return [
      {
        source: "/projects/:projectId/brand",
        destination: "/projects/:projectId/branding",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
