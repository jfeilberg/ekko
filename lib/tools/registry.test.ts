import { describe, expect, it } from 'vitest';
import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { mergeTools, statusLabelFor } from './registry';

function withLabel(t: Tool, label: string): Tool {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t as any).experimental_meta = { slackStatusLabel: label };
  return t;
}

const a = withLabel(
  tool({
    description: 'tool a',
    inputSchema: z.object({}),
    execute: async () => ({}),
  }),
  'Doing A…',
);

const b = tool({
  description: 'tool b',
  inputSchema: z.object({}),
  execute: async () => ({}),
});

describe('mergeTools', () => {
  it('merges composio, custom, and builtin in priority order', () => {
    const merged = mergeTools({
      composio: { a },
      mcp: {},
      custom: { b },
      builtin: {},
    });
    expect(Object.keys(merged).sort()).toEqual(['a', 'b']);
  });

  it('lets custom override composio on name collision', () => {
    const customA = tool({
      description: 'custom a',
      inputSchema: z.object({}),
      execute: async () => ({ from: 'custom' }),
    });
    const merged = mergeTools({
      composio: { a },
      mcp: {},
      custom: { a: customA },
      builtin: {},
    });
    expect(merged.a?.description).toBe('custom a');
  });

  it('lets builtin override custom on name collision', () => {
    const builtinA = tool({
      description: 'builtin a',
      inputSchema: z.object({}),
      execute: async () => ({}),
    });
    const merged = mergeTools({
      composio: { a },
      mcp: {},
      custom: { a },
      builtin: { a: builtinA },
    });
    expect(merged.a?.description).toBe('builtin a');
  });

  it('lets custom override mcp on name collision', () => {
    const mcpA = tool({
      description: 'mcp a',
      inputSchema: z.object({}),
      execute: async () => ({}),
    });
    const customA = tool({
      description: 'custom a',
      inputSchema: z.object({}),
      execute: async () => ({}),
    });
    const merged = mergeTools({
      composio: {},
      mcp: { a: mcpA },
      custom: { a: customA },
      builtin: {},
    });
    expect(merged.a?.description).toBe('custom a');
  });
});

describe('statusLabelFor', () => {
  it('reads slackStatusLabel from experimental_meta', () => {
    expect(statusLabelFor(a)).toBe('Doing A…');
  });
  it('falls back to a generic label', () => {
    expect(statusLabelFor(b)).toBe('Working…');
  });
});
