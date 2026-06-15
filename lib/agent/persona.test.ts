import { describe, it, expect } from 'vitest';
import { getPersona, persona } from './persona';

describe('getPersona', () => {
  it('renders identity, voice, and the current date', () => {
    const out = getPersona({ slackUserId: 'U1', currentDate: '2026-06-14' });
    expect(out).toContain(persona.name);
    expect(out).toContain('Voice:');
    expect(out).toContain('Today is 2026-06-14');
  });

  it('includes traits and focus when present', () => {
    const out = getPersona({ slackUserId: 'U1', currentDate: '2026-06-14' });
    if (persona.traits.length) expect(out).toContain('Traits:');
    if (persona.focus.length) expect(out).toContain('Focus on:');
  });
});
