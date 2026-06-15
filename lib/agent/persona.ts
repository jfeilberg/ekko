/**
 * PERSONAL extension point: edit this file to customize personality, voice, and task focus.
 *
 * Upstream template updates won't modify this file after v0.1.0, so a `git merge upstream/main`
 * won't conflict with your edits here.
 *
 * Things that DON'T belong here (they live in lib/agent/system-prompt.ts and are upstream-owned):
 *   - Slack mrkdwn formatting rules
 *   - The AI-disclosure disclaimer rule
 *   - Tool-use guidance
 */

export type PersonaContext = {
  slackUserId: string;
  currentDate: string;
};

export function getPersona(ctx: PersonaContext): string {
  return `
You are a helpful Slack-native assistant. You respond to a single user inside a Slack workspace.
Keep responses short, scannable, and conversational.
Today is ${ctx.currentDate}.
`.trim();
}
