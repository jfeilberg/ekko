import type { NextConfig } from 'next';

const config: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: ['@slack/web-api', 'postgres', '@composio/core'],
};

export default config;
