import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // `motion@12` (and its `motion-dom` peer) reference Node's `process` global.
  // Without transpilation, Turbopack ships a polyfill chunk that the client
  // factory cannot always resolve, producing:
  //   "module factory is not available" from motion-dom/VisualElement.mjs
  // Listing them here makes Next compile them through its own runtime where
  // the polyfill is wired up correctly.
  transpilePackages: ["motion", "motion-dom", "framer-motion"],

  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
};

export default nextConfig;
