// Set required env before importing the module under test — getSystemPrompt
// calls env() (cached, reads process.env) for the SYSTEM_PROMPT_OVERRIDE check.
process.env.SLACK_BOT_TOKEN ??= 'xoxb-test';
process.env.SLACK_SIGNING_SECRET ??= 'secret';
process.env.DATABASE_URL ??= 'postgresql://test';

import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from './system-prompt';

const CTX = {
  slackUserId: 'U1',
  teamId: 'T1',
  channelId: 'C1',
  currentDate: '2026-06-15',
  toolNames: [] as string[],
};

describe('getSystemPrompt instructions layer', () => {
  it('appends instructions inside the persona block', () => {
    const out = getSystemPrompt({
      slackUserId: 'U1', teamId: 'T1', channelId: 'C1',
      currentDate: '2026-06-17', toolNames: [], instructions: 'Always sign off as Bot.',
    });
    expect(out).toContain('Always sign off as Bot.');
    const personaOpen = out.indexOf('<persona>');
    const personaClose = out.indexOf('</persona>');
    const idx = out.indexOf('Always sign off as Bot.');
    expect(idx).toBeGreaterThan(personaOpen);
    expect(idx).toBeLessThan(personaClose);
  });
});

describe('getSystemPrompt', () => {
  it('instructs standard Markdown (the streaming render path), not legacy mrkdwn', () => {
    const p = getSystemPrompt(CTX);
    expect(p).toContain('standard Markdown');
    // Regression guard: the old rules told the model to use single-asterisk
    // bold and avoid **, which renders as italic on the markdown_text path.
    expect(p).not.toContain('Bold: *text* (single asterisks)');
  });

  it('forbids Markdown tables (Slack cannot render them)', () => {
    expect(getSystemPrompt(CTX)).toContain('Never use Markdown tables');
  });

  it('carries the anti-AI-slop voice rules', () => {
    const p = getSystemPrompt(CTX);
    expect(p).toContain('em dash');
    expect(p).toContain('Lead with the answer');
  });

  it('lists available tools when present and says none when empty', () => {
    expect(getSystemPrompt({ ...CTX, toolNames: ['gmail_send', 'linear_search'] }))
      .toContain('Available tools: gmail_send, linear_search.');
    expect(getSystemPrompt(CTX)).toContain('No external tools are available this turn.');
  });
});
