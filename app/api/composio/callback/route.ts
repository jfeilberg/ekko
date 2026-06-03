import { log } from '@/lib/log';
import { WebClient } from '@slack/web-api';
import { env } from '@/lib/env';

let cachedSlack: WebClient | undefined;
function slack(): WebClient {
  if (!cachedSlack) cachedSlack = new WebClient(env().SLACK_BOT_TOKEN);
  return cachedSlack;
}

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const entityId = url.searchParams.get('entity_id');
  const toolkit = url.searchParams.get('toolkit');
  const status = url.searchParams.get('status') ?? 'success';

  log.info({ entityId, toolkit, status }, 'composio_callback');

  // Optional: DM the user to confirm. entity_id format `slack:{team}:{user}`.
  if (entityId?.startsWith('slack:') && status === 'success' && toolkit) {
    const parts = entityId.split(':');
    const userId = parts[2];
    if (userId) {
      try {
        const im = await slack().conversations.open({ users: userId });
        const channel = (im as { channel?: { id?: string } }).channel?.id;
        if (channel) {
          await slack().chat.postMessage({
            channel,
            text: `:white_check_mark: Connected ${toolkit}. Try your question again.`,
          });
        }
      } catch (err) {
        log.warn({ err }, 'composio_callback_dm_failed');
      }
    }
  }

  return new Response('Connected. You can close this window.', {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  });
}
