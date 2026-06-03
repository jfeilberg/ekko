export type SuggestedPromptCtx = {
  connectedToolkits: string[]; // toolkit slugs the user has already connected
};

const STATIC_FALLBACK = [
  'What can you do?',
  'Summarize my recent activity',
  'Help me draft a message',
];

const TOOLKIT_PROMPTS: Record<string, string> = {
  gmail: 'Summarize my unread emails',
  github: 'What pull requests need my review?',
  linear: 'What\'s on my Linear board this week?',
  calendar: 'What\'s on my calendar today?',
  gcal: 'What\'s on my calendar today?',
  notion: 'Find my latest meeting notes in Notion',
};

export function getSuggestedPrompts(ctx: SuggestedPromptCtx): { title: string; message: string }[] {
  const fromTools: string[] = [];
  for (const tk of ctx.connectedToolkits) {
    const p = TOOLKIT_PROMPTS[tk];
    if (p && !fromTools.includes(p)) fromTools.push(p);
  }
  const titles = fromTools.length ? fromTools.slice(0, 4) : STATIC_FALLBACK;
  return titles.map((t) => ({ title: t, message: t }));
}
