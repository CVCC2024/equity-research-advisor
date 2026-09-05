import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@anthropic-ai/sdk', 'groq-sdk'],
};

export default nextConfig;
