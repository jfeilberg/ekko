import type { Tool } from 'ai';

export type MergeInput = {
  composio: Record<string, Tool>;
  custom: Record<string, Tool>;
  mcp: Record<string, Tool>;
  builtin: Record<string, Tool>;
};

export function withStatusLabel<T extends Tool>(t: T, label: string): T {
  const target = t as unknown as { experimental_meta?: Record<string, unknown> };
  target.experimental_meta = { ...(target.experimental_meta ?? {}), slackStatusLabel: label };
  return t;
}

// Priority: builtin > custom > mcp > composio.
// Built-in Slack tools are part of the contract; custom is the forker's
// explicit intent; MCP tools are remote server tools; Composio is the broadest set.
export function mergeTools(input: MergeInput): Record<string, Tool> {
  return { ...input.composio, ...input.mcp, ...input.custom, ...input.builtin };
}

export function statusLabelFor(t: Tool): string {
  const meta = (t as unknown as { experimental_meta?: { slackStatusLabel?: string } }).experimental_meta;
  return meta?.slackStatusLabel ?? 'Working…';
}
