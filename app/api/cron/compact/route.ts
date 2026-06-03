import { env } from '@/lib/env';
import { compactOldMessages } from '@/lib/memory/summarize';
import { log } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = env().CRON_SECRET;
  if (!secret) {
    return new Response('cron not configured', { status: 503 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 });
  }

  try {
    const result = await compactOldMessages();
    log.info({ result }, 'compact_done');
    return Response.json({ ok: true, ...result });
  } catch (err) {
    log.error({ err }, 'compact_failed');
    return new Response('compact failed', { status: 500 });
  }
}
