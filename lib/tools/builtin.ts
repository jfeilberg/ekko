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

/** Runtime context the agent loop injects into every tool call. */
type RuntimeCtx = {
  slackUserId: string;
  teamId: string;
  channelId: string;
  threadTs: string;
  composioEntityId: string;
};

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

    upload_file_to_slack: withStatusLabel(
      tool({
        description:
          'Upload a text-based file (e.g. a generated HTML document, markdown, CSV, or code) ' +
          'to the current Slack thread so the user can view or download it. Use this to deliver ' +
          'artifacts you produce. The file is posted into the thread the user is talking in.',
        inputSchema: z.object({
          filename: z.string().describe('File name with extension, e.g. "deck.html" or "notes.md".'),
          content: z.string().describe('The full text content of the file.'),
          title: z.string().optional().describe('Optional display title for the file.'),
          comment: z.string().optional().describe('Optional message to post alongside the file.'),
        }),
        execute: async (
          {
            filename,
            content,
            title,
            comment,
          }: { filename: string; content: string; title?: string; comment?: string },
          opts: { experimental_context?: unknown } = {},
        ) => {
          const ctx = opts.experimental_context as RuntimeCtx | undefined;
          if (!ctx?.channelId) {
            return { ok: false, error: 'No channel context available to upload into.' };
          }
          const uploadArgs = {
            channel_id: ctx.channelId,
            filename,
            content,
            title: title ?? filename,
            ...(ctx.threadTs ? { thread_ts: ctx.threadTs } : {}),
            ...(comment ? { initial_comment: comment } : {}),
          } as Parameters<WebClient['filesUploadV2']>[0];
          const res = await slackClient().filesUploadV2(uploadArgs);
          return { ok: res.ok ?? true };
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as Tool,
      'Uploading file…',
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
