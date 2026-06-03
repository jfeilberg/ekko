import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [{ path: '/api/cron/compact', schedule: '0 3 * * *' }],
  functions: {
    'app/api/webhooks/[platform]/route.ts': { maxDuration: 300 },
    'app/api/cron/compact/route.ts': { maxDuration: 800 },
  },
};
