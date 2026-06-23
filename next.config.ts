import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // R3F / WebGL: disable React StrictMode's dev-only double-mount. With it on, the
  // <Canvas> creates then disposes a WebGL context at startup ("Context Lost" churn)
  // which can tip a marginal GPU over. No effect in production. (ADR-0010 rebuild.)
  reactStrictMode: false,
};

export default nextConfig;
