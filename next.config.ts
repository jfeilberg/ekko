import type { NextConfig } from 'next';

const config: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: ['@slack/web-api', 'postgres', '@composio/core', '@vercel/sandbox'],
};

export default config;
