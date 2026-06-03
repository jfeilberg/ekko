import { tool } from 'ai';
import { z } from 'zod';
import { withStatusLabel } from '../registry';

/**
 * Example custom tool. Delete this file and add your own.
 *
 * Custom tools receive a runtime context object on the second arg's
 * `experimental_context` field, populated by the agent loop with:
 *   { slackUserId, teamId, channelId, threadTs, composioEntityId }
 */
type RuntimeCtx = {
  slackUserId: string;
  teamId: string;
  channelId: string;
  threadTs: string;
  composioEntityId: string;
};

export const echoExample = withStatusLabel(
  tool({
    description: 'Echo back the input — a reference tool to show the shape.',
    inputSchema: z.object({
      text: z.string().describe('Text to echo back.'),
    }),
    execute: async ({ text }, opts: { experimental_context?: unknown } = {}) => {
      const ctx = opts.experimental_context as RuntimeCtx | undefined;
      return { echo: text, slackUserId: ctx?.slackUserId ?? null };
    },
  }),
  'Echoing…',
);
