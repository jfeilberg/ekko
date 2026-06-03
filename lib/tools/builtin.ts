import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { WebClient } from '@slack/web-api';
import { env } from '../env';
import { withStatusLabel } from './registry';

let cachedClient: WebClient | undefined;
function slackClient(): WebClient {
  if (!cachedClient) cachedClient = new WebClient(env().SLACK_BOT_TOKEN);
  return cachedClient;
}

export function builtinTools(): Record<string, Tool> {
  const tools: Record<string, Tool> = {
    slack_get_thread: withStatusLabel(
      tool({
        description: 'Fetch the full reply history of a specific Slack thread.',
        inputSchema: z.object({
          channel: z.string(),
          thread_ts: z.string(),
        }),
        execute: async ({ channel, thread_ts }: { channel: string; thread_ts: string }) => {
          const res = await slackClient().conversations.replies({ channel, ts: thread_ts, limit: 100 });
          return { messages: res.messages ?? [] };
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as Tool,
      'Reading Slack thread…',
    ),
  };

  if (env().ALLOW_CROSS_CHANNEL_POST) {
    tools.slack_post_message_to_channel = withStatusLabel(
      tool({
        description: "Post a message to a Slack channel on the user's behalf. Use only with explicit user consent.",
        inputSchema: z.object({ channel: z.string(), text: z.string() }),
        execute: async ({ channel, text }: { channel: string; text: string }) => {
          const res = await slackClient().chat.postMessage({ channel, text });
          return { ok: res.ok, ts: res.ts };
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as Tool,
      'Posting to channel…',
    );
  }

  return tools;
}
