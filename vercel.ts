import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [{ path: '/api/cron/compact', schedule: '0 3 * * *' }],
  functions: {
    'app/api/webhooks/[platform]/route.ts': { maxDuration: 300 },
    // Hobby plan caps function maxDuration at 300s. The compact cron sometimes
    // wants longer for very large workspaces but breaking the deploy for every
    // new free-tier user isn't the right trade-off — they can bump this after
    // upgrading their Vercel plan.
    'app/api/cron/compact/route.ts': { maxDuration: 300 },
  },
};
