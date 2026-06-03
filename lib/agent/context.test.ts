import { describe, expect, it } from 'vitest';
import { assembleMessages, type Recall, type ThreadRow, type SummaryRow } from './context';

const userTurn: ThreadRow = { role: 'user', content: 'latest question', created_at: '2026-05-01T00:00:00Z' };
const assistantTurn: ThreadRow = { role: 'assistant', content: 'last answer', created_at: '2026-04-30T00:00:00Z' };
const summary: SummaryRow = { summary: 'earlier we discussed X', created_at: '2026-04-29T00:00:00Z' };
const recall: Recall = { content: 'in another thread we set the API key', similarity: 0.9 };

describe('assembleMessages', () => {
  it('orders summaries oldest first, then recent verbatim, then current user message', () => {
    const out = assembleMessages({
      summaries: [summary],
      thread: [assistantTurn, userTurn],
      recall: [recall],
      currentUserText: 'new question',
    });

    const roles = out.map((m) => m.role);
    expect(roles[0]).toBe('system'); // summaries injected as system
    expect(roles[1]).toBe('system'); // recall injected as system
    const lastMsg = out[out.length - 1];
    expect(lastMsg?.role).toBe('user');
    expect(lastMsg?.content).toBe('new question');
  });

  it('skips empty layers', () => {
    const out = assembleMessages({
      summaries: [],
      thread: [],
      recall: [],
      currentUserText: 'hi',
    });
    expect(out).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('drops the most recent user turn if it matches currentUserText', () => {
    const same: ThreadRow = { role: 'user', content: 'hi', created_at: '2026-05-01T00:00:00Z' };
    const out = assembleMessages({
      summaries: [], thread: [same], recall: [], currentUserText: 'hi',
    });
    expect(out.length).toBe(1);
    expect(out[0]).toEqual({ role: 'user', content: 'hi' });
  });
});
