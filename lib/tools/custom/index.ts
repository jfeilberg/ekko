import { echoExample } from './example';
import type { Tool } from 'ai';

/**
 * The headline extension point. Add your custom AI SDK tools here.
 * Each key becomes the tool name the LLM sees.
 *
 * Tools receive a runtime context object via the agent loop:
 *   { slackUserId, teamId, channelId, threadTs, composioEntityId }
 *
 * To add a tool:
 *   1. Create `./my-tool.ts` exporting a `tool({...})` value
 *   2. Import and add it to the object below
 *   3. (Optional) attach `experimental_meta.slackStatusLabel` for a friendly status indicator
 */
export const customTools: Record<string, Tool> = {
  echoExample,
};
