import { tool } from 'ai';
import { z } from 'zod';
import { withStatusLabel } from 'ekko';

/**
 * Example custom tool. Copy this file to agent/tools/<name>.ts and edit — the
 * file name becomes the model-facing tool name. Custom tools receive a runtime
 * context on the second arg's experimental_context:
 *   { slackUserId, teamId, channelId, threadTs, composioEntityId, thread }
 */
type RuntimeCtx = {
  slackUserId: string;
  teamId: string;
  channelId: string;
  threadTs: string;
  composioEntityId: string;
};

export default withStatusLabel(
  tool({
    description: 'Echo back the input — a reference tool to show the shape.',
    inputSchema: z.object({ text: z.string().describe('Text to echo back.') }),
    execute: async ({ text }, opts: { experimental_context?: unknown } = {}) => {
      const ctx = opts.experimental_context as RuntimeCtx | undefined;
      return { echo: text, slackUserId: ctx?.slackUserId ?? null };
    },
  }),
  'Running example…',
);
