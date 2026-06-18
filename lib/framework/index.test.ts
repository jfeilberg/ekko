import { describe, it, expect } from 'vitest';
import { defineAgent, defineConnection, defineSandbox } from 'ekko';

describe('framework define helpers', () => {
  it('defineAgent returns its config unchanged', () => {
    const cfg = { persona: { name: 'X' } as never, model: 'm', maxSteps: 5 };
    expect(defineAgent(cfg)).toBe(cfg);
  });
  it('defineConnection returns its config unchanged', () => {
    const c = { type: 'mcp', url: 'https://x' } as const;
    expect(defineConnection(c)).toBe(c);
  });
  it('defineSandbox returns its config unchanged', () => {
    const s = { runtime: 'node22', setup: [] } as const;
    expect(defineSandbox(s)).toBe(s);
  });
});
